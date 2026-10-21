"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Game } from "./game";

export interface RoomSnapshot {
  code: string;
  game: Game;
  playerId: string;
  expiresAt: number;
}

export type RoomStatus = "idle" | "connecting" | "open" | "closed";

interface Pending {
  resolve: () => void;
  reject: (error: Error) => void;
}

/**
 * One hibernatable WebSocket to the room's Durable Object.
 *
 * The connection is the only channel: the server broadcasts the table after
 * every action and answers each action with an acknowledgement, so the UI never
 * polls. A dropped connection retries with a short backoff and the state is
 * re-sent on reconnect.
 */
export function useRoomSocket({
  code,
  token,
  onState,
  onFatal,
}: {
  code: string | null;
  token: string | null;
  onState: (snapshot: RoomSnapshot) => void;
  onFatal: (message: string) => void;
}) {
  const [status, setStatus] = useState<RoomStatus>("idle");
  const socket = useRef<WebSocket | null>(null);
  const pending = useRef(new Map<string, Pending>());
  const handlers = useRef({ onState, onFatal });

  useEffect(() => {
    handlers.current = { onState, onFatal };
  }, [onState, onFatal]);

  useEffect(() => {
    if (!code || !token) return;
    let disposed = false;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let current: WebSocket | null = null;
    let beat: ReturnType<typeof setInterval> | undefined;
    let pong: ReturnType<typeof setTimeout> | undefined;
    let paused = document.hidden;

    const rejectAll = (error: Error) => {
      for (const [id, entry] of pending.current) {
        pending.current.delete(id);
        entry.reject(error);
      }
    };

    // A phone that is backgrounded can lose its socket without a close event.
    // Any traffic proves the link is alive; silence for six seconds does not.
    const ping = (ws: WebSocket) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      try {
        ws.send(JSON.stringify({ t: "ping" }));
      } catch {
        return;
      }
      clearTimeout(pong);
      pong = setTimeout(() => {
        try {
          ws.close();
        } catch {}
      }, 6000);
    };

    const connect = () => {
      if (disposed) return;
      setStatus("connecting");
      const scheme = location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(
        `${scheme}://${location.host}/api/rooms/${code}/socket`,
      );
      current = ws;
      socket.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setStatus("open");
        ws.send(JSON.stringify({ t: "hello", token }));
        clearInterval(beat);
        beat = setInterval(() => {
          if (!document.hidden) ping(ws);
        }, 25000);
      };

      ws.onmessage = (event) => {
        clearTimeout(pong);
        let message: { t?: string; [key: string]: unknown };
        try {
          message = JSON.parse(String(event.data));
        } catch {
          return;
        }
        if (message.t === "state") {
          handlers.current.onState(message as unknown as RoomSnapshot);
        } else if (message.t === "ack") {
          const id = String(message.id);
          const entry = pending.current.get(id);
          if (!entry) return;
          pending.current.delete(id);
          if (message.ok) entry.resolve();
          else
            entry.reject(
              new Error(
                typeof message.error === "string"
                  ? message.error
                  : "Could not complete that action.",
              ),
            );
        } else if (message.t === "fatal") {
          handlers.current.onFatal(
            typeof message.message === "string"
              ? message.message
              : "The table closed.",
          );
        }
      };

      ws.onclose = () => {
        if (socket.current === ws) socket.current = null;
        if (current === ws) current = null;
        clearInterval(beat);
        clearTimeout(pong);
        rejectAll(new Error("Reconnecting to your table…"));
        if (disposed) return;
        setStatus("closed");
        attempt += 1;
        // A hidden app retries slowly instead of never, so an occluded tab or a
        // backgrounded phone still heals on its own.
        retry = setTimeout(
          connect,
          paused ? 30000 : Math.min(8000, 500 * 2 ** Math.min(attempt, 4)),
        );
      };

      ws.onerror = () => ws.close();
    };

    const wake = () => {
      if (document.hidden) {
        paused = true;
        return;
      }
      paused = false;
      const ws = current;
      if (ws && ws.readyState === WebSocket.CONNECTING) return;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ping(ws);
        return;
      }
      clearTimeout(retry);
      connect();
    };
    const online = () => {
      if (!document.hidden) wake();
    };

    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", online);
    connect();

    return () => {
      disposed = true;
      clearTimeout(retry);
      clearInterval(beat);
      clearTimeout(pong);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", online);
      rejectAll(new Error("Connection closed."));
      socket.current = null;
      current?.close();
    };
  }, [code, token]);

  const send = useCallback((message: Record<string, unknown>) => {
    return new Promise<void>((resolve, reject) => {
      const ws = socket.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        reject(new Error("Reconnecting to your table…"));
        return;
      }
      const id = crypto.randomUUID();
      const timer = setTimeout(() => {
        pending.current.delete(id);
        reject(new Error("The table did not answer. Please try again."));
      }, 10000);
      pending.current.set(id, {
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      ws.send(JSON.stringify({ ...message, id }));
    });
  }, []);

  return { status, send };
}

"use client";
import { useCallback, useEffect, useRef } from "react";
import { hapticThrow } from "@/lib/native";
export function useGameAudio(enabled: boolean) {
  const context = useRef<AudioContext | null>(null);
  const buffer = useRef<Promise<AudioBuffer> | null>(null);
  const active = useRef(enabled);
  active.current = enabled;
  const prepare = useCallback(() => {
    const ctx = (context.current ??= new AudioContext());
    void ctx.resume().catch(() => {});
    buffer.current ??= fetch("/audio/shell-drop.mp3")
      .then((r) => {
        if (!r.ok) throw new Error("Audio unavailable");
        return r.arrayBuffer();
      })
      .then((bytes) => ctx.decodeAudioData(bytes))
      .catch((e) => {
        buffer.current = null;
        throw e;
      });
    return { ctx, ready: buffer.current };
  }, []);
  const unlock = useCallback(() => {
    try {
      void prepare().ready.catch(() => {});
    } catch {}
  }, [prepare]);
  const play = useCallback(
    (kind = "roll") => {
      if (!active.current) return;
      try {
        if (kind === "roll") hapticThrow();
        const { ctx, ready } = prepare();
        void ready
          .then((audio) => {
            if (!active.current || ctx.state !== "running") return;
            const source = ctx.createBufferSource(),
              gain = ctx.createGain();
            source.buffer = audio;
            source.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.value = kind === "roll" ? 0.75 : 0.18;
            source.start(0, 0, kind === "roll" ? audio.duration : 0.16);
            source.onended = () => {
              source.disconnect();
              gain.disconnect();
            };
          })
          .catch(() => {});
      } catch {}
    },
    [prepare],
  );
  useEffect(
    () => () => {
      void context.current?.close().catch(() => {});
    },
    [],
  );
  return { play, unlock };
}

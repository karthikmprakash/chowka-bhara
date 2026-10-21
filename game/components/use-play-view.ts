"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Game } from "@/lib/game";
import { setImmersive as setNativeImmersive, isNativeApp } from "@/lib/native";
export function usePlayView(game: Game | null) {
  const rootRef = useRef<HTMLDivElement>(null),
    lastPhase = useRef(""),
    nativeFocus = useRef(false);
  const [focused, setFocused] = useState(false),
    [immersive, setImmersive] = useState(false),
    [canImmerse, setCanImmerse] = useState(false);
  useEffect(() => {
    setCanImmerse(
      isNativeApp() ||
        (!!document.fullscreenEnabled && !!rootRef.current?.requestFullscreen),
    );
  }, []);
  useEffect(() => {
    // On a phone the board owns the whole screen: the system bars step aside
    // as soon as the game takes over.
    if (!isNativeApp()) return;
    setNativeImmersive(
      focused && window.matchMedia("(max-width: 700px)").matches,
    );
  }, [focused]);
  useEffect(() => {
    const key = game ? `${game.players[0]?.id}:${game.phase}` : "";
    if (key === lastPhase.current) return;
    lastPhase.current = key;
    if (!game || game.phase === "lobby") {
      setFocused(false);
      if (document.fullscreenElement === rootRef.current)
        void document.exitFullscreen().catch(() => {});
    } else if (
      game.phase === "playing" &&
      matchMedia("(max-width: 700px)").matches
    )
      setFocused(true);
  }, [game?.phase, game?.players[0]?.id]);
  useEffect(() => {
    if (!focused) return;
    const old = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.documentElement.classList.add("playing-focused");
    return () => {
      document.documentElement.style.overflow = old;
      document.documentElement.classList.remove("playing-focused");
    };
  }, [focused]);
  useEffect(() => {
    const changed = () => {
      if (document.fullscreenElement === rootRef.current) {
        nativeFocus.current = true;
        setImmersive(true);
        setNativeImmersive(true);
      } else if (nativeFocus.current) {
        nativeFocus.current = false;
        setFocused(false);
        setImmersive(false);
        setNativeImmersive(false);
      }
    };
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  const exitFocus = useCallback(() => {
    setFocused(false);
    setImmersive(false);
    setNativeImmersive(false);
    if (document.fullscreenElement === rootRef.current)
      void document.exitFullscreen().catch(() => {});
  }, []);
  useEffect(() => {
    // The native shell sends this when the hardware back button is pressed
    // while the board owns the screen.
    const leave = () => exitFocus();
    document.addEventListener("chowka:exit-focus", leave);
    return () => document.removeEventListener("chowka:exit-focus", leave);
  }, [exitFocus]);
  const toggleFocus = useCallback(() => {
    if (focused) {
      exitFocus();
      return;
    }
    setFocused(true);
    setImmersive(true);
    // The native shell hides the system bars; browsers take the request below.
    setNativeImmersive(true);
    // iPhone Safari can use the same viewport-filling layout without this API.
    const request = rootRef.current?.requestFullscreen;
    if (request) void request.call(rootRef.current).catch(() => {});
  }, [focused, exitFocus]);
  const immerse = useCallback(() => {
    setImmersive(true);
    setNativeImmersive(true);
    const node = rootRef.current;
    if (node?.requestFullscreen) void node.requestFullscreen().catch(() => {});
  }, []);
  return {
    rootRef,
    focused,
    toggleFocus,
    exitFocus,
    canImmerse,
    immersive,
    immerse,
  };
}

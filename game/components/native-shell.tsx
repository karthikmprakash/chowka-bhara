"use client";
import { useEffect } from "react";
import { applyNativeInsets, bindBackButton, syncStatusBarTheme } from "@/lib/native";

/**
 * Connects the page to the native Android shell. It renders nothing and does
 * nothing in a browser, where the native helpers are no-ops.
 */
export function NativeShell() {
  useEffect(() => {
    const restoreStatusBar = syncStatusBarTheme();
    const releaseBackButton = bindBackButton();
    const restoreInsets = applyNativeInsets();
    return () => {
      restoreStatusBar();
      releaseBackButton();
      restoreInsets();
    };
  }, []);
  return null;
}

"use client";

/**
 * Native shell bridge.
 *
 * The Android build (Capacitor) runs this same app inside a WebView, so the
 * page needs a thin bridge to the device: status bar styling that follows the
 * game theme, throw feedback, a screen wake-lock, and the hardware back
 * button. Every helper is a no-op in a browser, so the web build behaves
 * exactly as it did before.
 */

type PluginListener = { remove: () => void };

type CapPlugin = {
  addListener?: (
    event: string,
    handler: (data: never) => void,
  ) => PluginListener | Promise<PluginListener>;
  impact?: (options: { style: string }) => Promise<void>;
  setStyle?: (options: { style: string }) => Promise<void>;
  setKeepAwake?: (options: { enabled: boolean }) => Promise<void>;
  setImmersive?: (options: { enabled: boolean }) => Promise<void>;
  getInsets?: () => Promise<SystemInsets>;
  share?: (options: {
    title?: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
  }) => Promise<void>;
  exitApp?: () => Promise<void>;
};

type SystemInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, CapPlugin | undefined>;
};

function capacitor(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** True only inside the native Android shell. */
export function isNativeApp(): boolean {
  const cap = capacitor();
  if (!cap?.isNativePlatform?.()) return false;
  const platform = cap.getPlatform?.();
  return platform === "android" || platform === "ios";
}

function plugin(name: string): CapPlugin | undefined {
  const cap = capacitor();
  if (!cap) return undefined;
  return cap.Plugins?.[name];
}

/**
 * Subscribe to a native event. The bridge hands back the listener handle
 * directly, but some builds wrap it in a promise, so accept both.
 */
function subscribe(
  target: CapPlugin,
  event: string,
  handler: (data: never) => void,
): () => void {
  let listener: PluginListener | undefined;
  const result = target.addListener?.(event, handler);
  if (!result) return () => {};
  if (typeof (result as Promise<PluginListener>).then === "function") {
    void (result as Promise<PluginListener>)
      .then((handle) => {
        listener = handle;
      })
      .catch(() => {});
  } else {
    listener = result as PluginListener;
  }
  return () => {
    listener?.remove();
    listener = undefined;
  };
}

/** A short tap on throws, paired with the shell-drop sound. */
export function hapticThrow(): void {
  if (!isNativeApp()) return;
  const haptics = plugin("Haptics");
  void haptics?.impact?.({ style: "LIGHT" }).catch(() => {});
}

/** A firmer tap as a pawn lands on its square. */
export function hapticLanding(): void {
  if (!isNativeApp()) return;
  const haptics = plugin("Haptics");
  void haptics?.impact?.({ style: "MEDIUM" }).catch(() => {});
}

/** Hold the screen awake while a game is in progress. */
export function setKeepAwake(enabled: boolean): void {
  if (!isNativeApp()) return;
  const shell = plugin("NativeShell");
  void shell?.setKeepAwake?.({ enabled }).catch(() => {});
}

/**
 * Give the board the whole screen.
 *
 * A WebView cannot enter the platform fullscreen on its own, so the shell
 * hides the system bars instead, which is what the browser's fullscreen does
 * on the web.
 */
export function setImmersive(enabled: boolean): void {
  if (!isNativeApp()) return;
  const shell = plugin("NativeShell");
  void shell?.setImmersive?.({ enabled }).catch(() => {});
}

/**
 * Adopt the device's system bar insets.
 *
 * A WebView reports display cutouts but not the status and navigation bars,
 * so the native shell measures them and the page uses them for its own safe
 * spacing. Browsers keep their own env() values.
 */
export function applyNativeInsets(): () => void {
  if (!isNativeApp()) return () => {};
  const shell = plugin("NativeShell");
  if (!shell) return () => {};
  // The page may already know about a display cutout through env(). Keep the
  // larger of the two, so neither source can hide the other.
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-right:env(safe-area-inset-right,0px);padding-bottom:env(safe-area-inset-bottom,0px);padding-left:env(safe-area-inset-left,0px)";
  document.body.appendChild(probe);
  const probeStyle = getComputedStyle(probe);
  const fromPage = {
    top: parseFloat(probeStyle.paddingTop) || 0,
    right: parseFloat(probeStyle.paddingRight) || 0,
    bottom: parseFloat(probeStyle.paddingBottom) || 0,
    left: parseFloat(probeStyle.paddingLeft) || 0,
  };
  probe.remove();
  const set = (insets: SystemInsets) => {
    const style = document.documentElement.style;
    // The native shell measures the status and navigation bars. The page's own
    // env() values describe a display cutout, which only reaches into the
    // content from the sides, so they are honoured there and nowhere else.
    const pick = (side: keyof SystemInsets, withCutout: boolean) => {
      const native = insets[side] ?? 0;
      const cutout = withCutout ? fromPage[side] ?? 0 : 0;
      return Math.max(0, Math.round(Math.max(native, cutout)));
    };
    style.setProperty("--inset-top", `${pick("top", false)}px`);
    style.setProperty("--inset-right", `${pick("right", true)}px`);
    style.setProperty("--inset-bottom", `${pick("bottom", false)}px`);
    style.setProperty("--inset-left", `${pick("left", true)}px`);
  };
  // Subscribe before asking, so a measurement that lands in between is not
  // lost.
  const release = subscribe(
    shell,
    "insetsChanged",
    ((insets: SystemInsets) => {
      set(insets);
    }) as (data: never) => void,
  );
  void shell
    .getInsets?.()
    .then(set)
    .catch(() => {});
  return release;
}

/**
 * Keep the status bar legible against the game surface. The in-app light and
 * dark themes decide whether the system icons are dark or light.
 */
export function syncStatusBarTheme(): () => void {
  if (!isNativeApp()) return () => {};
  const statusBar = plugin("StatusBar");
  if (!statusBar?.setStyle) return () => {};
  const apply = () => {
    const dark = document.documentElement.dataset.theme === "dark";
    // Style.Light draws dark icons for a light surface, Style.Dark the reverse.
    void statusBar.setStyle?.({ style: dark ? "DARK" : "LIGHT" }).catch(() => {});
  };
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

/**
 * Share an invite with the device's own share sheet, the way a phone app
 * should. Returns false when the shell cannot share, so the page can fall
 * back to the clipboard.
 */
export async function shareInvite(
  title: string,
  text: string,
  url: string,
): Promise<boolean> {
  if (!isNativeApp()) return false;
  const share = plugin("Share");
  if (!share?.share) return false;
  try {
    await share.share({ title, text, url, dialogTitle: title });
    return true;
  } catch {
    return false;
  }
}

/**
 * Hardware back button: close an open dialog first, then leave the focused
 * play view, then step back through the app's screens, and only close the
 * app when there is nowhere else to go.
 */
export function bindBackButton(): () => void {
  if (!isNativeApp()) return () => {};
  const app = plugin("App");
  if (!app?.addListener) return () => {};
  return subscribe(
    app,
    "backButton",
    (() => {
      const dialog = document.querySelector<HTMLDialogElement>("dialog[open]");
      if (dialog) {
        dialog.close();
        return;
      }
      if (document.documentElement.classList.contains("playing-focused")) {
        document.dispatchEvent(new CustomEvent("chowka:exit-focus"));
        return;
      }
      const screen = document
        .querySelector(".app-shell")
        ?.getAttribute("data-screen");
      if (screen && screen !== "home") {
        document.dispatchEvent(new CustomEvent("chowka:back"));
        return;
      }
      void app.exitApp?.().catch(() => {});
    }) as (data: never) => void,
  );
}

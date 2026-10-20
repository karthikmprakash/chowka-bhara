# Chowka Bara for Android

The Android app is a native shell around the same game that runs on the web.
The game itself is not reimplemented: the app loads the deployed Cloudflare
Worker in a WebView, so the board, the rules, the animations, the languages
and the online rooms are the same code in both places.

```
capacitor.config.json   app id, name, server URL and plugin settings
android/                 the Gradle project (Capacitor generated, then customised)
scripts/generate-android-icons.mjs   regenerates the launcher icons and colours
```

## Requirements

- Node.js 22.13 or newer
- JDK 21
- Android SDK with platform 36 and build-tools 35 (or newer)

Point the build at your SDK with `ANDROID_HOME`, and put `sdk.dir` in
`android/local.properties`.

## Build

```sh
npm ci                       # once, from the repository root
cd game && npm ci && npm run build && cd ..   # build the web app
npm run android:build        # sync the web app into the project and assemble
```

The debug APK lands in `android/app/build/outputs/apk/debug/app-debug.apk`.
Install it with `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.

`npm run android:open` opens the project in Android Studio instead.

## The server the app loads

`capacitor.config.json` points the WebView at a live site, because the game is
a server rendered app and online rooms need the D1 backed API:

```json
"server": {
  "url": "https://chowka-bara.mkarthikprakash-work.workers.dev",
  "androidScheme": "https"
}
```

Change the `url` to your own Worker, then run `npm run android:sync` and
rebuild. The app needs a network connection; the board is rendered by the
server, not shipped inside the package.

## Release builds

Create a keystore once and keep it safe:

```sh
keytool -genkey -v -keystore android/chowka-bara.keystore \
  -alias chowka-bara -keyalg RSA -keysize 2048 -validity 10000
```

Describe it in `android/keystore.properties` (this file is ignored by git):

```properties
CHOWKA_STORE_FILE=chowka-bara.keystore
CHOWKA_STORE_PASSWORD=...
CHOWKA_KEY_ALIAS=chowka-bara
CHOWKA_KEY_PASSWORD=...
```

Then `npm run android:build:release` produces a signed
`android/app/build/outputs/apk/release/app-release.apk`.

## What the native shell adds

The shell only adds what a browser cannot do. Everything in `game/` is
unchanged for the web build.

- **System bar insets.** A WebView reports display cutouts but never the
  status and navigation bars, so `NativeShellPlugin` measures them and the
  page uses them for its own spacing. The page reads them through the
  `--inset-*` custom properties in `game/app/globals.css`.
- **Status bar.** The icons follow the in-app light and dark theme.
- **Immersive play.** "Hide browser controls" hides the system bars, the same
  way the browser's fullscreen hides the browser chrome.
- **Haptics.** A throw taps the vibrator, and a pawn landing taps it again.
- **Sharing.** The invite opens the device's own share sheet, with the room
  code and the link.
- **Screen wake-lock.** The display stays on while a game is in progress.
- **Back button.** It closes an open dialog, then leaves the focused board,
  and only then closes the app.
- **Splash screen.** The launch screen carries the game's own palette and
  mark, generated from `game/public/favicon.svg`.

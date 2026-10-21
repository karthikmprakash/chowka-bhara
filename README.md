# Chowka Bara

The complete application is in [`game/`](./game/README.md).

Play: https://chowka-bara.karthikmprakash.online

Features: online rooms for 2–4 players, local pass-and-play, computer opponents, 5×5 and 7×7 boards, friendly and capture-to-enter rules, mobile controls, and persistent games.

## Repository layout

```
game/        Next.js + Vinext/Vite app, deployed as a Cloudflare Worker with D1
  wrangler.json  Worker name, compatibility flags, and the D1 `DB` binding
  worker/        Worker entrypoint
  lib/           Game engine, room API, translations
  drizzle/       Tracked D1 migration
android/      Capacitor Android app: a native shell around the same game
  README.md      Build, signing, and the native bridge
```

See `game/README.md` for setup, testing, game rules, and architecture, and
[`android/README.md`](./android/README.md) for the Android app.

## Pipeline

```
pull request ──▶ CI (type, lint, test, build, room API, debug APK)
merge to main ──▶ deploy the Cloudflare Worker
tag v1.2.3   ──▶ signed AAB + APK, Play internal draft, GitHub release
```

`main` is protected and always deployable. Releases are semver tags; the tag
sets the Android version name and code. The full process, the required secrets
and the Play Console setup are in [`docs/RELEASING.md`](./docs/RELEASING.md).

## Requirements

Node.js 22.13 or newer.

```sh
cd game
npm ci
npm run build
npm run db:migrate
npm run dev
```

## Deploy the web app

```sh
cd game
npx wrangler d1 create chowka-bara     # once
# put the printed database_id in wrangler.json
npm run db:migrate:remote
npm run deploy
```

## Android app

The Android app is a native shell that loads the deployed Worker in a
WebView, so the game, the rules and the rooms are the same code as on the web.

```sh
npm ci
cd game && npm ci && npm run build && cd ..
npm run android:build
```

The debug APK is written to
`android/app/build/outputs/apk/debug/app-debug.apk`. See
[`android/README.md`](./android/README.md) for signing and release builds.

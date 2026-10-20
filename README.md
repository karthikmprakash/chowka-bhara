# Chowka Bara

The complete application is in [`game/`](./game/README.md).

Play: https://chowka-bara-game-table.wintryrose512.chatgpt.site

Features: online rooms for 2–4 players, local pass-and-play, computer opponents, 5×5 and 7×7 boards, friendly and capture-to-enter rules, mobile controls, and persistent games.

## Repository layout

```
game/        Next.js + Vinext/Vite app, deployed as a Cloudflare Worker with D1
  wrangler.json  Worker name, compatibility flags, and the D1 `DB` binding
  worker/        Worker entrypoint
  lib/           Game engine, room API, translations
  drizzle/       Tracked D1 migration
```

See `game/README.md` for setup, testing, game rules, and architecture.

## Requirements

Node.js 22.13 or newer.

```sh
cd game
npm ci
npm run build
npm run db:migrate
npm run dev
```

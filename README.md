# Chowka Bara

A complete browser game with 5×5 and 7×7 boards, 2–4-player online rooms, computer opponents, and local pass-and-play.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_careful_shatterstar.sql
npm run dev
```

The migration is a first-time setup step. Do not reapply it to an initialized database. The development server uses http://localhost:5173. Use `npm start` for the production build preview. Both share the local D1 database in `.wrangler/state`.

## Validation

```sh
npm test
npm run typecheck
# With the local server running:
npm run test:rooms
```

The rules tests cover scoring, safe houses, captures, exact home, capture gates, bonus throws, resignations, and complete simulated games. The room integration tests exercise authorization, joining, concurrent writes, host controls, gameplay, rematches, and host migration.

## Play

- **Online:** Enter your name, create a room, and share its link or six-character code. The host starts when 2–4 players have joined.
- **Together:** Pass one screen between 2–4 people.
- **Practice:** Play against 1–3 computer opponents.
- **Controls:** Throw the cowries, then select a highlighted pawn or a numbered pawn button. Enter throws on desktop. Mobile has persistent controls at the bottom.
- Local games save automatically. Online seats are remembered on the same browser and device. Keep browser storage to retain your seat. A room expires 24 hours after creation.

## Rules in this edition

The 5×5 board uses four shells, scoring 1, 2, 3, 4, or 8. The 7×7 board uses six, scoring 1–6 or 12. All open or all closed grants a bonus. Pawns begin on the colored home square. Move around the outer perimeter, then follow the alternating inward spiral. The seven-house route revisits its final inner-ring entry before reaching the center, keeping every step orthogonally connected.

A capture resets every rival pawn at the destination to its home square and earns another throw. The 5×5 board has four safe houses at the outer midpoints; its four inner diagonal squares allow captures. The 7×7 board has eight safe houses. The center is the protected finish on both boards. Landing home requires an exact throw and earns a bonus. With no legal move, the throw is skipped; a bonus is retained. First to bring all four pawns home wins.

The optional **Capture to enter** rule requires one capture per player before entering the inner ring. This is a deliberately documented house ruleset: throws resolve individually; pawn pairing, blockades, and three-bonus penalties are excluded. The in-app guide explains every rule. Regional reference: https://rollthedice.in/pages/how-to-play-chowka-bara-7-house.

## Architecture

- React 19 with TypeScript, Vinext/Vite, and native CSS. Fonts are self-hosted; no remote assets are needed during play.
- `lib/game.ts`: deterministic immutable game engine shared by local play, bots, server actions, and tests.
- `lib/rooms.ts`: server-authoritative multiplayer API. Only the server generates online throws using cryptographic randomness. Private seat tokens never appear in public room state.
- `db/schema.ts` and `drizzle/`: Cloudflare D1 room persistence. Optimistic compare-and-swap revisions reject concurrent or stale actions.
- `components/board.tsx`: a DOM board with memoized paths, accessible numbered pawns, legal targets, and CSS position transitions.
- `components/game-app.tsx`: setup, lobby, turn controls, AI, reconnect, autosave, rules, and rematches.
- Room clients synchronize every second while visible and every five seconds in the background. Local play has no network dependency after loading. No WebSocket service is required.

Hosting uses the Sites plugin's Cloudflare Worker/D1 deployment. `.openai/hosting.json` identifies the Site and its `DB` binding. The tracked SQL migration provisions hosted tables during publication. The Site is public; room codes permit joining before the host starts, and each player receives a private seat token. Rooms become inaccessible after expiry. Expiration is not a database deletion policy.

## Design & accessibility

A quiet courtyard palette, DM Serif Display for the heritage character, DM Sans for controls, and four distinct pawn colors. Responsive board layouts, keyboard access, native focus-trapped dialogs, labeled controls, optional audio, a numbered path, and reduced-motion and reduced-transparency support. Font licenses are included under `public/fonts/`.

## Preferences

Use the moon/sun button in the header for dark or light mode and the Kannada/English button to switch languages. Preferences stay on the current device, independently of other room members. Kannada covers setup, gameplay, rules, dialogs, activity, and errors. The initial theme follows the system preference until explicitly changed.

## Focused phone play

Phone games open in a viewport-filling play layout with the board, current turn, and large pawn/throw controls together. Exit using the top-right minimize control; the game is preserved. The board toolbar can reopen full-screen play. Where the browser supports native fullscreen, the focused header also offers a control to hide browser chrome; unsupported browsers retain the same focused layout. `viewport-fit=cover`, dynamic viewport units, safe-area padding, and scroll containment keep controls within the available viewport.

Cowrie throws now animate over the visible board. Results retain the original thrower and score even when a skipped move has already advanced the turn. Local and online play share this presentation. Keyboard throws and reduced-motion settings skip tumbling. Shell and pawn movement uses transform/opacity animation without an animation-library dependency.

The pieces use procedural grain artwork: kidney beans, green gram, chickpeas, and rice, with visible pawn numbers and reachable move buttons. Brown cowries include modeled mouths and shell texture. No remote image downloads are needed during play. Phone layout was checked in a 430×780 browser viewport, including both board sizes; device-specific Safari gestures and physical-device feel still need a hardware check.

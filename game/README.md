# Chowka Bara

A complete browser game with 5×5 and 7×7 boards, 2–4-player online rooms, computer opponents, and local pass-and-play.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run build
npm run dev
```

The development server uses http://localhost:5173. Use `npm start` for the production build preview. Rooms need no local database; the Durable Object runs inside the dev server's Miniflare instance.

## Validation

```sh
npm test
npm run typecheck
# With the local server running:
npm run test:rooms
```

The rules tests cover scoring, safe houses, captures, exact home, capture gates, bonus throws, resignations, and complete simulated games. The room integration tests open real WebSockets and exercise seat authorization, joining, host controls, throw broadcasts, turn rejection, resignations, and rematches.

## Play

- **Online:** Enter your name, create a room, and share its link or six-character code. The host starts when 2–4 players have joined.
- **Together:** Pass one screen between 2–4 people.
- **Practice:** Play against 1–3 computer opponents.
- **Controls:** Throw the cowries, then select a highlighted pawn or a numbered pawn button. Enter throws on desktop. Mobile has persistent controls at the bottom.
- Local games save automatically. Online seats are remembered on the same browser and device. Keep browser storage to retain your seat. A room expires 24 hours after creation.

## The flow on a phone

A narrow screen never becomes one long page. The app moves screen by screen, and
each screen holds its own content:

1. **Welcome** - the mark, the name, the table you are about to play on, and a
   way in.
2. **Set the table** - the game, the board, the number of players, and the house rules.
3. **Take your seat** - a portrait, a name, and how much help you want.
4. **Your table is open** - the room code and the seats, while you wait.
5. **The game** - the board fills the screen and the system bars step aside.

The hardware back button walks back through those screens, closes an open
dialog first, and leaves the app only from the welcome screen. Leaving a game
returns to the welcome screen as well, with the game kept for another day. The
wide layout keeps the original one long page with the board and the set up
panel side by side.

## The type on a phone

The shared experience uses a readable scale on laptops and phones. The native
WebView and browser both load `app/experience.css` after the structural styles.
Phone-specific proportions include:

- 16px body copy, 13-14px secondary text, 11-12px captions and overlines.
- 44px touch targets, 20px icons, 52-58px buttons.
- The set up panel fills the screen and pins its action to the foot, so no
  screen floats in empty space.

The shared reading scale now applies above 700px too: 17px body type, 15-17px controls and descriptions, and 12-14px secondary labels. Desktop setup uses two steps. Games open in the focused play view on all screen sizes.

## The table on a phone

The board already fills the width, so the gains are clarity and room:

- The turn is said once. The board no longer repeats the turn bar, and the
  bar itself only speaks when it has something new to say.
- The players around the board are large enough to read, and a four player
  game leaves room for the players at the sides instead of clipping them.
- Two players get the full width; four give up a little for the side seats.

## Rules in this edition

The 5×5 board uses four shells, scoring 1, 2, 3, 4, or 8. The 7×7 board uses six, scoring 1–6 or 12. All open or all closed grants a bonus. Pawns begin on the colored home square. Move around the outer perimeter, then follow the alternating inward spiral. The seven-house route revisits its final inner-ring entry before reaching the center, keeping every step orthogonally connected.

A capture resets every rival pawn at the destination to its home square and earns another throw. The 5×5 board has four safe houses at the outer midpoints; its four inner diagonal squares allow captures. The 7×7 board has eight safe houses. The center is the protected finish on both boards. Landing home requires an exact throw and earns a bonus. With no legal move, the throw is skipped; a bonus is retained. First to bring all four pawns home wins.

**Capture to enter** is mandatory: each player must capture an opponent before entering the inner ring. Own pawns may share every X-marked safe house and the central finish. Ordinary houses hold one pawn per player. Occupancy uses physical coordinates, including the repeated seven-house entry. This is a deliberately documented house ruleset: throws resolve individually; pawn pairing, blockades, and three-bonus penalties are excluded. The in-app guide explains every rule. Regional reference: https://rollthedice.in/pages/how-to-play-chowka-bara-7-house.

## Architecture

- React 19 with TypeScript, Vinext/Vite, and native CSS. Fonts are self-hosted; no remote assets are needed during play.
- `lib/game.ts`: deterministic immutable game engine shared by local play, bots, server actions, and tests.
- `lib/room-object.ts`: one Durable Object per room code, the only authority for an online table. It generates throws with cryptographic randomness, applies the engine, and streams the result over hibernatable WebSockets.
- `lib/rooms.ts`: validates room requests and forwards them to the room object. There is no database.
- `lib/use-room-socket.ts`: the client connection. It greets the room with its private seat token, applies broadcast state, and retries with a short backoff.
- `worker/index.ts` and `wrangler.json`: the Worker entrypoint, the socket route, and the shared Cloudflare configuration for the `ROOMS` binding.
- `components/board.tsx`: a DOM board with memoized paths, accessible numbered pawns, legal targets, and CSS position transitions.
- `components/game-app.tsx`: setup, lobby, turn controls, AI, reconnect, autosave, rules, and rematches.
- Online play is push, not poll: the room broadcasts after every action, and each action is acknowledged to the seat that sent it. Local play has no network dependency after loading.

Hosting is a plain Cloudflare Worker with one Durable Object class. `wrangler.json` is the single source of truth for the worker name, compatibility flags, and the `ROOMS` binding; `vite.config.ts` reads the same file so local development and deployment never drift. The app is public; room codes permit joining before the host starts, and each player receives a private seat token. A room lives in the object's own storage for 24 hours, and is deleted as soon as the last player has been gone for fifteen minutes. There is no D1 database, and nothing outlives the table.

## Deploy

```sh
npm run deploy
```

`npm run deploy` builds the Worker and uploads it with the generated `dist/server/wrangler.json`, including the `Room` class and its SQLite migration. The first deployment creates the namespace; later ones roll the class forward.

## Design & accessibility

A quiet courtyard palette, DM Serif Display for the heritage character, DM Sans for controls, and four distinct pawn colors. Responsive board layouts, keyboard access, native focus-trapped dialogs, labeled controls, optional audio, a numbered path, and reduced-motion and reduced-transparency support. Font licenses are included under `public/fonts/`.

## Preferences

Use the moon/sun button in the header for dark or light mode and the Kannada/English button to switch languages. Preferences stay on the current device, independently of other room members. Kannada covers setup, gameplay, rules, dialogs, activity, and errors. The initial theme follows the system preference until explicitly changed.

## Focused phone play

Phone games open in a viewport-filling play layout with the board, current turn, and large pawn/throw controls together. Exit using the top-right minimize control; the game is preserved. The board toolbar can reopen full-screen play. Where the browser supports native fullscreen, the focused header also offers a control to hide browser chrome; unsupported browsers retain the same focused layout. `viewport-fit=cover`, dynamic viewport units, safe-area padding, and scroll containment keep controls within the available viewport.

Cowrie throws now animate over the visible board. Results retain the original thrower and score even when a skipped move has already advanced the turn. Local and online play share this presentation. Keyboard throws and reduced-motion settings skip tumbling. Shell and pawn movement uses transform/opacity animation without an animation-library dependency.

The pieces use procedural grain artwork: kidney beans, green gram, chickpeas, and rice, with visible pawn numbers and reachable move buttons. Brown cowries include modeled mouths and shell texture. No remote image downloads are needed during play. Phone layout was checked in a 430×780 browser viewport, including both board sizes; device-specific Safari gestures and physical-device feel still need a hardware check.

### Household presentation

Eight hand-painted Indian household portraits are generated with the built-in image tool; the exact prompt is in `public/images/PROMPT.md`. The shared WebP sprite is about 200 KB, cached with static assets. Pick a portrait before hosting/joining, or use the portrait button during a game. Online changes authenticate the seat and participate in revision checks; older saved games receive a deterministic fallback.

Throw audio is an excerpt of bassronin's CC0 **Shell Drop**, an actual seashell recording. Source and processing are documented in `public/audio/LICENSE.txt`. One reusable Web Audio context loads the 11 KB local sample after sound is enabled; audio remains optional. Full-screen two-player play reduces side insets and raises the board cap from 540 to 820 pixels, with a height limit for short screens.

### Beginner and Advanced assistance

The assistance preference is personal and saved locally, so online players can choose independently. Beginner shows legal pawn highlights, landing previews, a move picker, and an explicitly enabled animated direction trail. Advanced hides these hints; all unfinished pawns of the current player remain selectable. Invalid selections explain the rule without consuming the throw or changing the turn. Both modes enforce identical rules on the server and locally; legacy relaxed games also follow the mandatory capture gate.

Focused board sizing uses its actual available stage height and width via container units, reserving space for complete top and bottom player profiles. Throw button labels and secondary text use explicit high-contrast colors in both themes.

### Pawn travel and route guide

Observed pawn moves play square by square, including outer corners and the inward turn. The authoritative game updates immediately; a short visual snapshot holds captures and the board's turn handoff until arrival. Each leg takes at most 150 ms and a whole long throw takes at most 840 ms, plus a 16 ms departure frame. Further throws and moves wait for arrival; bot turns respect that window. Animation timers cancel on unmount and resynchronize on a hidden tab or a reduced-motion preference. Opening a game, rematching, and multiple missed moves synchronize directly instead of inventing a route.

Show path uses a colored outer route, a quiet inner route with a capture gate, and a moving direction marker. Capturing unlocks the inner route. There are no per-square numbers. Beginner/Advanced choices now appear only in setup and the player settings dialog, reached through the portrait button.


## Readability, heritage and earned progress

`app/experience.css` owns the readable interface scale and the brass, rangoli and courtyard details. A 1280px layout was checked with 16px setup paragraphs, 15px mode controls, 16px field labels and a roughly 598px preview board. Matches use a top player roster with home progress and capture-gate status, freeing the full board width. Every game opens in the focused view; game controls remain together without page scrolling.

Personal progress uses five badges earned from real captures, homecomings, completed games, wins and an online finish. Points and ranks are derived from unlocked badges. The collection and completed-round records are stored only on the current device, with no account, leaderboard, fabricated scores or daily streak pressure. Reopening the same finished round cannot award it twice. Other tabs receive storage updates. Small capture, homecoming and victory celebrations run after pawn arrival and respect reduced motion.

Own pawns can share all X-marked safe houses on both boards. Ordinary-house blocking and capture-before-inner-circle rules remain enforced locally and on the server. Stacks use board-relative spacing, and disabled enemy pieces cannot block taps on your pieces.

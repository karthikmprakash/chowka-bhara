# Google Play submission

Everything the Play Console asks for, with answers that match this codebase.
Work top to bottom: the three declarations, then App content, then the listing.

Package: `com.chowkabara.game` · Category: **Games → Board**

---

## 1. The three declarations

These are safe to accept as they stand.

| Declaration | Answer | Why it is true here |
| --- | --- | --- |
| **Developer Program Policies** | Confirm | No ads, no in-app purchases, no analytics, no accounts, no sensitive permissions. `targetSdk 36`, no native `.so` files, cleartext off. |
| **Play App Signing Terms of Service** | Accept | Required for AAB uploads. Choose **Let Google generate the app signing key**; the CI keystore becomes the upload key. |
| **US export laws** | Acknowledge | No bundled cryptography and no crypto libraries. TLS is provided by the Android WebView and Cloudflare, which is mass-market encryption and needs no export licence or BIS filing. |

Two conditions on the Play App Signing acceptance:

- Only ever upload the AAB produced by the release workflow. A local
  `./gradlew assembleRelease` on a machine without `keystore.properties`
  produces an **unsigned** artifact.
- Back up the four `ANDROID_*` secrets. Losing the upload key needs a key reset;
  losing the signing key is impossible with Google-held keys.

---

## 2. App content

### 2.1 Privacy policy

URL: `https://chowka-bara.karthikmprakash.online/privacy`

The page lives at `game/app/privacy/page.tsx` and is linked from the About
dialog. It covers device storage, server storage, retention, sharing, children,
security, GDPR/DPDP rights, and a contact address.

### 2.2 Data safety

Open **App content → Data safety** and answer:

| Question | Answer |
| --- | --- |
| Does your app collect or share required user data types? | **Yes** |
| Is all user data encrypted in transit? | **Yes** |
| Do you provide a way for users to request data deletion? | **Yes** → `https://chowka-bara.karthikmprakash.online/privacy#contact` |
| Do you have a privacy policy? | **Yes** → the URL above |

One data type only:

| Data type | Collected | Shared | Ephemeral | Required | Purpose |
| --- | --- | --- | --- | --- | --- |
| **Personal info → Name** (the display name typed at the table) | Yes | Yes — with other players in the same room | No (kept until the room expires) | Required for online play | **App functionality** |

Everything else is **No**. The avatar is a chosen illustration, not personal
info. The room code and reconnect token are random game identifiers, not device
IDs. Local preferences and saved games never leave the device, so they are not
"collected" under Play's definition.

Do **not** declare advertising ID, location, contacts, or "app interactions":
the app has no advertising SDK, no location permission, and no analytics.

If analytics, ads, crash reporting, or accounts are ever added, this form must
change in the same release.

### 2.3 Content rating (IARC questionnaire)

Category: **Game**. Then:

| Question | Answer |
| --- | --- |
| Violence, blood, sexual content, nudity | No |
| Profanity, crude humour | No |
| Alcohol, tobacco, drugs | No |
| Gambling (real money or simulated casino) | No |
| Horror or fear | No |
| Discrimination | No |
| Users can interact online | **Yes** — private rooms joined with a six-character code |
| Users can share personal information | **Yes** — the display name is visible to players in the same room |
| Users can share their location | No |
| Users can purchase digital goods | No |
| Contains ads | No |

Expected result: **Everyone / PEGI 3 / USK 0**. The game is a traditional
board game with cowrie shells; there is no wagering, no casino theme, and no
real-money mechanic.

### 2.4 Target audience and content

- Age groups: **13–15, 16–17, 18+**. Do **not** select under-13.
- Designed for children: **No**.
- Do **not** opt into **Designed for Families**. Online rooms show a
  player-typed display name to other players, which would fail the Families
  requirements without moderation and parental controls.
- Keep child-directed wording out of the listing ("for kids", "for children").
  "For friends and family" is fine.

### 2.5 Ads

**No ads.** The app contains no ad SDK and no ad load of any kind.

### 2.6 App access

All functionality is available without a login. Use "All functionality is
available without restrictions" and add this note for the reviewer:

> No account or credentials are needed. Practice mode starts a game
> immediately. Online play needs a second device: open the app there, choose
> Online, and enter the room code shown on the first device.

### 2.7 Other declarations

| Section | Answer |
| --- | --- |
| Government apps | No |
| Financial features | No |
| Health apps | No |
| News apps | No |
| COVID-19 contact tracing | No |
| Data deletion (account) | Not applicable — there are no accounts; the policy offers deletion by email |

---

## 3. Store listing

### 3.1 Copy

**App name** (30 max)

```
Chowka Bara
```

**Short description** (80 max, currently 72)

```
Play Chowka Bara online, together on one phone, or against the computer.
```

**Full description**

```
Chowka Bara is the cowrie board game that has been played in Karnataka's courtyards for generations. Four pawns, a handful of shells, and the people you like playing with.

Three ways to sit at the table:

• Online rooms — open a private table, share the six-character code, and play with 2–4 people wherever they are.
• Together — pass one phone around and play on the same screen.
• Practice — take on a computer opponent and learn the board at your own pace.

Choose the compact 5×5 classic or the expansive 7×7 grand board. Play the friendly ruleset or require a capture before entering the center. Turn on move hints if you are learning, or turn them off for a cleaner game.

A light theme and a calm dark theme, made for late-night tables.

No ads. No sign-up. No in-app purchases. Online rooms keep a display name, an avatar, and the game state for 24 hours, then delete themselves. Local and practice games stay on your phone.

An internet connection is needed to open the game and to play online. Rooms are private: nobody can join without the code.

Come, let's play.
```

Do not add "best", "#1", "free download", emoji spam, or keyword lists.

### 3.2 Assets

| Asset | Spec | File |
| --- | --- | --- |
| App icon | 512 × 512 PNG, 32-bit | `store/play/icon-512.png` |
| Feature graphic | 1024 × 500 PNG | `store/play/feature-graphic-1024x500.png` |
| Phone screenshots | 1080 × 1920 PNG, 5 of them | `store/play/screenshots/01-home.png` … `05-settings.png` |

Screenshot order for the listing:

1. `01-home.png` — the welcome and the three ways to play
2. `03-board.png` — the 5×5 board in a practice game
3. `04-throw.png` — a throw resolved, with a legal move highlighted
4. `02-how-to-play.png` — the rules guide
5. `05-settings.png` — avatars and the beginner/advanced choice

Regenerate them at any time:

```sh
node scripts/capture-store-screenshots.mjs   # live site → screenshots + board crop
node scripts/generate-store-assets.mjs       # icon + feature graphic
```

The capture script drives headless Chrome at 1080 × 1920, so the screenshots are
the real app, not mockups. `generate-store-assets.mjs` needs the board crop that
the first script writes to `store/play/source/board.png`.

### 3.3 Category and contact

| Field | Value |
| --- | --- |
| App category | Games → Board |
| Tags | Board, Family, Multiplayer |
| Contact email | `mkarthikprakash.work@gmail.com` |
| Website | `https://chowka-bara.karthikmprakash.online` |
| Privacy policy | `https://chowka-bara.karthikmprakash.online/privacy` |

---

## 4. Custom domain

The app should not ship on `*.workers.dev`. Use
`chowka-bara.karthikmprakash.online` (the zone is already on Cloudflare).

1. Cloudflare dashboard → **Workers & Pages → chowka-bara → Settings → Domains
   & Routes → Add custom domain** → `chowka-bara.karthikmprakash.online`.
   Cloudflare creates the proxied DNS record; the existing wildcard A record
   does not conflict.
2. Change `capacitor.config.json`:

   ```json
   "server": {
     "url": "https://chowka-bara.karthikmprakash.online",
     "androidScheme": "https"
   }
   ```

3. `npm run android:sync` and rebuild.

The origin change resets WebView storage, so any installed test build loses its
saved name and game. Nothing is published yet, so this is free to do now.

---

## 5. Closed testing: 12 testers for 14 days

Personal developer accounts created after 13 November 2023 cannot reach
Production until a closed test has had **at least 12 testers opted in
continuously for 14 days**. Internal testing does not count.

### Runbook

1. Create a Google Group (for example `chowka-bara-testers`) and add 16 people,
   so drop-outs do not break the streak. Friends, family, and co-workers all
   count; the accounts must be real Google accounts.
2. **Test and release → Testing → Closed testing → Create track.** Add the group
   under Testers. Countries: India (add more if useful).
3. Upload the signed AAB. Either promote the internal draft or point the release
   workflow at `track: closed`.
4. Copy the **opt-in link** and send it to the group. Each tester must open it,
   sign in, join, and install. Sending an invite is not the same as opting in.
5. Keep every tester opted in until the counter says 12 for 14 consecutive days.
   A tester who opts out restarts their own 14-day streak.
6. Collect feedback in one place. A four-question form is enough:
   - Did the game open and load on the first try?
   - Did you play an online room with someone else? What happened?
   - Was anything confusing on a phone screen?
   - What is the one thing you would fix first?
7. **Dashboard → Apply for production.** Answer the three sections with real
   detail: how you recruited, what testers used, what you changed, and how you
   decided it was ready.
8. Production review usually takes seven days or less. Then promote the release
   with a staged rollout.

### Tester message (English)

> Namaskara! I built Chowka Bara, the cowrie board game, and I need your help
> for two weeks. Tap this link on your Android phone, sign in with Google, and
> install the app:
> [opt-in link]
> Please keep it installed until 4 Nov. Play a practice game, then play an
> online room with me. Tell me anything that feels slow, confusing, or broken.

### Tester message (Kannada)

> ನಮಸ್ಕಾರ! ನಾನು ಚೌಕ ಬಾರ ಆಟದ ಆ್ಯಪ್ ಮಾಡಿದ್ದೇನೆ. ಎರಡು ವಾರ ನಿಮ್ಮ ಸಹಾಯ ಬೇಕು.
> ಈ ಲಿಂಕ್ ತೆರೆದು Google ಖಾತೆಯಿಂದ ಸೈನ್ ಇನ್ ಮಾಡಿ, ಆ್ಯಪ್ ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಿ:
> [opt-in link]
> ನವೆಂಬರ್ 4 ರವರೆಗೆ ಆ್ಯಪ್ ಅನ್ನು ಅಳಿಸಬೇಡಿ. ಒಂದು ಅಭ್ಯಾಸ ಆಟ ಆಡಿ, ನಂತರ ನನ್ನೊಂದಿಗೆ
> ಆನ್‌ಲೈನ್ ಕೋಣೆಯಲ್ಲಿ ಆಡಿ. ನಿಧಾನ, ಗೊಂದಲ, ಅಥವಾ ಕೆಟ್ಟದ್ದು ಕಂಡರೆ ತಿಳಿಸಿ.

---

## 6. Pre-upload checklist

- [ ] Privacy policy is deployed and returns 200
- [ ] Data safety answers match section 2.2
- [ ] Content rating questionnaire submitted
- [ ] Target audience set to 13+, Families not selected
- [ ] Ads declaration is "No"
- [ ] App access note added
- [ ] Listing copy and all three asset types uploaded
- [ ] Custom domain resolves and the app opens from it
- [ ] Signed AAB uploaded (not the unsigned local artifact)
- [ ] Closed test running with 12+ opted-in testers
- [ ] `versionCode` has never been used before for `com.chowkabara.game`

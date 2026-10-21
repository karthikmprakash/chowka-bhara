# Releasing

The repository is a small monorepo: the game lives in `game/`, the Android
shell in `android/`. One pipeline builds and ships both.

## The model

```
feature branch ──▶ pull request ──▶ CI ──▶ merge to main ──▶ deploy web
                                     │
                                     └──▶ tag v1.2.3 ──▶ signed AAB ──▶ Play (internal draft)
                                                      └─▶ GitHub release
                                                      └─▶ deploy web at that tag
```

- **`main` is protected.** Every change arrives through a pull request that
  passes CI. Direct pushes are for the maintainer only.
- **`main` is always deployable.** A green merge deploys the Cloudflare Worker
  automatically.
- **Tags release the app.** Nothing reaches the Play Store without a semver
  tag, and even then it lands as a **draft on the internal track** until a
  human promotes it.

## Workflows

| Workflow | Trigger | Does |
| --- | --- | --- |
| `ci.yml` | every PR, every push to `main` | typecheck, lint, unit tests, build, room API round trip on a local D1, debug APK |
| `deploy-web.yml` | push to `main`, manual | builds and deploys the Worker |
| `release.yml` | tag `v*.*.*` | signed AAB + APK, Play internal draft, GitHub release, Worker deploy at the tag |

## Versioning

The tag is the source of truth. `v1.2.3` becomes:

- `versionName` = `1.2.3`
- `versionCode` = `1 * 1000000 + 2 * 1000 + 3` = `1002003`

The version code therefore always increases with semver, and Play never sees two
builds claiming the same code. Never move or reuse a tag: publish a new patch
version instead.

## One-time setup

### 1. Signing key

Create a keystore once and keep it out of the repository:

```sh
keytool -genkey -v -keystore chowka-release.keystore \
  -alias chowka-bara -keyalg RSA -keysize 2048 -validity 10000
```

Base64 it for the secret store:

```sh
base64 -i chowka-release.keystore | pbcopy      # macOS
```

Back the keystore file up somewhere safe. Losing it means you can never publish
an update to the same listing.

### 2. Play Console

1. Create the app in the Play Console with the package name
   **`com.chowkabara.game`**.
2. Complete the store listing, content rating, data safety form, and the
   privacy policy link. These are required before any track accepts a bundle.
   The exact answers, listing copy, and assets are in
   [`PLAY_STORE.md`](./PLAY_STORE.md).
3. In **Setup → API access**, link a Google Cloud project, create a service
   account, and grant it *Release manager* (or *Release to testing tracks*).
4. Download the service account JSON.

### 3. Repository secrets

Settings → Secrets and variables → Actions:

| Secret | Used by | Notes |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | web deploy | Workers Scripts: Edit, D1: Edit |
| `CLOUDFLARE_ACCOUNT_ID` | web deploy | account id, not a secret but kept together |
| `ANDROID_KEYSTORE_BASE64` | release | base64 of the `.keystore` file |
| `ANDROID_KEYSTORE_PASSWORD` | release | store password |
| `ANDROID_KEY_ALIAS` | release | e.g. `chowka-bara` |
| `ANDROID_KEY_PASSWORD` | release | key password |
| `PLAY_SERVICE_ACCOUNT_JSON` | release | the service account JSON, verbatim |

Until `PLAY_SERVICE_ACCOUNT_JSON` exists, releases still build the signed
artifacts and publish the GitHub release; the Play upload step is skipped.

### 4. Environment protection (recommended)

Create an environment called **`production`** and add yourself as a required
reviewer. The web deploy jobs use it, so a production deploy waits for one
approval. That is the cheapest guard rail that still keeps the flow automatic.

## Shipping a release

```sh
git switch main
git pull --ff-only
npm --prefix game run typecheck && npm --prefix game run test   # optional locally
git tag -a v1.2.3 -m "1.2.3"
git push origin v1.2.3
```

Then:

1. Watch **Actions → Release**. It produces `app-release.aab`,
   `app-release.apk`, a GitHub release with generated notes, and a draft on the
   Play **internal** track.
2. Install the APK from the release (or the internal track) and check the
   build on a device.
3. Promote the draft in the Play Console: internal → closed → production, with
   a staged rollout if the change is risky.

## Database migrations

D1 schema changes are deliberate, not automatic:

```sh
cd game
npm run db:migrate:remote      # applies the tracked SQL against production D1
```

Run the migration **before** deploying code that depends on it. The migration
files live in `game/drizzle/` and are reviewed like code.

## Rolling back

- **Web:** `cd game && npx wrangler rollback` restores the previous Worker
  version, or re-run `deploy-web.yml` on an earlier commit.
- **Android:** a published bundle cannot be unpublished; publish a new patch
  version with the fix and halt the staged rollout in the Play Console.

## Local equivalents

| Pipeline step | Local command |
| --- | --- |
| Web checks | `cd game && npm run typecheck && npm run lint && npm test && npm run build` |
| Room API tests | `cd game && npm run db:migrate && npm run dev`, then `npm run test:rooms` |
| Debug APK | `npm run android:build` |
| Signed bundle | `cd android && ./gradlew bundleRelease` (needs `android/keystore.properties`) |
| Deploy web | `cd game && npm run deploy` |

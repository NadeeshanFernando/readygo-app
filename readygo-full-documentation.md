# ReadyGo — Project Documentation

Smart packing checklist app with BLE tag support, an AI-assisted packing
library, and a companion backend for tag authenticity and AI suggestions.
This document covers everything built so far: features, architecture, and
full setup instructions for both the app and backend.

---

## 1. What ReadyGo Does

ReadyGo helps you build a packing checklist per trip, optionally attach
physical BLE tags to important items (passport, laptop, etc.), and verify
before you leave that everything tagged is actually with you — plus AI
suggestions, reusable packing templates, and reminders so you never
forget something.

**No login, no accounts.** The app creates one local profile automatically
on first launch. Everything lives on-device; the backend exists only to
support two specific features (tag authenticity and AI) that need a real
server.

---

## 2. App Features

### Trips
- Create, edit, delete trips (title, destination, start/end date, optional
  start time, notes).
- **Trip names must be unique per device** — duplicate names are rejected
  with an inline error.
- **Duplicate Trip** — clones a trip's items and tag assignments into a new
  trip, clears dates/reminder, auto-renames to avoid the unique-name rule
  ("Kandy" → "Kandy (Copy)").
- Trip actions (Duplicate, Delete) live behind a **"•••" menu** in the
  header — kept separate from primary actions to avoid accidental taps.

### Packing checklist
- Two item types: **Manual** (tap to check off) and **Tagged** (verified by
  BLE scan).
- Add items individually, or apply a **Pack** / **Template** in one tap.
- **Master Item Library** — every item you type gets saved automatically
  (toggle to opt out) so you never retype it; autocomplete suggests
  existing items as you type.
- **Always Carry** — flag any library item to auto-add it to every future
  trip you create.
- **Packs** — reusable item bundles for a *bag* (e.g. "Camera Bag").
- **Templates** — reusable item bundles for a *trip type* (e.g.
  "International", "Business"). Seven starter templates (Office, Beach,
  Business, Camping, Airport, Weekend, International) are created
  automatically on first use — fully editable/deletable.
- Packs and Templates share one underlying data model (`Bundle`), just
  labeled differently in the UI.

### BLE tags (mocked in this version — see §7)
- Register a physical tag by scanning its QR code (camera) or manual entry.
- Each tag has a `qrCode` (printed label) and `bleId` (Bluetooth identifier).
- **Tag authenticity verification** — registration calls the backend to
  cryptographically verify the tag was genuinely issued by you, not a
  cloned/forged one. Tags show "Verified genuine" or "Unverified" in the UI.
- Assign a registered tag to any tagged-type item.

### Check Everything
- Runs a mock BLE scan (simulates ~70% detection rate to mimic real-world
  range dropout) and compares against your checklist.
- Shows **Ready** / **Not Ready**, with a breakdown of what's missing.
- **Smart Warnings** — a companion-item rules engine flags likely gaps
  (laptop packed but no charger, camera but no battery, airport trip but no
  passport) as an advisory banner — separate from and never affecting the
  Ready/Not Ready result itself.

### Reminders
- Optional per-trip reminder ("Check Everything") delivered as a local
  device notification.
- Fully custom lead time — presets (1h, 3h, 6h, 12h, 1 day, 2 days, 1 week)
  or a custom value in minutes/hours/days/weeks/months.
- Validated against the trip's start date/time — can't schedule a reminder
  that would fire in the past; shows a clear reason if scheduling fails
  (permission denied, etc.) instead of failing silently.

### AI Suggestions
- "✨ Get AI Suggestions" button appears once a trip has a destination set.
- Calls the backend, which (if configured) asks Claude for destination/
  date-aware suggestions with a short reason each; falls back to a small
  static list if no AI key is configured.
- Accept adds the item to your checklist (and library); reject just
  dismisses it. Both are recorded for **Learning AI** (see backend section)
  — after 3+ rejections with zero accepts, an item stops being suggested.
- Entirely optional: if the backend isn't reachable, the button just shows
  an inline "not available" message — never breaks the core app.

### Other
- Splash screen: native icon flash, then a custom in-app screen (icon +
  "ReadyGo" + tagline, real React text — not baked into an image) shown for
  a guaranteed minimum 3 seconds.
- Profile tab: editable display name (cosmetic only), trip/tag stats, and a
  "send test notification" button for debugging reminders.

---

## 3. Backend Features

A small Node/Express server (`tag-auth-backend-example/`) providing exactly
two things the app can't safely do on its own:

### Tag authenticity (anti-cloning)
Generic BLE beacons broadcast in plain radio — anyone can clone one with a
$2 sniffer. This backend holds a signing secret that never ships inside the
app, so registration can be cryptographically verified:

- `POST /api/tags/provision` (admin-key protected) — you call this once per
  physical tag at manufacturing time. Computes
  `sig = HMAC-SHA256(secret, qrCode + bleId)` and returns the QR payload to print.
- `POST /api/tags/verify` (public) — the app calls this on every scan.
  Returns `{valid: true/false}` — never leaks the secret.

### AI Suggestions & Learning AI
- `POST /api/ai/suggestions` — takes trip context + existing items, returns
  suggested items with reasons. Uses Claude if `ANTHROPIC_API_KEY` is set,
  otherwise a static baseline list.
- `POST /api/ai/feedback` — records accept/reject decisions. After 3+
  rejections with 0 accepts for a given item, it stops being suggested to
  that user — a free heuristic that runs before any LLM call.

### Health check
- `GET /health` (public) — reports overall status plus individual checks
  (secrets configured, AI configured, disk actually writable). Returns
  `200` if healthy, `503` if something's genuinely wrong. Used by uptime
  monitors and Render's own health check system.

### Storage
Simple JSON files on disk (`tags.json`, `feedback.json`) — fine for
low-volume testing, **not** durable on Render's free tier (files reset on
every cold-start/restart). Swap for a real database before this matters for
real users (see §9).

---

## 4. Architecture

### App structure
```
app/                          Expo Router screens (thin — wire UI to stores/services)
├── _layout.tsx                Root: local profile bootstrap, splash screen
├── index.tsx                  Redirects to (app)/trips once ready
└── (app)/
    ├── _layout.tsx             Bottom tabs: Trips / Library / Tags / Profile
    ├── profile.tsx
    ├── trips/                  Trip list, create/edit, detail, check, apply-bundle
    ├── library/                Master items, Packs, Templates
    └── tags/                   Tag list, QR scan/register

src/
├── types/index.ts             All shared TypeScript models
├── store/                     Zustand stores, each persisted via AsyncStorage
│   ├── authStore.ts            Local profile (no login)
│   ├── tripStore.ts             Trips (+ unique-name check, reminders)
│   ├── itemStore.ts             Packing items
│   ├── tagStore.ts               Registered BLE tags (+ auth verification)
│   ├── masterItemStore.ts        Item library
│   └── bundleStore.ts            Packs & Templates (shared model)
├── services/                  Business logic, no UI dependency
│   ├── bleService.ts            Mock BLE scan
│   ├── readinessService.ts       Ready/Not-Ready calculation (pure function)
│   ├── smartWarningsService.ts   Companion-item advisory rules
│   ├── reminderService.ts        Local notification scheduling
│   ├── qrService.ts              Tag QR payload parsing
│   ├── tagAuthService.ts         Calls backend to verify tag authenticity
│   ├── aiSuggestionService.ts    Calls backend for AI suggestions/feedback
│   ├── duplicateTrip.ts          Trip cloning
│   ├── applyBundleToTrip.ts      Pack/Template → trip items
│   ├── applyAlwaysCarryItems.ts  Auto-add always-carry items to new trips
│   └── seedStarterTemplates.ts   One-time starter template seeding
└── components/                Reusable UI pieces
```

### Backend structure
```
tag-auth-backend-example/
├── server.js          Express app, all routes
├── tagSigning.js       HMAC sign/verify logic
├── db.js               Tag storage (JSON file)
├── feedbackDb.js        AI feedback storage (JSON file)
├── ai.js                Suggestion generation (LLM + baseline fallback)
└── scripts/provisionTag.js   CLI helper to provision a physical tag
```

---

## 5. Local Setup — Backend

```bash
cd tag-auth-backend-example
npm install
cp .env.example .env
```

Generate two secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Run it twice, paste one result into `TAG_SIGNING_SECRET`, the other into
`ADMIN_API_KEY` in `.env`.

```bash
npm start
```
Server runs at `http://localhost:3000`.

---

## 6. Local Setup — App

```bash
cd readygo
npm install
cp .env.example .env
```
Edit `.env`:
```
EXPO_PUBLIC_TAG_AUTH_API_URL=http://YOUR_LAN_IP:3000
```
(Use your computer's LAN IP, not `localhost` — your phone needs to reach it
over Wi-Fi. Find it with `ipconfig` on Windows.)

```bash
npx expo start
```
Scan the QR with Expo Go **only if** you haven't built a custom dev client
yet (see §8 for why a custom client is actually required for this project).

---

## 7. Setting Up AI Suggestions (Anthropic API key)

1. Go to **https://console.anthropic.com/** and sign in / sign up.
2. Left sidebar → **API Keys** → **Create Key**. Copy it immediately (`sk-ant-...`)
   — you can't view it again later.
3. **Settings → Billing** → add a payment method (pay-as-you-go; this app's
   usage is a fraction of a cent per request with Sonnet).
4. In the backend's `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
   ```
5. Restart the backend (`npm start`). Test by tapping "Get AI Suggestions"
   in the app on a trip with a destination set — you should see specific,
   destination-aware suggestions instead of the generic fallback.

**Without this key set**, AI Suggestions still works, just with a small
static baseline list ("Phone charger", "Universal power adapter") instead
of real LLM-generated ones — the feature never breaks, it just degrades.

---

## 8. Building & Running the App on a Real Device

### Why Expo Go doesn't work for this project
Expo Go is a generic, pre-built app bundling every common native module
"just in case" — including `react-native-worklets`, which has a known
native crash (`SIGSEGV`) on certain devices/Android versions when combined
with this Expo SDK. This app doesn't even use worklets/reanimated, but
Expo Go includes it regardless. **The fix: build your own custom client.**

### One-time: build your custom client
```bash
npx expo install expo-dev-client
eas login
eas build --profile development --platform android
```
Install the resulting APK on your phone (uninstall Expo Go's version of
testing this project if present). This is your own app — only bundles what
`package.json` actually lists, so the worklets crash structurally can't
happen.

### Day-to-day development
```bash
npx expo start --dev-client
```
Open **your custom client app** (not Expo Go) → its own "Scan QR code"
option → scan the terminal's QR. JS changes hot-reload same as Expo Go did.

### Sharing a standalone build (no Metro, no laptop needed)
```bash
eas build --profile preview --platform android
```
This produces a **fully standalone app** — no dev server connection needed
at all. Share the install link directly; recipients just need "install
from unknown sources" enabled once.

### Important: `eas build` does NOT read your local `.env`
Cloud builds run on Expo's servers, which never see your local `.env` file
— that's only read by `eas update`/`npx expo start` (which run on your
machine). For any `eas build`, register the variable with EAS directly:
```bash
eas env:create --name EXPO_PUBLIC_TAG_AUTH_API_URL --value https://your-backend-url --environment preview --visibility plaintext
```
Repeat with `--environment production` if/when you use that profile too.
Verify with `eas env:list --environment preview`.

### Publishing JS-only updates after a build exists
```bash
eas update --branch preview --message "what changed" --platform android
eas update --branch preview --message "what changed" --platform ios
```
Anyone with your build installed picks up the update automatically next
time they fully close and reopen the app — no new install needed. Get the
shareable link/QR at:
```
https://expo.dev/accounts/YOUR_ACCOUNT/projects/readygo/branches/preview
```

### iOS — the one real cost gate
Installing any custom-built app (dev client, preview, or production) on a
physical iPhone requires an **Apple Developer Program membership
($99/year)** — this is an Apple platform rule, not something Expo/EAS can
bypass. Once you have one:
```bash
eas build --profile preview --platform ios
```
Distribute via ad-hoc (device UDIDs registered once) or set up TestFlight
for smoother installs without UDID registration.

---

## 9. Deploying the Backend (Render, free tier)

1. Push `tag-auth-backend-example/` to a GitHub repo.
2. **https://render.com** → sign up (no card) → **New +** → **Web Service**
   → connect the repo.
3. Build command: `npm install` · Start command: `npm start` · Instance: **Free**.
4. Add environment variables: `TAG_SIGNING_SECRET`, `ADMIN_API_KEY`,
   `ANTHROPIC_API_KEY` (optional).
5. **Settings → Health Check Path** → set to `/health`.
6. Deploy → note your live URL (e.g. `https://readygo-backend-dd2t.onrender.com`).

**Free tier trade-offs to know:**
- Sleeps after ~15 min idle; first request after that takes 30-50s to wake.
- Disk storage (`tags.json`, `feedback.json`) is **not persistent** —
  wiped on every restart/redeploy. Fine for testing, not for real
  provisioned tags you need to keep. Fix path: upgrade to a paid plan with
  a persistent disk, or swap the JSON-file storage for a real database.
- Optional: set up a free **UptimeRobot** monitor pinging `/health` every
  5-10 min — keeps the service warmer and alerts you by email if it goes down.

---

## 10. Provisioning a Physical Tag

```bash
cd tag-auth-backend-example
npm run provision -- "AA:BB:CC:DD:EE:01" "Nickname"
```
Prints a `qrPayload` JSON string — paste it into any QR generator (plain
text type) and print/display it. Scanning it in the app registers a
cryptographically verified tag.

**For quick testing without real hardware**, use the manual-entry option on
the scan screen with a hand-typed payload like:
```
{"qrCode":"RG-TEST01","bleId":"AA:BB:CC:DD:EE:01","sig":"..."}
```
(only works if it matches a signature your backend actually generated — use
the provision script above rather than inventing one by hand for anything
beyond the unsigned dev/test format).

---

## 11. Environment Variables Reference

### App (`readygo/.env`)
| Variable | Required? | Purpose |
|---|---|---|
| `EXPO_PUBLIC_TAG_AUTH_API_URL` | Yes, for tag auth + AI | Your backend's URL |

### Backend (`tag-auth-backend-example/.env`)
| Variable | Required? | Purpose |
|---|---|---|
| `TAG_SIGNING_SECRET` | Yes | HMAC secret for tag authenticity |
| `ADMIN_API_KEY` | Yes | Protects the tag-provisioning endpoint |
| `PORT` | No (default 3000) | Server port |
| `ANTHROPIC_API_KEY` | No | Enables real AI suggestions (else static fallback) |

---

## 12. Known Issues Hit & Fixed (for future reference)

| Issue | Root cause | Fix |
|---|---|---|
| App crashes instantly in Expo Go | `react-native-worklets` native SIGSEGV, bundled generically by Expo Go regardless of project needs | Switched to a custom dev client (only bundles what's actually used) |
| `npm install` ERESOLVE loops | React version mismatch between project pin and `expo-router`'s internal web tooling | Added `"overrides"` in `package.json` to force one consistent version |
| App stuck on splash forever | Native module (`expo-notifications`) called at module-import time, before the app had mounted | Moved the call inside a function invoked from `useEffect`, not at module scope |
| `"ScreenStackFragment added into a non-stack container"` crash on delete | Deleting a trip caused a header re-render (`navigation.setOptions`) racing with the screen's native teardown | Reordered: navigate away *before* mutating the store; guarded the header effect to skip when the trip is gone |
| Splash image showed cropped/tiny | Android's splash icon area applies its own safe-zone masking; image had no padding and was too information-dense for the icon-only constraint | Rebuilt as: native splash = plain icon only; custom in-app `SplashView` (real React text) handles branding/tagline |
| AI Suggestions "not available" even though backend worked fine | `eas build` (cloud) doesn't read local `.env` — only `eas update`/`expo start` do | Registered the variable with `eas env:create` instead |
| Duplicate trips created on repeated taps | React state-based submit guards have a timing gap — two rapid taps can both pass before the first re-render commits | Added a `useRef`-based synchronous lock, closing the race window entirely |

---

## 13. What's Not Done / Future Work

- **iOS distribution** — needs an Apple Developer Program account to proceed.
- **Backend storage** — JSON files should become a real database before
  real customers/tags depend on data surviving restarts.
- **Real BLE hardware** — `bleService.ts` is fully mocked; swapping to a
  real BLE library (e.g. `react-native-ble-plx`) is a self-contained change
  isolated to that one file.
- **Weather-grounded AI suggestions** — the architecture plan called for
  enriching AI prompts with a real forecast (e.g. via Open-Meteo, free, no
  key required) instead of relying on the model's general seasonal
  knowledge — not yet implemented.
- **Rotating/encrypted BLE identifiers** — current tag authenticity stops
  someone from *forging new* tags, but doesn't prevent cloning one specific
  already-purchased tag's broadcast. A rotating identifier scheme (like
  Apple Find My / Google Eddystone-EID) would close that gap.

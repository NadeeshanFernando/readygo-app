# ReadyGo

Smart packing checklist app that pairs a normal checklist with proprietary
BLE "ReadyGo" tags. Users classify each packing item as **manual** (tap to
check off) or **tagged** (verified automatically by scanning for the item's
paired BLE tag). Version 1 uses **mocked BLE scanning** and **local device
storage** — no backend or real hardware required to run it.

## 1. Project structure

```
readygo/
├── app/                          # Expo Router routes (file-based navigation)
│   ├── _layout.tsx                # Root layout: auth gate, redirects between groups
│   ├── index.tsx                  # "/" entry, redirects to (auth) or (app)
│   ├── (auth)/                    # Unauthenticated routes
│   │   ├── _layout.tsx            # Stack navigator for auth screens
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (app)/                     # Authenticated routes
│       ├── _layout.tsx            # Bottom tab navigator (Trips / Tags / Profile)
│       ├── profile.tsx
│       ├── trips/
│       │   ├── _layout.tsx        # Stack navigator nested inside the Trips tab
│       │   ├── index.tsx          # Trip list
│       │   ├── new.tsx            # Create trip form
│       │   └── [tripId]/
│       │       ├── index.tsx      # Trip detail + checklist
│       │       ├── edit.tsx       # Edit trip form
│       │       ├── add-item.tsx   # Add packing item (manual/tagged)
│       │       └── check.tsx      # "Check Everything" — BLE scan + readiness
│       └── tags/
│           ├── _layout.tsx        # Stack navigator nested inside the Tags tab
│           ├── index.tsx          # Registered tag list
│           └── scan.tsx           # QR scan to register a new tag
│
├── src/
│   ├── types/index.ts             # Shared TypeScript domain models
│   ├── store/                     # Zustand stores (persisted to AsyncStorage)
│   │   ├── authStore.ts
│   │   ├── tripStore.ts
│   │   ├── itemStore.ts
│   │   └── tagStore.ts
│   ├── services/                  # Framework-agnostic business logic
│   │   ├── storage.ts              # AsyncStorage wrapper + Zustand adapter
│   │   ├── bleService.ts           # Mock BLE scanning (swap for real BLE later)
│   │   ├── qrService.ts            # Parses a tag's QR payload
│   │   └── readinessService.ts     # Pure "Check Everything" calculation logic
│   ├── components/                # Reusable presentational components
│   │   ├── TripCard.tsx
│   │   ├── ItemRow.tsx
│   │   ├── TagBadge.tsx
│   │   └── StatusBanner.tsx
│   ├── hooks/
│   │   └── useAuth.ts
│   └── utils/
│       ├── id.ts                  # uuid generation + mock password hashing
│       └── validators.ts          # React Hook Form validation rules
│
├── app.json                       # Expo config (permissions, plugins, icons)
├── babel.config.js                # Enables the "@/..." import alias
├── tsconfig.json
├── package.json
└── README.md
```

**Why this shape:** `app/` only contains route/screen files (thin — they wire
UI to stores/services). All real logic lives in `src/`, decoupled from
navigation, so it's independently testable and easy to port if you ever
migrate off Expo Router.

## 2. TypeScript models

See `src/types/index.ts`: `User`, `Trip`, `PackingItem` (`type: "manual" | "tagged"`),
`ReadyGoTag` (has `qrCode` + `bleId`), `DetectedBleTag`, `ItemCheckResult`, and
`TripReadinessResult`.

## 3. Navigation structure

Expo Router file-based navigation, three levels deep:
- Root `_layout.tsx` — decides `(auth)` vs `(app)` based on `useAuth()`.
- `(auth)` — a `Stack` with `login` / `register`.
- `(app)` — a `Tabs` navigator with **Trips**, **Tags**, **Profile**.
  - `trips/` and `tags/` each nest their own `Stack` so pushing into trip
    detail, edit, add-item, or check screens keeps the tab bar visible.

## 4. Main screens

| Screen | Path | Purpose |
|---|---|---|
| Login / Register | `(auth)/login.tsx`, `(auth)/register.tsx` | Local mock auth via React Hook Form |
| Trip list | `(app)/trips/index.tsx` | Lists the user's trips |
| New / Edit trip | `(app)/trips/new.tsx`, `[tripId]/edit.tsx` | Create/update trip metadata |
| Trip detail | `(app)/trips/[tripId]/index.tsx` | Checklist, add item, delete trip, launch check |
| Add item | `(app)/trips/[tripId]/add-item.tsx` | Classify item manual vs tagged, assign a tag |
| Check Everything | `(app)/trips/[tripId]/check.tsx` | Runs mock BLE scan, shows Ready/Not Ready |
| Tag list | `(app)/tags/index.tsx` | Lists registered ReadyGo tags |
| Scan tag | `(app)/tags/scan.tsx` | QR scan (camera) or manual entry to register a tag |
| Profile | `(app)/profile.tsx` | Account info + logout |

## 5. State management (Zustand)

Four independent stores, each persisted to `AsyncStorage` via Zustand's
`persist` middleware (see `src/services/storage.ts` for the adapter):

- **authStore** — current session + a local "users table" for register/login.
- **tripStore** — CRUD for trips, scoped per user.
- **itemStore** — CRUD for packing items, including manual-check toggling
  and tag assignment/unassignment.
- **tagStore** — CRUD for registered ReadyGo tags.

Stores are intentionally separate (rather than one giant store) so screens
only subscribe to what they need and re-render minimally.

## 6. Mock BLE scanning service

`src/services/bleService.ts` exposes `scanForTags(options, onTagDetected)`,
matching the shape a real `react-native-ble-plx`-based implementation would
have. It simulates a scan duration, "detects" a random ~70% subset of the
tags relevant to the current trip (or a forced list, useful for testing),
and streams detections via the `onTagDetected` callback as well as resolving
with the full list. **Swapping to real BLE later only means rewriting the
body of this one file.**

## 7. QR registration flow

1. User taps **Register Tag** on the Tags screen → `(app)/tags/scan.tsx`.
2. Camera opens (`expo-camera`'s `CameraView` with QR barcode scanning).
3. On scan, `qrService.parseTagQrPayload()` decodes the tag's payload
   (expects `{ "qrCode": "...", "bleId": "..." }` JSON, with a `qrCode|bleId`
   fallback format for quick test codes).
4. `tagStore.registerTag()` saves the tag (rejects duplicates by `qrCode`).
5. A manual-entry fallback is included for devices without camera access or
   for typing in a test payload directly.

Later, in `add-item.tsx`, users pick from their unassigned registered tags
to link a **tagged** item to a physical tag.

## 8. Trip readiness calculation logic

`src/services/readinessService.ts` is pure logic, no UI or storage
dependencies:

- `evaluateItem(item, tagsById, detectedBleIds)` — manual items are
  satisfied if `manualChecked`; tagged items are satisfied only if they have
  an assigned tag **and** that tag's `bleId` appears in the detected set.
- `calculateTripReadiness(tripId, items, tags, detectedTags)` — evaluates
  every item, collects `missingItems`, and returns `"ready"` only if nothing
  is missing.

The `check.tsx` screen calls `scanForTags()`, then feeds the result into
`calculateTripReadiness()` and renders `<StatusBanner>` (✅ Ready / ⚠️ Not
Ready) plus a per-item breakdown of why anything is still missing.

## 10. Trip dates, start time & "Check Everything" reminders

- **Date picker** — `src/components/DateField.tsx` wraps
  `@react-native-community/datetimepicker` behind a simple tappable field
  (opens the native calendar UI on iOS/Android) and stores dates as
  `"YYYY-MM-DD"` strings on the `Trip` model. Used in both `trips/new.tsx`
  and `trips/[tripId]/edit.tsx`. The end-date picker's `minimumDate` is tied
  to whatever start date is currently selected.
- **Start time (optional)** — `src/components/TimeField.tsx` wraps the same
  picker in `mode="time"` and stores a `"HH:mm"` string on `Trip.startTime`.
  It only appears once a start date is picked, and is entirely optional: if
  left blank, everything defaults to **09:00** on the start date. Setting a
  real departure time (e.g. a 6:45 AM flight) makes lead-time reminders
  accurate to the actual moment you need to be ready, instead of an
  assumed generic morning. `src/utils/reminderFormat.ts`'s
  `getTripStartDateTime(startDate, startTime)` is the single place this
  date+time combination gets built, so `reminderService.ts` and the trip
  forms always agree on the anchor moment.
- **Reminders** — `src/services/reminderService.ts` uses `expo-notifications`
  to schedule a **local, on-device** notification ("Run Check Everything for
  {trip}") a configurable lead time before the trip's actual start moment
  (start date + start time, or 09:00 if no time was set), stored as
  `reminderMinutesBefore` on the trip for minute-level precision. The lead
  time is fully customizable per trip via `src/components/ReminderTimingField.tsx`,
  which offers quick presets (1h, 3h, 6h, 12h, 1 day, 2 days, 1 week) plus a
  "Custom" option with a unit toggle — **Minutes / Hours / Days / Weeks /
  Months** — so you can enter things like "90 minutes", "36 hours", "2 weeks",
  or "3 months" directly. Months are approximated as 30 days. Defaults to
  1 day if untouched. `formatReminderLeadTime()` formats the stored
  minutes back into a short readable string (e.g. "90 min", "6h", "1 day")
  for display.
  - **Validation** — `minutesUntilTripStart()` computes how long remains
    until the trip's actual start moment. The picker uses this to:
    - Gray out and disable any preset that would fire in the past (e.g. "1
      week" is disabled if the trip starts tomorrow).
    - Reject an out-of-range custom entry with an inline message — e.g. "That's
      more time than you have — this trip starts in 18h. Pick a shorter
      reminder time." — without changing the previously valid selection.
    - Show a friendly banner ("This trip's start date/time has already
      passed…") and disable the whole reminder field if the start date is
      already in the past.
    - Flag it clearly if a previously chosen value stops fitting after the
      user changes the start date (or time) to something sooner.
  - As a last safety net, both `new.tsx` and `edit.tsx` also clamp the
    reminder minutes to the available window right before saving, in case
    time passed while the form was open.
  - `tripStore.addTrip` / `updateTrip` call `rescheduleTripReminder()` any
    time a trip is created/edited, storing the resulting notification id on
    the trip so it can be cancelled or replaced later.
  - `tripStore.deleteTrip` cancels any pending reminder before removing the trip.
  - A toggle switch appears on the trip form once a start date is picked,
    letting the user turn the reminder on/off for that trip; the timing
    picker only shows while the reminder is enabled.
  - Notification permission is requested the first time a reminder is scheduled.
  - Notification scheduling is defensive against `expo-notifications`
    version differences (some expose `SchedulableTriggerInputTypes`, older
    ones don't) and never throws out of `addTrip`/`updateTrip` — a
    scheduling failure just means no reminder gets set, logged as a warning.
  - Scheduling is never silent: `Trip.reminderStatus` and
    `Trip.reminderScheduledFor` are persisted with every trip, and:
    - Saving a trip shows an `Alert` confirming exactly when the reminder
      will fire, or explaining why it didn't (permission denied, in the
      past, or an error).
    - The trip detail screen shows a small persistent badge with the same
      information, so you can check it any time without re-saving.
    - The Custom lead-time input reconstructs the most natural unit from a
      raw minutes value (e.g. 300 minutes displays as "5" + "Hours", not
      "300" + "Minutes") via `guessUnitAndValue()` in
      `ReminderTimingField.tsx`, so editing a trip shows the value close to
      how you originally entered it.

### Troubleshooting: "my reminder never fired"

1. **Check the trip detail badge** — it tells you whether the reminder is
   actually scheduled, and for exactly when. If it says permission was
   denied or scheduling failed, that's your answer immediately.
2. **Send a test notification** — Profile tab → "Send test notification
   (10s)". This fires a notification with no trip involved, 10 seconds
   later, so you can confirm local notifications work on this device/build
   at all before troubleshooting anything trip-specific.
3. **Expo Go vs. a development build** — local notification behavior can
   differ between Expo Go and a custom dev client, especially on Android
   (background/killed-app delivery, Doze mode, channel handling). If the
   test notification in step 2 doesn't arrive, try a development build:
   ```bash
   npx expo install expo-dev-client
   npx expo run:android   # or: npx expo run:ios
   ```
4. **Notification permission** — make sure ReadyGo has notification
   permission in your device's system Settings; the in-app prompt only
   appears once and won't re-ask if previously denied.
5. **Version mismatch** — confirm the resolved `expo-notifications` version
   matches what your Expo SDK expects:
   ```bash
   npx expo install expo-notifications --check
   ```

## 11. Setup instructions

**Prerequisites:** Node.js 18+, npm or yarn, and either the Expo Go app on
your phone or an iOS/Android simulator. A Mac is only required for iOS
simulator builds.

**Already have the project installed and just pulled these changes?** Install
the two new native packages with `expo install` (not plain `npm install`) so
Expo picks compatible versions for your SDK:

```bash
npx expo install @react-native-community/datetimepicker expo-notifications expo-device
```

```bash
# 1. Create the project directory and copy in all files from this scaffold,
#    preserving the folder structure shown above.

# 2. Install dependencies
cd readygo
npm install

# 3. (iOS/Android native features like camera need a dev build if you're
#    not using Expo Go — Expo Go works fine for this app in v1.)

# 4. Start the dev server
npx expo start

# 5. Run on a device/simulator
#    - Press "i" for iOS simulator
#    - Press "a" for Android emulator
#    - Or scan the QR code with the Expo Go app on your phone
```

**Testing the QR flow without a physical tag:** use any QR generator (e.g.
an online QR code tool) to encode this JSON payload, then scan it:

```json
{"qrCode":"RG-TEST01","bleId":"AA:BB:CC:DD:EE:01"}
```

Or use the in-app "Enter code manually instead" link and type:
`RG-TEST01|AA:BB:CC:DD:EE:01`

**Typical flow to try end-to-end:**
1. Register → creates a local account.
2. Tags tab → Register Tag → scan/enter a test payload.
3. Trips tab → New Trip → fill in a title → Create.
4. Inside the trip → Add Item → make one "Manual checklist" item and one
   "Tagged essential" item assigned to the tag you just registered.
5. Back on the trip → **Check Everything** → watch the mock scan run →
   see the Ready/Not Ready result (tagged item passes ~70% of the time by
   design, to simulate real-world BLE range — check off the manual item and
   re-scan until you see "Ready to go!").

## 12. Tag authenticity (anti-cloning)

Generic BLE beacons broadcast their identifier in plain, unencrypted radio —
anyone with a BLE scanner app can read and clone one. So checking "does this
look like our format" client-side only stops casual copying, not a
motivated clone. Real protection requires a secret that never ships inside
the app.

**How it works:**
- At manufacturing time, `tag-auth-backend-example/` (a separate small
  server, deployed by you) computes `sig = HMAC-SHA256(SECRET, qrCode + bleId)`
  for each physical tag and returns a QR payload like
  `{"qrCode":"RG-4F2A9C","bleId":"...","sig":"..."}`.
- `src/services/qrService.ts` parses the optional `sig` field out of scanned
  QR payloads.
- `src/services/tagAuthService.ts` sends `{qrCode, bleId, sig}` to your
  backend's `POST /api/tags/verify` and only proceeds if it comes back valid.
  **The signing secret never exists inside the app** — it can't be extracted
  from the bundle because it was never put there.
- `tagStore.registerTag()` is now async and calls this verification before
  creating a local tag record; a failed/forged signature throws
  `TagRegistrationError` with a user-facing message, and the Tags list shows
  a "Verified genuine" vs "Unverified" badge on every tag (`authStatus`
  field on `ReadyGoTag`).
- If `EXPO_PUBLIC_TAG_AUTH_API_URL` isn't set, the app falls back to an
  **insecure local HMAC check** (via `js-sha256`) purely so development can
  continue before your backend is deployed — this must never ship to real
  users; it's explicitly logged as a warning when active.
- The old unsigned `qrCode|bleId` format still parses (marked `"unsigned"`),
  kept for quick dev/test QR codes — genuine tags should always use the
  signed JSON format.

**Deploying the real backend:** see `tag-auth-backend-example/README.md` —
covers generating secrets, provisioning your first physical tag via
`npm run provision`, and what to harden before real customers use it
(real database, HTTPS, rate limiting).

## Next steps beyond v1

- Replace `bleService.ts` with a real `react-native-ble-plx` (or similar)
  integration — the function signature is designed to make this a drop-in swap.
- Replace local mock auth in `authStore.ts` with a real backend (Auth0,
  Firebase Auth, Supabase, or your own API) and proper password hashing.
- Add a backend API + sync so trips/items/tags aren't device-local only.
- Local "Check Everything" reminders are in place; a future version could
  add **remote push** reminders (e.g. server-triggered nudges) via
  `expo-notifications`' push token flow, on top of the local scheduling
  already implemented.

## 13. Reducing repetitive checklist work (Master Library, Always Carry, Packs, Templates, Duplicate Trip, Smart Warnings, AI Suggestions)

Full architecture rationale lives in `readygo-repetition-reduction-plan.md`
(delivered separately) — this section covers what's actually wired up.

- **Master Item Library** (`src/store/masterItemStore.ts`) — canonical item
  records (`MasterItem`). Typing a new item name on the trip Add Item screen
  auto-saves it to the library (toggle to opt out); typing an existing name
  shows autocomplete suggestions that prefill type/quantity/notes. Manage
  directly from the new **Library** tab → *Items* segment.
- **Always Carry** — a flag on `MasterItem`, toggled from the Library or the
  item's edit screen. `applyAlwaysCarryItems.ts` runs automatically inside
  `tripStore.addTrip()` for every newly created trip.
- **Packs & Templates** — one shared `Bundle` model (`src/store/bundleStore.ts`,
  `kind: "pack" | "template"`) so both features reuse the same store, editor
  screens, and `applyBundleToTrip.ts` apply logic. Manage from the Library
  tab's *Packs*/*Templates* segments; apply to any trip via **+ Add Item →
  Pack or Template** on the trip detail screen. Seven starter templates
  (Office, Beach, Business, Camping, Airport, Weekend, International) are
  seeded once per user (`seedStarterTemplates.ts`) — fully editable/deletable.
- **Duplicate Trip** (`src/services/duplicateTrip.ts`) — "Duplicate this
  trip" link on the trip detail screen clones title/notes/items/tag
  assignments, clears dates/reminder, and lands you on the Edit screen to
  set fresh dates.
- **Smart Warnings** (`src/services/smartWarningsService.ts`) — a static
  companion-item rules table (e.g. laptop→charger, camera→battery) plus one
  trip-context rule (airport trip→passport). Evaluated alongside (never
  inside) `readinessService.calculateTripReadiness()` and rendered as a
  distinct amber "Heads up" section on the Check Everything screen —
  advisory only, never affects the Ready/Not Ready BLE result.
- **AI Suggestions & Learning AI** (`src/services/aiSuggestionService.ts`) —
  "✨ Get AI Suggestions" button on the trip detail screen (shown once a
  destination is set). Requires the backend in `tag-auth-backend-example/`
  (now with two more endpoints, `/api/ai/suggestions` and `/api/ai/feedback`)
  — set `ANTHROPIC_API_KEY` there for real LLM-generated, destination-aware
  suggestions, or leave unset for a small static baseline. Accept/reject
  feedback is recorded per-user; after 3+ rejections with no accepts, an
  item stops being suggested — a free heuristic layer that runs before any
  LLM call. Entirely optional: with no backend configured, the button
  degrades to an inline "not available" message rather than breaking anything.

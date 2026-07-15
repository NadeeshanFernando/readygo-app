// src/config/featureFlags.ts
//
// Central place to toggle features on/off without deleting any code.
// Everything the BLE tag feature touches (Tags tab, "Tagged essential"
// item type, seeded template items, applying packs/templates) checks this
// one flag. Flip it back to `true` for Stage 2 — no other code changes
// needed anywhere.

export const BLE_TAGS_ENABLED = false;

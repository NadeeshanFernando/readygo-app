// src/services/applyAlwaysCarryItems.ts
//
// Feature 2 (Always Carry). Called once, right after a trip is created —
// same pattern as tripStore.addTrip already uses to schedule the trip
// reminder as a post-creation side effect.

import { useMasterItemStore } from "@/store/masterItemStore";
import { useItemStore } from "@/store/itemStore";
import { BLE_TAGS_ENABLED } from "@/config/featureFlags";

export function applyAlwaysCarryItems(userId: string, tripId: string): number {
  const alwaysCarryItems = useMasterItemStore
    .getState()
    .getMasterItemsForUser(userId)
    .filter((m) => m.alwaysCarry);

  for (const masterItem of alwaysCarryItems) {
    useItemStore.getState().addItem({
      tripId,
      name: masterItem.name,
      // Defensive: coerce to "manual" while BLE tags are disabled, same as
      // applyBundleToTrip.ts — no way to assign a tag otherwise.
      type: BLE_TAGS_ENABLED ? masterItem.defaultType : "manual",
      quantity: masterItem.defaultQuantity,
      notes: masterItem.defaultNotes,
      masterItemId: masterItem.id
    });
    useMasterItemStore.getState().incrementUsage(masterItem.id);
  }

  return alwaysCarryItems.length;
}

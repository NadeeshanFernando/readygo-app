// src/services/applyAlwaysCarryItems.ts
//
// Feature 2 (Always Carry). Called once, right after a trip is created —
// same pattern as tripStore.addTrip already uses to schedule the trip
// reminder as a post-creation side effect.

import { useMasterItemStore } from "@/store/masterItemStore";
import { useItemStore } from "@/store/itemStore";

export function applyAlwaysCarryItems(userId: string, tripId: string): number {
  const alwaysCarryItems = useMasterItemStore
    .getState()
    .getMasterItemsForUser(userId)
    .filter((m) => m.alwaysCarry);

  for (const masterItem of alwaysCarryItems) {
    useItemStore.getState().addItem({
      tripId,
      name: masterItem.name,
      type: masterItem.defaultType,
      quantity: masterItem.defaultQuantity,
      notes: masterItem.defaultNotes,
      masterItemId: masterItem.id
    });
    useMasterItemStore.getState().incrementUsage(masterItem.id);
  }

  return alwaysCarryItems.length;
}

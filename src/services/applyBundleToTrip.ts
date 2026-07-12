// src/services/applyBundleToTrip.ts
//
// Shared "apply to trip" logic for both Packs and Templates — one code
// path, since they're the same underlying Bundle structure. Same
// cross-store orchestration pattern as duplicateTrip.ts.

import { useBundleStore } from "@/store/bundleStore";
import { useItemStore } from "@/store/itemStore";
import { useMasterItemStore } from "@/store/masterItemStore";

export interface ApplyBundleResult {
  addedCount: number;
  skippedCount: number; // items already present on this trip (by masterItemId), not re-added
}

/**
 * Adds every item in the given Bundle to the given trip. Skips a bundle
 * item if a PackingItem with the same masterItemId already exists on this
 * trip, rather than silently creating duplicates if a Pack/Template gets
 * applied twice.
 */
export function applyBundleToTrip(bundleId: string, tripId: string): ApplyBundleResult {
  const bundleItems = useBundleStore.getState().getBundleItems(bundleId);
  const existingItems = useItemStore.getState().getItemsForTrip(tripId);
  const existingMasterItemIds = new Set(existingItems.map((i) => i.masterItemId).filter(Boolean));

  let addedCount = 0;
  let skippedCount = 0;

  for (const bundleItem of bundleItems) {
    if (existingMasterItemIds.has(bundleItem.masterItemId)) {
      skippedCount += 1;
      continue;
    }

    const masterItem = useMasterItemStore.getState().getMasterItem(bundleItem.masterItemId);
    if (!masterItem) continue; // master item was deleted since the bundle referenced it

    useItemStore.getState().addItem({
      tripId,
      name: masterItem.name,
      type: masterItem.defaultType,
      quantity: bundleItem.quantity,
      notes: bundleItem.notes ?? masterItem.defaultNotes,
      masterItemId: masterItem.id
      // tagId intentionally omitted — a physical tag can only be on one
      // trip's item at a time, so tagged items always need a fresh
      // per-trip tag assignment even when applied from a bundle.
    });

    useMasterItemStore.getState().incrementUsage(masterItem.id);
    addedCount += 1;
  }

  return { addedCount, skippedCount };
}

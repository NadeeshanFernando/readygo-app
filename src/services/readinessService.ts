// src/services/readinessService.ts
//
// Pure business logic for the "Check Everything" flow.
// Deliberately has NO dependency on React, Zustand, or Expo APIs so it can
// be unit tested in isolation and reused if the app's UI layer changes.

import {
  DetectedBleTag,
  ItemCheckResult,
  PackingItem,
  ReadyGoTag,
  TripReadinessResult
} from "@/types";

/**
 * Evaluate a single packing item against the current state:
 * - manual items are satisfied if the user has checked them off
 * - tagged items are satisfied if their assigned tag's bleId was detected nearby
 */
export function evaluateItem(
  item: PackingItem,
  tagsById: Record<string, ReadyGoTag>,
  detectedBleIds: Set<string>
): ItemCheckResult {
  if (item.type === "manual") {
    return {
      item,
      isSatisfied: !!item.manualChecked,
      reason: item.manualChecked ? "ok" : "manual_unchecked"
    };
  }

  // Tagged item
  if (!item.tagId) {
    return { item, isSatisfied: false, reason: "tag_not_assigned" };
  }

  const tag = tagsById[item.tagId];
  if (!tag) {
    return { item, isSatisfied: false, reason: "tag_not_assigned" };
  }

  const detected = detectedBleIds.has(tag.bleId);
  return {
    item,
    isSatisfied: detected,
    reason: detected ? "ok" : "tag_not_detected"
  };
}

/**
 * Compute the full readiness result for a trip: evaluates every item,
 * collects missing items, and rolls up a final ready / not_ready status.
 */
export function calculateTripReadiness(
  tripId: string,
  items: PackingItem[],
  tags: ReadyGoTag[],
  detectedTags: DetectedBleTag[]
): TripReadinessResult {
  const tagsById = Object.fromEntries(tags.map((t) => [t.id, t]));
  const detectedBleIds = new Set(detectedTags.map((d) => d.bleId));

  const results = items.map((item) => evaluateItem(item, tagsById, detectedBleIds));
  const missingItems = results.filter((r) => !r.isSatisfied).map((r) => r.item);

  return {
    tripId,
    status: missingItems.length === 0 ? "ready" : "not_ready",
    checkedAt: new Date().toISOString(),
    results,
    missingItems
  };
}

// src/services/duplicateTrip.ts
//
// Clones an existing trip's items (and tag assignments) into a brand new
// trip — the fix for "I take this same trip every week and hate rebuilding
// the checklist every time." Dates and reminder are intentionally left
// blank on the copy, since those almost always need to change; everything
// else (items, quantities, notes, which physical tag is assigned to which
// item) carries over exactly.
//
// Lives outside any single Zustand store since it needs to orchestrate
// trip + item + tag stores together — same pattern as reminderService
// orchestrating notifications alongside tripStore.

import { useTripStore } from "@/store/tripStore";
import { useItemStore } from "@/store/itemStore";
import { useTagStore } from "@/store/tagStore";
import { Trip } from "@/types";

export async function duplicateTrip(sourceTrip: Trip): Promise<Trip> {
  const sourceItems = useItemStore.getState().getItemsForTrip(sourceTrip.id);

  // New trip: same title/destination/notes, but no dates and no reminder —
  // those need to be set fresh for this occurrence. Always Carry items are
  // skipped here since we're about to copy the source trip's exact items
  // below, which already include any Always Carry items it originally had.
  const newTrip = await useTripStore.getState().addTrip(
    sourceTrip.userId,
    {
      title: sourceTrip.title,
      destination: sourceTrip.destination,
      startDate: undefined,
      startTime: undefined,
      endDate: undefined,
      notes: sourceTrip.notes,
      reminderEnabled: false,
      reminderMinutesBefore: sourceTrip.reminderMinutesBefore
    },
    { skipAlwaysCarry: true }
  );

  // Copy every item over, unchecked, preserving type/quantity/notes/tag/library link.
  for (const sourceItem of sourceItems) {
    const newItem = useItemStore.getState().addItem({
      tripId: newTrip.id,
      name: sourceItem.name,
      type: sourceItem.type,
      quantity: sourceItem.quantity,
      notes: sourceItem.notes,
      tagId: sourceItem.tagId,
      masterItemId: sourceItem.masterItemId
    });

    // If this item had a physical tag assigned, move the tag's "currently
    // assigned to" pointer forward to the new item — the same physical tag
    // is presumably what you'll pack again this time.
    if (sourceItem.tagId) {
      useTagStore.getState().setAssignedItem(sourceItem.tagId, newItem.id);
    }
  }

  return newTrip;
}

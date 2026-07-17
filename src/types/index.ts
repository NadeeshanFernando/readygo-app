// src/types/index.ts
// Core domain models shared across the whole app.

/** A registered user account (locally stored for v1, mocked auth). */
/**
 * A single local device profile — not a real account. ReadyGo is a
 * fully local, single-user-per-device app: no login, no password, no
 * server-side accounts. One of these is created automatically the first
 * time the app runs, and everything (trips, tags, library) is scoped to
 * its `id` under the hood, purely so the existing per-user data model
 * still works without every store needing to change.
 */
export interface User {
  id: string;
  name: string; // editable display name, defaults to "You"
  createdAt: string; // ISO date
}

/** A physical ReadyGo BLE tag that has been registered to a user's account. */
export interface ReadyGoTag {
  id: string; // internal app id
  qrCode: string; // unique code printed/encoded on the tag's QR label
  bleId: string; // BLE identifier (e.g. MAC / UUID) broadcast by the tag
  nickname?: string; // optional friendly name, e.g. "Blue Luggage Tag"
  registeredAt: string; // ISO date
  assignedItemId?: string; // set when this tag is linked to a packing item
  authStatus: "verified" | "unsigned" | "unverified"; // result of tagAuthService's authenticity check at registration time
}

/** How a packing checklist item is verified. */
export type ItemType = "manual" | "tagged";

/** A single packing checklist item within a trip. */
export interface PackingItem {
  id: string;
  tripId: string;
  name: string;
  type: ItemType;
  quantity: number;
  notes?: string;
  // Manual items: user taps to mark checked.
  manualChecked?: boolean;
  // Tagged items: linked to a registered ReadyGoTag id.
  tagId?: string;
  // Links this trip-row back to the reusable library entry it was created
  // from, if any. Optional so items created before this feature shipped
  // keep working unmodified. Editing the MasterItem later never mutates
  // PackingItems already created from it — this is a snapshot at add-time.
  masterItemId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * A reusable, canonical "item definition" that never needs to be recreated.
 * Powers the Master Item Library, the "Always Carry" flag, and is what
 * Packs/Templates (Bundle) reference instead of duplicating item data.
 */
export interface MasterItem {
  id: string;
  userId: string;
  name: string;
  defaultType: ItemType;
  defaultQuantity: number;
  defaultNotes?: string;
  category?: string; // optional, e.g. "Electronics", "Documents" — for future filtering
  alwaysCarry: boolean; // if true, auto-added to every newly created trip
  timesUsed: number; // incremented whenever added to a trip — powers future "frequently packed" learning
  lastUsedAt?: string; // ISO date
  createdAt: string;
  updatedAt: string;
}

/**
 * A named, reusable list of MasterItem references. `kind` distinguishes a
 * Pack (a physical bag/kit, e.g. "Camera Bag") from a Template (a trip-type
 * checklist, e.g. "International") — they're otherwise the exact same
 * structure and share one store/apply-to-trip code path.
 */
export interface Bundle {
  id: string;
  userId: string;
  kind: "pack" | "template";
  name: string;
  icon?: string; // emoji or icon key shown in list UI
  createdAt: string;
  updatedAt: string;
}

/** One MasterItem reference within a Bundle, with its own quantity override. */
export interface BundleItem {
  id: string;
  bundleId: string;
  masterItemId: string;
  quantity: number;
  notes?: string;
}

/**
 * An advisory (non-blocking) warning surfaced alongside the existing
 * Ready/Not Ready BLE check — e.g. "Laptop packed, charger missing."
 * Purely additive: never affects TripReadinessResult.status.
 */
export interface SmartWarning {
  id: string;
  message: string;
  relatedItemNames: string[]; // items involved, for display/grouping
}

/** A trip that groups a set of packing items. */
export interface Trip {
  id: string;
  userId: string;
  title: string;
  destination?: string;
  startDate?: string; // ISO date (YYYY-MM-DD)
  startTime?: string; // "HH:mm" 24h, optional — defaults to "09:00" if unset. Used as the reminder anchor time.
  endDate?: string; // ISO date (YYYY-MM-DD)
  notes?: string;
  // "Check Everything" reminder settings for this trip.
  reminderEnabled?: boolean;
  reminderMinutesBefore?: number; // how many minutes before startDate to fire (supports minute-level precision)
  reminderNotificationId?: string; // id returned by the notification scheduler, used to cancel/reschedule
  reminderStatus?: "scheduled" | "no_start_date" | "in_the_past" | "permission_denied" | "error" | "disabled";
  reminderScheduledFor?: string; // ISO datetime the reminder will actually fire, only set when reminderStatus is "scheduled"
  archived?: boolean; // archived trips are hidden from the main list and don't count toward the free-plan active-trip limit
  createdAt: string;
  updatedAt: string;
}

/** Result of scanning nearby BLE tags (mocked in v1). */
export interface DetectedBleTag {
  bleId: string;
  rssi: number; // signal strength, mocked
  seenAt: string; // ISO date
}

/** Per-item outcome after running the readiness check. */
export interface ItemCheckResult {
  item: PackingItem;
  isSatisfied: boolean;
  reason?: "manual_unchecked" | "tag_not_detected" | "tag_not_assigned" | "ok";
}

/** Aggregate result of the "Check Everything" flow for a trip. */
export interface TripReadinessResult {
  tripId: string;
  status: "ready" | "not_ready";
  checkedAt: string;
  results: ItemCheckResult[];
  missingItems: PackingItem[];
  // Additive advisory layer (Smart Warnings) — never affects `status`.
  advisoryWarnings?: SmartWarning[];
}

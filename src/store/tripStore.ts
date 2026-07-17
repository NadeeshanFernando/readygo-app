// src/store/tripStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Trip } from "@/types";
import { generateId } from "@/utils/id";
import { zustandAsyncStorage } from "@/services/storage";
import { cancelTripReminder, rescheduleTripReminder } from "@/services/reminderService";
import { applyAlwaysCarryItems } from "@/services/applyAlwaysCarryItems";

type AddTripInput = Pick<
  Trip,
  | "title"
  | "destination"
  | "startDate"
  | "startTime"
  | "endDate"
  | "notes"
  | "reminderEnabled"
  | "reminderMinutesBefore"
>;

interface AddTripOptions {
  /**
   * Skips auto-adding Always Carry items. Used internally by duplicateTrip,
   * which already copies the source trip's exact item set — applying
   * Always Carry on top there could double up items or pull in items that
   * weren't actually part of the original trip.
   */
  skipAlwaysCarry?: boolean;
}

interface TripState {
  trips: Trip[];
  addTrip: (userId: string, data: AddTripInput, options?: AddTripOptions) => Promise<Trip>;
  updateTrip: (tripId: string, data: Partial<Omit<Trip, "id" | "userId" | "createdAt">>) => Promise<Trip | undefined>;
  deleteTrip: (tripId: string) => Promise<void>;
  archiveTrip: (tripId: string) => void;
  unarchiveTrip: (tripId: string) => void;
  getTripsForUser: (userId: string) => Trip[];
  /** Excludes archived trips — this is what the main trips list and the free-plan active-trip limit both use. */
  getActiveTripsForUser: (userId: string) => Trip[];
  getArchivedTripsForUser: (userId: string) => Trip[];
  getTrip: (tripId: string) => Trip | undefined;
  /** Case/whitespace-insensitive check, used to enforce unique trip names per user. */
  isTitleTaken: (userId: string, title: string, excludeTripId?: string) => boolean;
  /**
   * Finds a free variant of `baseTitle` for this user — "Kandy", then
   * "Kandy (Copy)", then "Kandy (Copy 2)", etc. Used by duplicateTrip so a
   * duplicated trip never collides with the unique-name rule.
   */
  generateUniqueTitle: (userId: string, baseTitle: string) => string;
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [],

      addTrip: async (userId, data, options) => {
        const now = new Date().toISOString();
        let trip: Trip = {
          id: generateId(),
          userId,
          title: data.title,
          destination: data.destination,
          startDate: data.startDate,
          startTime: data.startTime,
          endDate: data.endDate,
          notes: data.notes,
          reminderEnabled: data.reminderEnabled,
          reminderMinutesBefore: data.reminderMinutesBefore,
          createdAt: now,
          updatedAt: now
        };
        set((state) => ({ trips: [...state.trips, trip] }));

        // Auto-add any "Always Carry" library items (Feature 2) — same
        // post-creation side-effect pattern as the reminder scheduling below.
        if (!options?.skipAlwaysCarry) {
          applyAlwaysCarryItems(userId, trip.id);
        }

        // Schedule the reminder (if requested) and persist the full result
        // (status + fire time), so the UI can show exactly what happened.
        const reminderResult = await rescheduleTripReminder(trip);
        trip = {
          ...trip,
          reminderNotificationId: reminderResult.notificationId,
          reminderStatus: reminderResult.status,
          reminderScheduledFor: reminderResult.scheduledFor
        };
        set((state) => ({
          trips: state.trips.map((t) => (t.id === trip.id ? trip : t))
        }));

        return trip;
      },

      updateTrip: async (tripId, data) => {
        const existing = get().trips.find((t) => t.id === tripId);
        if (!existing) return undefined;

        const updated: Trip = { ...existing, ...data, updatedAt: new Date().toISOString() };

        // Re-evaluate the reminder any time reminder settings or the start date change.
        const reminderResult = await rescheduleTripReminder(updated);
        const finalTrip: Trip = {
          ...updated,
          reminderNotificationId: reminderResult.notificationId,
          reminderStatus: reminderResult.status,
          reminderScheduledFor: reminderResult.scheduledFor
        };

        set((state) => ({
          trips: state.trips.map((t) => (t.id === tripId ? finalTrip : t))
        }));

        return finalTrip;
      },

      deleteTrip: async (tripId) => {
        const existing = get().trips.find((t) => t.id === tripId);
        if (existing?.reminderNotificationId) {
          await cancelTripReminder(existing.reminderNotificationId);
        }
        set((state) => ({ trips: state.trips.filter((t) => t.id !== tripId) }));
      },

      archiveTrip: (tripId) => {
        set((state) => ({
          trips: state.trips.map((t) => (t.id === tripId ? { ...t, archived: true, updatedAt: new Date().toISOString() } : t))
        }));
      },

      unarchiveTrip: (tripId) => {
        set((state) => ({
          trips: state.trips.map((t) => (t.id === tripId ? { ...t, archived: false, updatedAt: new Date().toISOString() } : t))
        }));
      },

      getTripsForUser: (userId) => get().trips.filter((t) => t.userId === userId),

      getActiveTripsForUser: (userId) => get().trips.filter((t) => t.userId === userId && !t.archived),

      getArchivedTripsForUser: (userId) => get().trips.filter((t) => t.userId === userId && t.archived),

      getTrip: (tripId) => get().trips.find((t) => t.id === tripId),

      isTitleTaken: (userId, title, excludeTripId) => {
        const normalized = normalizeTitle(title);
        if (!normalized) return false;
        return get().trips.some(
          (t) => t.userId === userId && t.id !== excludeTripId && normalizeTitle(t.title) === normalized
        );
      },

      generateUniqueTitle: (userId, baseTitle) => {
        const isTaken = (candidate: string) =>
          get().trips.some((t) => t.userId === userId && normalizeTitle(t.title) === normalizeTitle(candidate));

        if (!isTaken(baseTitle)) return baseTitle;

        let attempt = 2;
        let candidate = `${baseTitle} (Copy)`;
        while (isTaken(candidate)) {
          candidate = `${baseTitle} (Copy ${attempt})`;
          attempt += 1;
        }
        return candidate;
      }
    }),
    {
      name: "readygo:trips",
      storage: createJSONStorage(() => zustandAsyncStorage)
    }
  )
);

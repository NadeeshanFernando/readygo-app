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
  getTripsForUser: (userId: string) => Trip[];
  getTrip: (tripId: string) => Trip | undefined;
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

      getTripsForUser: (userId) => get().trips.filter((t) => t.userId === userId),

      getTrip: (tripId) => get().trips.find((t) => t.id === tripId)
    }),
    {
      name: "readygo:trips",
      storage: createJSONStorage(() => zustandAsyncStorage)
    }
  )
);

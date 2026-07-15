// src/store/expiryStore.ts
//
// Lets a build "self-expire" a fixed duration after the person who
// installed it first opens the app — useful for sending a friend a
// temporary test build without needing to manage server-side link expiry.
//
// This is NOT tamper-proof security (clearing app data resets the clock) —
// it's just a friendly, intentional-looking stop for casual test sharing,
// not DRM. Good enough for "let my friend try this for a day."

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandAsyncStorage } from "@/services/storage";

interface ExpiryState {
  firstLaunchAt: string | null;
  isHydrated: boolean;
  setHydrated: () => void;
  /** Records the first-launch timestamp once, if not already set. Safe to call every app start. */
  ensureFirstLaunchRecorded: () => void;
  /** True once more than `durationMs` has passed since first launch. */
  isExpired: (durationMs: number) => boolean;
}

export const useExpiryStore = create<ExpiryState>()(
  persist(
    (set, get) => ({
      firstLaunchAt: null,
      isHydrated: false,

      setHydrated: () => set({ isHydrated: true }),

      ensureFirstLaunchRecorded: () => {
        if (!get().firstLaunchAt) {
          set({ firstLaunchAt: new Date().toISOString() });
        }
      },

      isExpired: (durationMs) => {
        const { firstLaunchAt } = get();
        if (!firstLaunchAt) return false; // hasn't been recorded yet this tick — treat as not expired
        return Date.now() - new Date(firstLaunchAt).getTime() > durationMs;
      }
    }),
    {
      name: "readygo:expiry",
      storage: createJSONStorage(() => zustandAsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      }
    }
  )
);

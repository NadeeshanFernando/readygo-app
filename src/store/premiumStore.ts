// src/store/premiumStore.ts
//
// Holds only what actually needs to be stored: the manual Pro override
// (set by activatePremium(), currently a no-op placeholder until real
// payment exists), monthly AI usage tracking, and whether the welcome
// dialog has been shown.
//
// Deliberately does NOT store firstLaunchDate/trialEndDate/isTrialActive/
// isPremium/premiumType as persisted fields — those are all derived, live,
// from authStore's existing `currentUser.createdAt` (already "first
// launch") combined with this store's `isProManual` flag. See
// premiumService.ts, which is the single place that computes them.
// Storing derived values risks them going stale; computing fresh every
// time never can.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandAsyncStorage } from "@/services/storage";

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

interface PremiumState {
  isHydrated: boolean;
  setHydrated: () => void;

  /** Manual Pro override. Real payment integration later just calls activatePremium() on a successful purchase — nothing else about this store changes. */
  isProManual: boolean;
  activatePremium: () => void;

  /** "YYYY-MM" of the month `aiSuggestionsUsedThisMonth` applies to. */
  currentMonthKey: string | null;
  aiSuggestionsUsedThisMonth: number;
  /** Rolls the counter over to 0 if the calendar month has changed since it was last touched. Safe/cheap to call before every read or write. */
  resetAiUsageIfNewMonth: () => void;
  /** Adds `count` to this month's usage (rolling the month over first if needed). */
  recordAiSuggestionsUsed: (count: number) => void;

  hasSeenWelcomeDialog: boolean;
  markWelcomeDialogSeen: () => void;
}

export const usePremiumStore = create<PremiumState>()(
  persist(
    (set, get) => ({
      isHydrated: false,
      setHydrated: () => set({ isHydrated: true }),

      isProManual: false,
      activatePremium: () => set({ isProManual: true }),

      currentMonthKey: null,
      aiSuggestionsUsedThisMonth: 0,

      resetAiUsageIfNewMonth: () => {
        const nowKey = currentMonthKey();
        if (get().currentMonthKey !== nowKey) {
          set({ currentMonthKey: nowKey, aiSuggestionsUsedThisMonth: 0 });
        }
      },

      recordAiSuggestionsUsed: (count) => {
        get().resetAiUsageIfNewMonth();
        set((state) => ({ aiSuggestionsUsedThisMonth: state.aiSuggestionsUsedThisMonth + count }));
      },

      hasSeenWelcomeDialog: false,
      markWelcomeDialogSeen: () => set({ hasSeenWelcomeDialog: true })
    }),
    {
      name: "readygo:premium",
      storage: createJSONStorage(() => zustandAsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      }
    }
  )
);

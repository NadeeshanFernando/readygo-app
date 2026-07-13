// src/store/authStore.ts
//
// ReadyGo is fully local and single-profile per device — no login, no
// accounts, no passwords. This store just ensures exactly one local
// "profile" exists (created automatically on first launch) so the rest of
// the app's data model (trips/tags/library, all scoped by userId) keeps
// working unchanged, without any sign-in screen ever being shown.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User } from "@/types";
import { generateId } from "@/utils/id";
import { zustandAsyncStorage } from "@/services/storage";

interface AuthState {
  currentUser: User | null;
  isHydrated: boolean;
  setHydrated: () => void;
  /** Creates the local profile once, if it doesn't already exist. Safe to call every app start. */
  ensureLocalUser: () => void;
  updateName: (name: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isHydrated: false,

      setHydrated: () => set({ isHydrated: true }),

      ensureLocalUser: () => {
        if (get().currentUser) return;
        const newUser: User = {
          id: generateId(),
          name: "You",
          createdAt: new Date().toISOString()
        };
        set({ currentUser: newUser });
      },

      updateName: (name) => {
        set((state) => (state.currentUser ? { currentUser: { ...state.currentUser, name } } : state));
      }
    }),
    {
      name: "readygo:auth-session",
      storage: createJSONStorage(() => zustandAsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      }
    }
  )
);

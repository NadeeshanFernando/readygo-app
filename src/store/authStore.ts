// src/store/authStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User } from "@/types";
import { generateId, simpleHash } from "@/utils/id";
import { getItem, setItem, StorageKeys, zustandAsyncStorage } from "@/services/storage";

interface AuthState {
  currentUser: User | null;
  isHydrated: boolean;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setHydrated: () => void;
}

async function getAllUsers(): Promise<User[]> {
  return (await getItem<User[]>(StorageKeys.USERS)) ?? [];
}

async function saveAllUsers(users: User[]): Promise<void> {
  await setItem(StorageKeys.USERS, users);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isHydrated: false,

      register: async (name, email, password) => {
        const users = await getAllUsers();
        const normalizedEmail = email.trim().toLowerCase();

        if (users.some((u) => u.email === normalizedEmail)) {
          throw new Error("An account with this email already exists.");
        }

        const newUser: User = {
          id: generateId(),
          name: name.trim(),
          email: normalizedEmail,
          passwordHash: simpleHash(password),
          createdAt: new Date().toISOString()
        };

        await saveAllUsers([...users, newUser]);
        set({ currentUser: newUser });
      },

      login: async (email, password) => {
        const users = await getAllUsers();
        const normalizedEmail = email.trim().toLowerCase();
        const user = users.find((u) => u.email === normalizedEmail);

        if (!user || user.passwordHash !== simpleHash(password)) {
          throw new Error("Invalid email or password.");
        }

        set({ currentUser: user });
      },

      logout: () => set({ currentUser: null }),

      setHydrated: () => set({ isHydrated: true })
    }),
    {
      name: "readygo:auth-session",
      storage: createJSONStorage(() => zustandAsyncStorage),
      partialize: (state) => ({ currentUser: state.currentUser }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      }
    }
  )
);

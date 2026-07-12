// src/services/storage.ts
// Thin wrapper around AsyncStorage so the rest of the app (and Zustand's
// persist middleware) never touches the raw API directly. Swapping to a
// remote backend later only requires changing this file.

import AsyncStorage from "@react-native-async-storage/async-storage";

export const StorageKeys = {
  AUTH: "readygo:auth",
  USERS: "readygo:users",
  TRIPS: "readygo:trips",
  ITEMS: "readygo:items",
  TAGS: "readygo:tags"
} as const;

export async function getItem<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

/** Storage adapter shape expected by Zustand's `persist` middleware. */
export const zustandAsyncStorage = {
  getItem: async (name: string) => {
    const value = await AsyncStorage.getItem(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string) => {
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string) => {
    await AsyncStorage.removeItem(name);
  }
};

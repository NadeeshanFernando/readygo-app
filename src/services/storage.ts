// src/services/storage.ts
// Thin wrapper around AsyncStorage so the rest of the app (and Zustand's
// persist middleware) never touches the raw API directly. Swapping to a
// remote backend later only requires changing this file.
//
// Every store uses Zustand's `persist` middleware with its own storage
// name (e.g. "readygo:trips"), so the only thing needed here is the
// adapter `persist` expects — no other raw AsyncStorage helpers are used
// anywhere else in the app.

import AsyncStorage from "@react-native-async-storage/async-storage";

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

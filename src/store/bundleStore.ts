// src/store/bundleStore.ts
//
// One store powering both Packs and Templates — they're structurally
// identical (a named list of MasterItem references + quantities), differing
// only in `kind` and how they're labeled/icon'd in the UI. Building them as
// two separate stores would just be duplicated code with no real benefit.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Bundle, BundleItem } from "@/types";
import { generateId } from "@/utils/id";
import { zustandAsyncStorage } from "@/services/storage";

interface BundleState {
  bundles: Bundle[];
  bundleItems: BundleItem[];

  addBundle: (userId: string, kind: Bundle["kind"], name: string, icon?: string) => Bundle;
  renameBundle: (bundleId: string, name: string) => void;
  deleteBundle: (bundleId: string) => void;

  addBundleItem: (bundleId: string, masterItemId: string, quantity?: number, notes?: string) => BundleItem;
  removeBundleItem: (bundleItemId: string) => void;
  updateBundleItemQuantity: (bundleItemId: string, quantity: number) => void;

  getBundlesForUser: (userId: string, kind?: Bundle["kind"]) => Bundle[];
  getBundle: (bundleId: string) => Bundle | undefined;
  getBundleItems: (bundleId: string) => BundleItem[];
}

export const useBundleStore = create<BundleState>()(
  persist(
    (set, get) => ({
      bundles: [],
      bundleItems: [],

      addBundle: (userId, kind, name, icon) => {
        const now = new Date().toISOString();
        const bundle: Bundle = { id: generateId(), userId, kind, name: name.trim(), icon, createdAt: now, updatedAt: now };
        set((state) => ({ bundles: [...state.bundles, bundle] }));
        return bundle;
      },

      renameBundle: (bundleId, name) => {
        set((state) => ({
          bundles: state.bundles.map((b) => (b.id === bundleId ? { ...b, name, updatedAt: new Date().toISOString() } : b))
        }));
      },

      deleteBundle: (bundleId) => {
        set((state) => ({
          bundles: state.bundles.filter((b) => b.id !== bundleId),
          bundleItems: state.bundleItems.filter((bi) => bi.bundleId !== bundleId)
        }));
      },

      addBundleItem: (bundleId, masterItemId, quantity = 1, notes) => {
        const bundleItem: BundleItem = { id: generateId(), bundleId, masterItemId, quantity, notes };
        set((state) => ({ bundleItems: [...state.bundleItems, bundleItem] }));
        return bundleItem;
      },

      removeBundleItem: (bundleItemId) => {
        set((state) => ({ bundleItems: state.bundleItems.filter((bi) => bi.id !== bundleItemId) }));
      },

      updateBundleItemQuantity: (bundleItemId, quantity) => {
        set((state) => ({
          bundleItems: state.bundleItems.map((bi) => (bi.id === bundleItemId ? { ...bi, quantity } : bi))
        }));
      },

      getBundlesForUser: (userId, kind) =>
        get().bundles.filter((b) => b.userId === userId && (!kind || b.kind === kind)),

      getBundle: (bundleId) => get().bundles.find((b) => b.id === bundleId),

      getBundleItems: (bundleId) => get().bundleItems.filter((bi) => bi.bundleId === bundleId)
    }),
    {
      name: "readygo:bundles",
      storage: createJSONStorage(() => zustandAsyncStorage)
    }
  )
);

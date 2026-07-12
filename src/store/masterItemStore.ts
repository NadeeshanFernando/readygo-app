// src/store/masterItemStore.ts
//
// The canonical "what is this item" record. Every PackingItem should
// eventually reference one of these instead of duplicating name/type/notes,
// so nothing ever needs to be typed twice. Also where the "Always Carry"
// flag (Feature 2) lives — it's just a boolean here, not a separate table.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ItemType, MasterItem } from "@/types";
import { generateId } from "@/utils/id";
import { zustandAsyncStorage } from "@/services/storage";

interface AddMasterItemInput {
  userId: string;
  name: string;
  defaultType: ItemType;
  defaultQuantity?: number;
  defaultNotes?: string;
  category?: string;
  alwaysCarry?: boolean;
}

interface MasterItemState {
  masterItems: MasterItem[];
  addMasterItem: (input: AddMasterItemInput) => MasterItem;
  updateMasterItem: (id: string, data: Partial<Omit<MasterItem, "id" | "userId" | "createdAt">>) => void;
  deleteMasterItem: (id: string) => void;
  toggleAlwaysCarry: (id: string) => void;
  incrementUsage: (id: string) => void;
  getMasterItemsForUser: (userId: string) => MasterItem[];
  getMasterItem: (id: string) => MasterItem | undefined;
  /** Case/whitespace-insensitive lookup, used for autocomplete + dedupe when typing a new item name. */
  findByName: (userId: string, name: string) => MasterItem[];
}

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

export const useMasterItemStore = create<MasterItemState>()(
  persist(
    (set, get) => ({
      masterItems: [],

      addMasterItem: (input) => {
        const now = new Date().toISOString();
        const item: MasterItem = {
          id: generateId(),
          userId: input.userId,
          name: input.name.trim(),
          defaultType: input.defaultType,
          defaultQuantity: input.defaultQuantity ?? 1,
          defaultNotes: input.defaultNotes,
          category: input.category,
          alwaysCarry: input.alwaysCarry ?? false,
          timesUsed: 0,
          createdAt: now,
          updatedAt: now
        };
        set((state) => ({ masterItems: [...state.masterItems, item] }));
        return item;
      },

      updateMasterItem: (id, data) => {
        set((state) => ({
          masterItems: state.masterItems.map((m) =>
            m.id === id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m
          )
        }));
      },

      deleteMasterItem: (id) => {
        set((state) => ({ masterItems: state.masterItems.filter((m) => m.id !== id) }));
      },

      toggleAlwaysCarry: (id) => {
        set((state) => ({
          masterItems: state.masterItems.map((m) =>
            m.id === id ? { ...m, alwaysCarry: !m.alwaysCarry, updatedAt: new Date().toISOString() } : m
          )
        }));
      },

      incrementUsage: (id) => {
        set((state) => ({
          masterItems: state.masterItems.map((m) =>
            m.id === id ? { ...m, timesUsed: m.timesUsed + 1, lastUsedAt: new Date().toISOString() } : m
          )
        }));
      },

      getMasterItemsForUser: (userId) => get().masterItems.filter((m) => m.userId === userId),

      getMasterItem: (id) => get().masterItems.find((m) => m.id === id),

      findByName: (userId, name) => {
        const query = normalize(name);
        if (!query) return [];
        return get().masterItems.filter((m) => m.userId === userId && normalize(m.name).includes(query));
      }
    }),
    {
      name: "readygo:masterItems",
      storage: createJSONStorage(() => zustandAsyncStorage)
    }
  )
);

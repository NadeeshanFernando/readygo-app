// src/store/itemStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ItemType, PackingItem } from "@/types";
import { generateId } from "@/utils/id";
import { zustandAsyncStorage } from "@/services/storage";

interface AddItemInput {
  tripId: string;
  name: string;
  type: ItemType;
  quantity: number;
  notes?: string;
  tagId?: string;
  masterItemId?: string;
}

interface ItemState {
  items: PackingItem[];
  addItem: (input: AddItemInput) => PackingItem;
  updateItem: (itemId: string, data: Partial<Omit<PackingItem, "id" | "tripId" | "createdAt">>) => void;
  deleteItem: (itemId: string) => void;
  toggleManualChecked: (itemId: string) => void;
  assignTagToItem: (itemId: string, tagId: string) => void;
  unassignTagFromItem: (itemId: string) => void;
  getItemsForTrip: (tripId: string) => PackingItem[];
  deleteItemsForTrip: (tripId: string) => void;
}

export const useItemStore = create<ItemState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (input) => {
        const now = new Date().toISOString();
        const item: PackingItem = {
          id: generateId(),
          tripId: input.tripId,
          name: input.name,
          type: input.type,
          quantity: input.quantity,
          notes: input.notes,
          manualChecked: false,
          tagId: input.tagId,
          masterItemId: input.masterItemId,
          createdAt: now,
          updatedAt: now
        };
        set((state) => ({ items: [...state.items, item] }));
        return item;
      },

      updateItem: (itemId, data) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, ...data, updatedAt: new Date().toISOString() } : i
          )
        }));
      },

      deleteItem: (itemId) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== itemId) }));
      },

      toggleManualChecked: (itemId) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, manualChecked: !i.manualChecked, updatedAt: new Date().toISOString() } : i
          )
        }));
      },

      assignTagToItem: (itemId, tagId) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, tagId, updatedAt: new Date().toISOString() } : i
          )
        }));
      },

      unassignTagFromItem: (itemId) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, tagId: undefined, updatedAt: new Date().toISOString() } : i
          )
        }));
      },

      getItemsForTrip: (tripId) => get().items.filter((i) => i.tripId === tripId),

      deleteItemsForTrip: (tripId) => {
        set((state) => ({ items: state.items.filter((i) => i.tripId !== tripId) }));
      }
    }),
    {
      name: "readygo:items",
      storage: createJSONStorage(() => zustandAsyncStorage)
    }
  )
);

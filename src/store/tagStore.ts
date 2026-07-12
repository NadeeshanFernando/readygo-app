// src/store/tagStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ReadyGoTag } from "@/types";
import { generateId } from "@/utils/id";
import { zustandAsyncStorage } from "@/services/storage";
import { verifyTagAuthenticity } from "@/services/tagAuthService";

export class TagRegistrationError extends Error {}

interface TagState {
  tags: ReadyGoTag[];
  /**
   * Verifies the tag's signature with tagAuthService before registering it.
   * Throws TagRegistrationError with a user-facing message if the tag
   * already exists locally, or if it fails authenticity verification.
   */
  registerTag: (qrCode: string, bleId: string, sig: string | undefined, nickname?: string) => Promise<ReadyGoTag>;
  renameTag: (tagId: string, nickname: string) => void;
  deleteTag: (tagId: string) => void;
  setAssignedItem: (tagId: string, itemId: string | undefined) => void;
  getTagByQrCode: (qrCode: string) => ReadyGoTag | undefined;
  getTag: (tagId: string) => ReadyGoTag | undefined;
}

export const useTagStore = create<TagState>()(
  persist(
    (set, get) => ({
      tags: [],

      registerTag: async (qrCode, bleId, sig, nickname) => {
        const existing = get().tags.find((t) => t.qrCode === qrCode);
        if (existing) {
          throw new TagRegistrationError("This tag has already been registered.");
        }

        const result = await verifyTagAuthenticity({ qrCode, bleId, sig });

        if (result.status === "invalid_signature") {
          throw new TagRegistrationError(
            "This tag's signature doesn't check out — it doesn't look like a genuine ReadyGo tag."
          );
        }
        if (result.status === "network_error") {
          throw new TagRegistrationError(
            "Couldn't reach the verification server. Check your connection and try again."
          );
        }

        // "unsigned" (old/dev-format QR with no sig) and "verified" both
        // proceed, but we record which one happened so it's visible later —
        // e.g. to warn a user their tag couldn't be cryptographically
        // confirmed as genuine.
        const tag: ReadyGoTag = {
          id: generateId(),
          qrCode,
          bleId,
          nickname,
          registeredAt: new Date().toISOString(),
          authStatus: result.status === "verified" ? "verified" : "unsigned"
        };
        set((state) => ({ tags: [...state.tags, tag] }));
        return tag;
      },

      renameTag: (tagId, nickname) => {
        set((state) => ({
          tags: state.tags.map((t) => (t.id === tagId ? { ...t, nickname } : t))
        }));
      },

      deleteTag: (tagId) => {
        set((state) => ({ tags: state.tags.filter((t) => t.id !== tagId) }));
      },

      setAssignedItem: (tagId, itemId) => {
        set((state) => ({
          tags: state.tags.map((t) => (t.id === tagId ? { ...t, assignedItemId: itemId } : t))
        }));
      },

      getTagByQrCode: (qrCode) => get().tags.find((t) => t.qrCode === qrCode),

      getTag: (tagId) => get().tags.find((t) => t.id === tagId)
    }),
    {
      name: "readygo:tags",
      storage: createJSONStorage(() => zustandAsyncStorage)
    }
  )
);

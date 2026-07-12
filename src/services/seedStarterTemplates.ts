// src/services/seedStarterTemplates.ts
//
// Ships seven starter Templates (Feature 4) so users have something useful
// on day one instead of a blank Library — but they're fully editable and
// deletable, not protected "system" entities. Runs once: skipped entirely
// if the user already has any templates (covers both "already seeded" and
// "user deleted them all on purpose," which is a fine outcome either way).

import { useBundleStore } from "@/store/bundleStore";
import { useMasterItemStore } from "@/store/masterItemStore";
import { ItemType } from "@/types";

interface SeedItem {
  name: string;
  type: ItemType;
  quantity?: number;
}

const STARTER_TEMPLATES: { name: string; icon: string; items: SeedItem[] }[] = [
  {
    name: "Office",
    icon: "💼",
    items: [
      { name: "Laptop", type: "tagged" },
      { name: "Laptop charger", type: "manual" },
      { name: "Badge / ID card", type: "manual" },
      { name: "Notebook", type: "manual" }
    ]
  },
  {
    name: "Beach",
    icon: "🏖️",
    items: [
      { name: "Sunscreen", type: "manual" },
      { name: "Swimsuit", type: "manual" },
      { name: "Towel", type: "manual" },
      { name: "Sunglasses", type: "manual" }
    ]
  },
  {
    name: "Business",
    icon: "🧳",
    items: [
      { name: "Laptop", type: "tagged" },
      { name: "Laptop charger", type: "manual" },
      { name: "Business cards", type: "manual" },
      { name: "Formal shoes", type: "manual" }
    ]
  },
  {
    name: "Camping",
    icon: "🏕️",
    items: [
      { name: "Tent", type: "manual" },
      { name: "Sleeping bag", type: "manual" },
      { name: "Flashlight", type: "manual" },
      { name: "First aid kit", type: "manual" }
    ]
  },
  {
    name: "Airport",
    icon: "✈️",
    items: [
      { name: "Passport", type: "tagged" },
      { name: "Boarding pass", type: "manual" },
      { name: "Phone charger", type: "manual" }
    ]
  },
  {
    name: "Weekend",
    icon: "🎒",
    items: [
      { name: "Phone charger", type: "manual" },
      { name: "Toothbrush", type: "manual" },
      { name: "Change of clothes", type: "manual", quantity: 2 }
    ]
  },
  {
    name: "International",
    icon: "🌍",
    items: [
      { name: "Passport", type: "tagged" },
      { name: "Power adapter", type: "manual" },
      { name: "Phone charger", type: "manual" },
      { name: "Travel insurance documents", type: "manual" }
    ]
  }
];

export function seedStarterTemplatesIfNeeded(userId: string): void {
  const existingTemplates = useBundleStore.getState().getBundlesForUser(userId, "template");
  if (existingTemplates.length > 0) return; // already seeded, or user cleared them intentionally

  for (const template of STARTER_TEMPLATES) {
    const bundle = useBundleStore.getState().addBundle(userId, "template", template.name, template.icon);

    for (const seedItem of template.items) {
      // Reuse an existing MasterItem with the same name if the user already
      // has one (e.g. from an earlier template in this same loop), rather
      // than creating duplicate library entries for common items like
      // "Passport" or "Phone charger" that appear in several templates.
      const matches = useMasterItemStore.getState().findByName(userId, seedItem.name);
      const exact = matches.find((m) => m.name.toLowerCase() === seedItem.name.toLowerCase());
      const masterItem =
        exact ??
        useMasterItemStore.getState().addMasterItem({
          userId,
          name: seedItem.name,
          defaultType: seedItem.type,
          defaultQuantity: seedItem.quantity ?? 1
        });

      useBundleStore.getState().addBundleItem(bundle.id, masterItem.id, seedItem.quantity ?? 1);
    }
  }
}

// src/services/smartWarningsService.ts
//
// Advisory (non-blocking) warnings layered on top of the existing
// Ready/Not Ready BLE check — e.g. "Laptop packed, charger missing."
// Pure function, no store/UI dependency, same style as readinessService.ts.
// Never touches readinessService's own pass/fail computation — this is an
// additive layer the caller (check.tsx) attaches alongside it.

import { PackingItem, SmartWarning, Trip } from "@/types";

interface CompanionRule {
  trigger: string; // substring match against an item's name, case-insensitive
  requires: string[]; // satisfied if ANY of these also appears among item names
  message: (triggerItemName: string) => string;
}

const COMPANION_RULES: CompanionRule[] = [
  {
    trigger: "laptop",
    requires: ["charger", "power adapter", "cable"],
    message: (name) => `${name} is packed — don't forget its charger.`
  },
  {
    trigger: "camera",
    requires: ["battery", "memory card", "sd card"],
    message: (name) => `${name} is packed — check you have a spare battery or memory card.`
  },
  {
    trigger: "phone",
    requires: ["charger", "cable", "power bank"],
    message: (name) => `${name} is packed — bring its charger too.`
  },
  {
    trigger: "drone",
    requires: ["propeller", "battery"],
    message: (name) => `${name} is packed — check spare propellers/battery.`
  }
];

interface TripContextRule {
  tripKeywords: string[]; // matched against trip title + destination
  requires: string[];
  message: string;
}

const TRIP_CONTEXT_RULES: TripContextRule[] = [
  {
    tripKeywords: ["airport", "flight", "flying"],
    requires: ["passport"],
    message: "This looks like an airport trip — make sure your passport is on the checklist."
  }
];

function includesAny(name: string, keywords: string[]): boolean {
  const lower = name.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export function evaluateSmartWarnings(items: PackingItem[], trip: Trip): SmartWarning[] {
  const warnings: SmartWarning[] = [];
  const itemNames = items.map((i) => i.name);

  for (const rule of COMPANION_RULES) {
    const triggerItem = items.find((i) => i.name.toLowerCase().includes(rule.trigger));
    if (!triggerItem) continue;
    if (!itemNames.some((n) => includesAny(n, rule.requires))) {
      warnings.push({
        id: `companion-${rule.trigger}-${triggerItem.id}`,
        message: rule.message(triggerItem.name),
        relatedItemNames: [triggerItem.name, ...rule.requires]
      });
    }
  }

  const tripText = `${trip.title} ${trip.destination ?? ""}`;
  for (const rule of TRIP_CONTEXT_RULES) {
    if (!includesAny(tripText, rule.tripKeywords)) continue;
    if (!itemNames.some((n) => includesAny(n, rule.requires))) {
      warnings.push({
        id: `context-${rule.tripKeywords[0]}`,
        message: rule.message,
        relatedItemNames: rule.requires
      });
    }
  }

  return warnings;
}

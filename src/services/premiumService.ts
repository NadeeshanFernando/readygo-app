// src/services/premiumService.ts
//
// The single source of truth for every premium/freemium rule in the app.
// No screen should compute trial status, trip limits, or AI limits itself
// — always go through this file, so there is exactly one place to change
// a rule.
//
// Trial status is derived fresh every call from authStore's existing
// `currentUser.createdAt` (already "first launch") — never cached/stored,
// so it can never go stale.

import { useAuthStore } from "@/store/authStore";
import { usePremiumStore } from "@/store/premiumStore";
import { useTripStore } from "@/store/tripStore";
import { TRIAL_DAYS, FREE_MAX_ACTIVE_TRIPS, FREE_AI_SUGGESTIONS_PER_MONTH } from "@/constants/premium";

export type PremiumType = "TRIAL" | "FREE" | "PRO";

function getTrialEndDate(): Date | null {
  const createdAt = useAuthStore.getState().currentUser?.createdAt;
  if (!createdAt) return null;
  const end = new Date(createdAt);
  end.setDate(end.getDate() + TRIAL_DAYS);
  return end;
}

export function isPremium(): boolean {
  return usePremiumStore.getState().isProManual;
}

export function isTrial(): boolean {
  if (isPremium()) return false;
  const end = getTrialEndDate();
  if (!end) return false;
  return Date.now() <= end.getTime();
}

export function getPremiumType(): PremiumType {
  if (isPremium()) return "PRO";
  if (isTrial()) return "TRIAL";
  return "FREE";
}

/** Calendar-day count (not raw ms/24h) so the display never reads oddly, e.g. "0.98 days remaining". */
export function getTrialDaysRemaining(): number {
  const end = getTrialEndDate();
  if (!end) return 0;
  const now = new Date();
  const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((endMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 0);
}

export function canCreateTrip(): boolean {
  if (isPremium() || isTrial()) return true;
  return getRemainingTrips()! > 0;
}

/** Returns null for "unlimited" (Trial/Pro), otherwise the number of additional active trips allowed. */
export function getRemainingTrips(): number | null {
  if (isPremium() || isTrial()) return null;
  const userId = useAuthStore.getState().currentUser?.id;
  if (!userId) return FREE_MAX_ACTIVE_TRIPS;
  const activeCount = useTripStore.getState().getActiveTripsForUser(userId).length;
  return Math.max(FREE_MAX_ACTIVE_TRIPS - activeCount, 0);
}

export function canUseAI(): boolean {
  if (isPremium() || isTrial()) return true;
  return getRemainingAISuggestions()! > 0;
}

/** Returns null for "unlimited" (Trial/Pro), otherwise how many suggestions are left this month. */
export function getRemainingAISuggestions(): number | null {
  if (isPremium() || isTrial()) return null;
  const store = usePremiumStore.getState();
  store.resetAiUsageIfNewMonth();
  return Math.max(FREE_AI_SUGGESTIONS_PER_MONTH - usePremiumStore.getState().aiSuggestionsUsedThisMonth, 0);
}

/** Call once, right after suggestions are actually shown to the user — counts individual suggestions, not requests. No-op for Trial/Pro (unlimited, no need to track). */
export function recordAiSuggestionsUsed(count: number): void {
  if (isPremium() || isTrial()) return;
  usePremiumStore.getState().recordAiSuggestionsUsed(count);
}

/** Placeholder for real payment integration (see conversation notes) — call this from the purchase-success callback later. */
export function activatePremium(): void {
  usePremiumStore.getState().activatePremium();
}

/**
 * Stage 2 hook-in: when BLE_TAGS_ENABLED flips to true, tags become a
 * Pro-only feature. Dormant/unused while the flag is off, but ready.
 */
export function canUseBleTags(): boolean {
  return isPremium() || isTrial();
}

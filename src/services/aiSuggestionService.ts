// src/services/aiSuggestionService.ts
//
// Client for the AI Suggestions (Feature 6) and Learning AI (Feature 7)
// backend endpoints. Same reasoning as tagAuthService.ts: this needs a real
// LLM API key, which must live server-side only — never in this app bundle.
//
// If EXPO_PUBLIC_TAG_AUTH_API_URL (reused — same backend, see
// tag-auth-backend-example) isn't configured, this degrades to "no
// suggestions available" rather than breaking anything. AI Suggestions is
// explicitly an optional enhancement layer, never a dependency of the core
// (fully offline-capable) checklist/BLE flow.

export interface AiSuggestion {
  name: string;
  reason: string;
  category?: string;
}

export type AiSuggestionsResult =
  | { status: "ok"; suggestions: AiSuggestion[] }
  | { status: "not_configured" }
  | { status: "network_error" };

const API_URL = process.env.EXPO_PUBLIC_TAG_AUTH_API_URL;

export async function getAiSuggestions(input: {
  userId: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  existingItemNames: string[];
}): Promise<AiSuggestionsResult> {
  if (!API_URL) return { status: "not_configured" };

  try {
    const response = await fetch(`${API_URL}/api/ai/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    if (!response.ok) return { status: "network_error" };
    const data = await response.json();
    return { status: "ok", suggestions: data.suggestions ?? [] };
  } catch (error) {
    console.warn("ReadyGo: AI suggestion request failed", error);
    return { status: "network_error" };
  }
}

/**
 * Records an accept/reject decision (Feature 7 — Learning AI). Fire-and-forget:
 * never blocks the UI, never throws — feedback is a nice-to-have signal,
 * not something that should ever interrupt the user's actual task.
 */
export function recordSuggestionFeedback(input: {
  userId: string;
  itemName: string;
  accepted: boolean;
  destination?: string;
}): void {
  if (!API_URL) return;
  fetch(`${API_URL}/api/ai/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  }).catch((error) => console.warn("ReadyGo: failed to record suggestion feedback", error));
}

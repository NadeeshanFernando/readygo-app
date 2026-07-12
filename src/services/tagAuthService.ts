// src/services/tagAuthService.ts
//
// Verifies that a scanned tag was genuinely issued by us, not a cloned or
// hand-crafted BLE beacon pretending to be one.
//
// IMPORTANT SECURITY NOTE:
// This check MUST happen on a server you control, using a secret key that
// is never shipped inside the app bundle. Any secret embedded in this app's
// JS/native code can be extracted by anyone who unpacks the app — React
// Native and Expo apps are not hard to decompile. So this file is a *client*
// for a backend verification endpoint, not a place to put real crypto
// secrets.
//
// The backend side (not part of this app) should, at minimum, expose:
//
//   POST /api/tags/verify
//   body: { qrCode: string, bleId: string, sig: string }
//   returns: { valid: boolean }
//
// implemented roughly as:
//   const expected = crypto.createHmac("sha256", SECRET_KEY)
//     .update(qrCode + bleId)
//     .digest("hex");
//   return { valid: timingSafeEqual(expected, sig) };
//
// A minimal example Node/Express server implementing both the manufacturing
// "provision" endpoint and this "verify" endpoint is provided separately
// (see tag-auth-backend-example/) — deploy it (or your own equivalent)
// and set EXPO_PUBLIC_TAG_AUTH_API_URL to point at it.

import { ParsedTagPayload } from "./qrService";
import { hmac } from "js-sha256";

export type TagAuthResult =
  | { status: "verified" }
  | { status: "invalid_signature" }
  | { status: "unsigned" } // no `sig` present at all — old/dev-format QR
  | { status: "network_error" };

const API_URL = process.env.EXPO_PUBLIC_TAG_AUTH_API_URL;

/**
 * Dev-only fallback secret, used ONLY when no backend is configured yet, so
 * you can keep developing the rest of the app before your backend exists.
 * This is NOT secure and must never be used once you ship real tags — it's
 * shipped in the app bundle and is trivially extractable.
 */
const INSECURE_DEV_ONLY_SHARED_SECRET = "dev-only-not-a-real-secret";

function devOnlyLocalHmacCheck(payload: ParsedTagPayload): boolean {
  // React Native/Hermes doesn't reliably expose the Web Crypto `crypto.subtle`
  // API, so this uses a small pure-JS HMAC-SHA256 implementation instead —
  // fine for a synchronous local dev check, never used once
  // EXPO_PUBLIC_TAG_AUTH_API_URL is set.
  const expected = hmac(INSECURE_DEV_ONLY_SHARED_SECRET, payload.qrCode + payload.bleId);
  return expected === payload.sig;
}

/**
 * Verifies a scanned tag's signature against our backend. Falls back to an
 * insecure local check ONLY in development when no backend URL is
 * configured, so the rest of the app remains testable before your backend
 * is deployed.
 */
export async function verifyTagAuthenticity(payload: ParsedTagPayload): Promise<TagAuthResult> {
  if (!payload.sig) {
    return { status: "unsigned" };
  }

  if (!API_URL) {
    console.warn(
      "ReadyGo: EXPO_PUBLIC_TAG_AUTH_API_URL is not set — using an INSECURE local dev check. " +
        "Do not ship this to real users; deploy the backend and set this env var first."
    );
    const ok = devOnlyLocalHmacCheck(payload);
    return ok ? { status: "verified" } : { status: "invalid_signature" };
  }

  try {
    const response = await fetch(`${API_URL}/api/tags/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrCode: payload.qrCode, bleId: payload.bleId, sig: payload.sig })
    });
    if (!response.ok) return { status: "network_error" };
    const data = await response.json();
    return data.valid ? { status: "verified" } : { status: "invalid_signature" };
  } catch (error) {
    console.warn("ReadyGo: tag verification request failed", error);
    return { status: "network_error" };
  }
}

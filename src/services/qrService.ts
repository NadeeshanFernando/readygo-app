// src/services/qrService.ts
//
// Helpers around the QR payload printed/encoded on each physical ReadyGo tag.
//
// Genuine ReadyGo tags encode a JSON payload that includes a `sig` field —
// an HMAC signature computed by our backend at manufacturing time, proving
// this qrCode+bleId pair was actually issued by us (see tagAuthService.ts
// for why this can't be checked securely on-device alone):
//   { "qrCode": "RG-000123", "bleId": "AA:BB:CC:DD:EE:01", "sig": "..." }
//
// The unsigned "qrCode|bleId" and no-sig JSON formats are still accepted by
// the parser below for local dev/testing convenience, but tagAuthService
// will refuse to register them once real backend verification is wired up.

export interface ParsedTagPayload {
  qrCode: string;
  bleId: string;
  sig?: string;
}

export class InvalidTagQrError extends Error {
  constructor(raw: string) {
    super(`QR code is not a valid ReadyGo tag payload: ${raw}`);
    this.name = "InvalidTagQrError";
  }
}

export function parseTagQrPayload(raw: string): ParsedTagPayload {
  // Normalize common quirks introduced by QR generator tools and mobile
  // keyboard autocorrect before attempting to parse anything:
  //  - trim stray leading/trailing whitespace or newlines
  //  - convert "smart"/curly quotes back to straight quotes (autocorrect
  //    silently swaps these, which breaks JSON.parse with no visible sign)
  //  - strip zero-width characters some tools inject
  const normalized = raw
    .trim()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u200B-\u200D\uFEFF]/g, "");

  // Try JSON payload first.
  try {
    const parsed = JSON.parse(normalized);
    if (parsed && typeof parsed.qrCode === "string" && typeof parsed.bleId === "string") {
      return {
        qrCode: parsed.qrCode.trim(),
        bleId: parsed.bleId.trim(),
        sig: typeof parsed.sig === "string" ? parsed.sig.trim() : undefined
      };
    }
  } catch {
    // fall through to alternate formats
  }

  // Fallback: "qrCode|bleId" simple delimited format, useful for quick test QR codes.
  // No signature possible in this format — treated as unsigned/dev-only.
  if (normalized.includes("|")) {
    const [qrCode, bleId] = normalized.split("|").map((part) => part.trim());
    if (qrCode && bleId) {
      return { qrCode, bleId };
    }
  }

  throw new InvalidTagQrError(raw);
}

/**
 * Generates a payload string for a mock/test QR code, useful for generating
 * printable test codes during development (e.g. with a QR generator site).
 * Pass `sig` once you have a backend issuing real signed tags.
 */
export function buildTestTagPayload(qrCode: string, bleId: string, sig?: string): string {
  return JSON.stringify(sig ? { qrCode, bleId, sig } : { qrCode, bleId });
}

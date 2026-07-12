// src/utils/id.ts
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

export function generateId(): string {
  return uuidv4();
}

/**
 * Very simple, NON-cryptographic string hash used only to avoid storing
 * plaintext passwords in local mock storage for v1. Replace with a real
 * auth backend (and bcrypt/argon2 hashing) before shipping.
 */
export function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return `h${Math.abs(hash)}`;
}

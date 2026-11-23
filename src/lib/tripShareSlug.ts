import { randomBytes } from "crypto";

const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/**
 * Generates a clean, URL-safe, unguessable ASCII trip share slug (e.g. `t-7k2m9p4q`).
 * Avoids raw Thai characters so shared links on LINE / Messenger / IG never expand into `%E0%B8...`.
 */
export function generateTripShareSlug(length = 8): string {
  const bytes = randomBytes(length);
  let out = "t-";
  for (let i = 0; i < length; i++) {
    out += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  }
  return out;
}

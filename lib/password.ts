import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 32;

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("base64url");
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const actual = scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, "base64url");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

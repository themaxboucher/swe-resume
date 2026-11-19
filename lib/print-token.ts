import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export type PrintKind = "resume" | "cover-letter";

function signature(kind: PrintKind, id: string, expiresAt: number) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`print:${kind}:${id}:${expiresAt}`).digest("base64url");
}

/** A short-lived token that lets headless Chromium render one document without a session. */
export function createPrintToken(kind: PrintKind, id: string, ttlSeconds = 60) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${expiresAt}.${signature(kind, id, expiresAt)}`;
}

export function verifyPrintToken(kind: PrintKind, id: string, token: string | undefined): boolean {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  const expiresAt = Number(exp);
  if (!sig || !Number.isInteger(expiresAt) || expiresAt < Date.now() / 1000) return false;
  const expected = Buffer.from(signature(kind, id, expiresAt));
  const actual = Buffer.from(sig);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

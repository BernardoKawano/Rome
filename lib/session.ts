import { cookies } from "next/headers";
import { appAuthUserId } from "@/lib/app-auth-config";
import { signSessionPayload, verifySessionPayload } from "@/lib/session-crypto";

export const SESSION_COOKIE = "rome_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

export async function createSessionToken(username: string): Promise<string> {
  return signSessionPayload({
    sub: appAuthUserId(username),
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
  });
}

export async function verifySessionToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const payload = await verifySessionPayload(token);
  return payload?.sub ?? null;
}

export async function getSessionUserIdFromCookies(): Promise<string | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(username: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

import { cookies } from "next/headers";
import { APP_SESSION_COOKIE } from "@/lib/session-cookie";
import { signSessionPayload, verifySessionPayload } from "@/lib/session-crypto";

export { APP_SESSION_COOKIE };
const MAX_AGE_SEC = 60 * 60 * 24 * 30;

export async function setAppSession(userId: string): Promise<void> {
  const token = await signSessionPayload({
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
  });
  const jar = await cookies();
  jar.set(APP_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearAppSession(): Promise<void> {
  const jar = await cookies();
  jar.set(APP_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function readAppSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(APP_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionPayload(token);
  return session?.sub ?? null;
}

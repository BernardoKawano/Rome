import { cookies } from "next/headers";
import { signSessionPayload, verifySessionPayload } from "@/lib/session-crypto";

export const GOOGLE_SESSION_COOKIE = "demandas_google";

const MAX_AGE_SEC = 60 * 60 * 24 * 30;

export type GoogleSession = {
  sub: string;
  email: string;
  name?: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExp: number;
  driveFileId?: string;
  exp: number;
};

type GoogleSessionWire = GoogleSession;

export async function createGoogleSessionCookie(data: Omit<GoogleSession, "exp">): Promise<void> {
  const payload: GoogleSessionWire = {
    ...data,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
  };
  const jar = await cookies();
  jar.set(GOOGLE_SESSION_COOKIE, await signSessionPayload(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function getGoogleSessionFromCookies(): Promise<GoogleSession | null> {
  const jar = await cookies();
  const token = jar.get(GOOGLE_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionPayload(token);
  if (!payload) return null;
  const wire = payload as unknown as GoogleSessionWire;
  if (
    typeof wire.sub !== "string" ||
    typeof wire.email !== "string" ||
    typeof wire.accessToken !== "string" ||
    typeof wire.refreshToken !== "string" ||
    typeof wire.accessTokenExp !== "number"
  ) {
    return null;
  }
  return wire;
}

export async function updateGoogleSessionCookie(patch: Partial<GoogleSession>): Promise<void> {
  const current = await getGoogleSessionFromCookies();
  if (!current) return;
  await createGoogleSessionCookie({
    sub: current.sub,
    email: current.email,
    name: current.name,
    accessToken: patch.accessToken ?? current.accessToken,
    refreshToken: patch.refreshToken ?? current.refreshToken,
    accessTokenExp: patch.accessTokenExp ?? current.accessTokenExp,
    driveFileId: patch.driveFileId ?? current.driveFileId,
  });
}

export async function clearGoogleSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(GOOGLE_SESSION_COOKIE);
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildGoogleAuthUrl } from "@/lib/google-oauth";
import { isGoogleAuthConfigured } from "@/lib/google-config";

const STATE_COOKIE = "google_oauth_state";

export async function GET() {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.json({ error: "Google OAuth não configurado" }, { status: 503 });
  }
  const state = crypto.randomUUID();
  const jar = await cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return NextResponse.redirect(buildGoogleAuthUrl(state));
}

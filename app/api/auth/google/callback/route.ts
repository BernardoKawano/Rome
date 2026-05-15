import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeGoogleCode, fetchGoogleUserInfo } from "@/lib/google-oauth";
import { createGoogleSessionCookie } from "@/lib/google-session";
import { isGoogleAuthConfigured } from "@/lib/google-config";

const STATE_COOKIE = "google_oauth_state";

export async function GET(req: Request) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(new URL("/login?error=config", req.url));
  }

  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, req.url));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expectedState = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=state", req.url));
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL("/login?error=refresh", req.url));
    }
    const profile = await fetchGoogleUserInfo(tokens.access_token);
    await createGoogleSessionCookie({
      sub: profile.sub,
      email: profile.email,
      name: profile.name,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExp: Date.now() + tokens.expires_in * 1000,
    });
    return NextResponse.redirect(new URL("/", req.url));
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth", req.url));
  }
}

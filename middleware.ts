import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isGoogleAuthConfigured } from "@/lib/google-config";
import { GOOGLE_SESSION_COOKIE } from "@/lib/google-session";
import { verifySessionPayload } from "@/lib/session-crypto";

const PUBLIC_PREFIXES = ["/login", "/api/auth/google", "/api/auth/google/callback"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (!isGoogleAuthConfigured()) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.next();
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("error", "config");
    return NextResponse.redirect(login);
  }

  const token = request.cookies.get(GOOGLE_SESSION_COOKIE)?.value;
  const session = token ? await verifySessionPayload(token) : null;
  const wire = session as { accessToken?: string } | null;
  if (!wire?.accessToken) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

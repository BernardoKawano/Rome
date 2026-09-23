import { NextResponse, type NextRequest } from "next/server";
import { APP_SESSION_COOKIE } from "@/lib/session-cookie";
import { verifySessionPayload } from "@/lib/session-crypto";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { copySupabaseCookies, updateSupabaseSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function deny(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isSupabaseConfigured()) {
    const { supabaseResponse, userId } = await updateSupabaseSession(request);
    if (isPublicPath(pathname) || userId) return supabaseResponse;
    const denied = deny(request);
    copySupabaseCookies(supabaseResponse, denied);
    return denied;
  }

  if (isPublicPath(pathname)) return NextResponse.next();

  const token = request.cookies.get(APP_SESSION_COOKIE)?.value;
  const session = token ? await verifySessionPayload(token) : null;
  if (!session?.sub) return deny(request);
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

import { auth } from "@clerk/nextjs/server";
import { isAppAuthConfigured } from "@/lib/app-auth-config";
import { isClerkConfigured } from "@/lib/clerk-config";
import { getSessionUserIdFromCookies } from "@/lib/session";

/** Utilizador autenticado para API e persistência do tabuleiro. */
export async function getAuthUserId(): Promise<string | null> {
  if (isClerkConfigured()) {
    const { userId } = await auth();
    return userId;
  }
  if (isAppAuthConfigured()) {
    return getSessionUserIdFromCookies();
  }
  if (process.env.NODE_ENV === "development") {
    return "local-dev";
  }
  return null;
}

export type AuthMode = "clerk" | "app" | "dev";

export function getAuthMode(): AuthMode {
  if (isClerkConfigured()) return "clerk";
  if (isAppAuthConfigured()) return "app";
  return "dev";
}

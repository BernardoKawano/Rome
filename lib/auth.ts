import { isGoogleAuthConfigured } from "@/lib/google-config";
import { getGoogleSessionFromCookies } from "@/lib/google-session";

export type AuthMode = "google" | "dev";

export async function getAuthUserId(): Promise<string | null> {
  const google = await getGoogleSessionFromCookies();
  if (google) return `google:${google.sub}`;
  if (process.env.NODE_ENV === "development" && !isGoogleAuthConfigured()) {
    return "local-dev";
  }
  return null;
}

export function getAuthMode(): AuthMode {
  if (isGoogleAuthConfigured()) return "google";
  return "dev";
}

export async function getAuthProfile(): Promise<{ userId: string; email?: string; name?: string } | null> {
  const google = await getGoogleSessionFromCookies();
  if (google) {
    return { userId: `google:${google.sub}`, email: google.email, name: google.name };
  }
  const userId = await getAuthUserId();
  if (!userId) return null;
  return { userId };
}

import type { Profile } from "@/lib/access";
import { readAppSessionUserId } from "@/lib/app-session";
import { getStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAuthProfile(): Promise<Profile | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims?.sub) return null;
    return getStore().getProfile(data.claims.sub);
  }

  const userId = await readAppSessionUserId();
  if (!userId) return null;
  return getStore().getProfile(userId);
}

export async function getAuthUserId(): Promise<string | null> {
  const profile = await getAuthProfile();
  return profile?.id ?? null;
}

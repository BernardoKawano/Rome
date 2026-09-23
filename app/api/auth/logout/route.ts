import { NextResponse } from "next/server";
import { clearAppSession } from "@/lib/app-session";
import { clearGoogleSessionCookie } from "@/lib/google-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  await clearAppSession();
  await clearGoogleSessionCookie();
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  return NextResponse.json({ ok: true });
}

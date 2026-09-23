import { NextResponse } from "next/server";
import { loginInputSchema } from "@/lib/api-input";
import { setAppSession } from "@/lib/app-session";
import { jsonError, readJson } from "@/lib/guard";
import { loginWithPassword } from "@/lib/store/file-store";
import { getStore } from "@/lib/store";
import { configuredGestorEmail, isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const parsed = loginInputSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail ou senha inválidos" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;

  try {
    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return NextResponse.json({ error: "E-mail ou senha incorretos" }, { status: 401 });
      }
      const { data } = await supabase.auth.getClaims();
      const userId = data?.claims?.sub;
      if (!userId) {
        return NextResponse.json({ error: "E-mail ou senha incorretos" }, { status: 401 });
      }
      if (configuredGestorEmail() === email) {
        await getStore().setRole(userId, "gestor");
      }
      const profile = await getStore().getProfile(userId);
      return NextResponse.json({ role: profile?.role ?? "talento" });
    }

    const profile = await loginWithPassword(email, password);
    if (!profile) {
      return NextResponse.json({ error: "E-mail ou senha incorretos" }, { status: 401 });
    }
    await setAppSession(profile.id);
    return NextResponse.json({ role: profile.role });
  } catch (error) {
    return jsonError(error);
  }
}

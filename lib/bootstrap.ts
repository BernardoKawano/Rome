import { configuredGestorEmail } from "@/lib/supabase/env";
import { getStore } from "@/lib/store";

/** Cria o gestor a partir de GESTOR_EMAIL e GESTOR_PASSWORD, se ainda não existir. */
export async function ensureBootstrapGestor(): Promise<void> {
  const email = configuredGestorEmail();
  const password = process.env.GESTOR_PASSWORD;
  if (!email || !password) return;
  await getStore().ensureGestorAccount(email, password, "Gestor");
}

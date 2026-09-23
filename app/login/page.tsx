import { ensureBootstrapGestor } from "@/lib/bootstrap";
import { getAuthProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginClient from "./login-client";

const ERROR_MESSAGES: Record<string, string> = {
  config: "Configure o Supabase ou, em desenvolvimento, GESTOR_EMAIL e GESTOR_PASSWORD.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  try {
    await ensureBootstrapGestor();
  } catch (error) {
    console.error("[login] bootstrap do gestor:", error);
  }

  const profile = await getAuthProfile();
  if (profile?.role === "gestor") redirect("/gestor");
  if (profile) redirect("/");

  const params = await searchParams;
  const errorKey = params.error ?? "";
  const errorMessage = ERROR_MESSAGES[errorKey] ?? (errorKey ? "Não foi possível entrar." : null);

  return <LoginClient errorMessage={errorMessage} />;
}

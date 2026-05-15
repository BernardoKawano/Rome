import { isGoogleAuthConfigured } from "@/lib/google-config";
import LoginClient from "./login-client";

const ERROR_MESSAGES: Record<string, string> = {
  config: "Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI em .env.local",
  state: "Sessão OAuth inválida. Tente entrar novamente.",
  refresh: "O Google não devolveu refresh token. Remova o acesso da app em myaccount.google.com e tente de novo.",
  oauth: "Falha na autenticação Google. Tente novamente.",
  access_denied: "Login cancelado.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorKey = params.error ?? "";
  const errorMessage = ERROR_MESSAGES[errorKey] ?? (errorKey ? "Não foi possível entrar." : null);
  const googleReady = isGoogleAuthConfigured();

  return <LoginClient googleReady={googleReady} errorMessage={errorMessage} />;
}

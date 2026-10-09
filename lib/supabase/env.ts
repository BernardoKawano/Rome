export function supabaseUrl(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
}

export function supabasePublishableKey(): string | null {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    null
  );
}

export function supabaseSecretKey(): string | null {
  return process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabasePublishableKey());
}

/** Vercel/Lambda: disco da função é read-only — file-store (`.data`) não pode ser usado. */
export function isEphemeralServer(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/** Persistência em ficheiro só em desenvolvimento local, nunca em produção serverless. */
export function isFileStoreAllowed(): boolean {
  if (isEphemeralServer()) return false;
  if (process.env.NODE_ENV === "production") return false;
  return true;
}

export function configuredGestorEmail(): string | null {
  const email = process.env.GESTOR_EMAIL?.trim().toLowerCase();
  return email || null;
}

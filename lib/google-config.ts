export const GOOGLE_BOARD_FILENAME = "demandas-kanban.json";
export const GOOGLE_BOARD_MIME = "application/json";

/** Lista o ficheiro no Drive do utilizador (scope drive.file; não usar appDataFolder). */
export const GOOGLE_DRIVE_FILE_QUERY = `name='${GOOGLE_BOARD_FILENAME}' and trashed=false`;

function hasRedirectUri(): boolean {
  return Boolean(process.env.GOOGLE_REDIRECT_URI?.trim() || process.env.VERCEL_URL?.trim());
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim() && hasRedirectUri()
  );
}

/** Produção Vercel: usa VERCEL_URL se GOOGLE_REDIRECT_URI não estiver definido. */
export function resolveGoogleRedirectUri(): string {
  const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}/api/auth/google/callback`;
  throw new Error("GOOGLE_REDIRECT_URI não definido");
}

export function googleClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!id) throw new Error("GOOGLE_CLIENT_ID não definido");
  return id;
}

export function googleClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET não definido");
  return secret;
}

export function googleRedirectUri(): string {
  return resolveGoogleRedirectUri();
}

/** Escopos: perfil + ficheiro criado pela app no Drive do utilizador. */
export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
];

/** Login por utilizador/senha (alternativa ao Clerk). */
export function isAppAuthConfigured(): boolean {
  return Boolean(
    process.env.APP_AUTH_USERNAME?.trim() && process.env.APP_AUTH_PASSWORD?.trim()
  );
}

export function validateAppCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.APP_AUTH_USERNAME?.trim();
  const expectedPass = process.env.APP_AUTH_PASSWORD?.trim();
  if (!expectedUser || !expectedPass) return false;

  const userOk = timingSafeEqualStr(username.trim(), expectedUser);
  const passOk = timingSafeEqualStr(password, expectedPass);
  return userOk && passOk;
}

/** Id estável para persistência no KV (sem caracteres problemáticos). */
export function appAuthUserId(username: string): string {
  return `app:${username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "_")}`;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

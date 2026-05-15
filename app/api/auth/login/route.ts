import { NextResponse } from "next/server";
import { validateAppCredentials } from "@/lib/app-auth-config";
import { setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = (await req.json()) as { username?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const username = body.username ?? "";
  const password = body.password ?? "";

  if (!validateAppCredentials(username, password)) {
    return NextResponse.json({ error: "Utilizador ou senha incorretos" }, { status: 401 });
  }

  await setSessionCookie(username);
  return NextResponse.json({ ok: true });
}

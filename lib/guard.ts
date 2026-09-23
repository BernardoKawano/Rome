import { NextResponse } from "next/server";
import type { Profile } from "@/lib/access";
import { getAuthProfile } from "@/lib/auth";
import { StoreError } from "@/lib/store-error";

export async function requireViewer(): Promise<
  { viewer: Profile; error: null } | { viewer: null; error: NextResponse }
> {
  const viewer = await getAuthProfile();
  if (!viewer) {
    return { viewer: null, error: NextResponse.json({ error: "Não autorizado" }, { status: 401 }) };
  }
  return { viewer, error: null };
}

export function jsonError(error: unknown) {
  if (error instanceof StoreError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Erro interno";
  console.error(error);
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { assertBoardIntegrity } from "@/lib/board-operations";
import { createDefaultBoard, safeParseBoardState } from "@/lib/board-schema";
import { readBoard, writeBoard } from "@/lib/kv";

async function resolveUserId(): Promise<string | NextResponse> {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return userId;
}

export async function GET() {
  const userId = await resolveUserId();
  if (userId instanceof NextResponse) return userId;

  const raw = await readBoard(userId);
  if (raw == null) {
    const initial = createDefaultBoard();
    await writeBoard(userId, initial);
    return NextResponse.json(initial);
  }

  const parsed = safeParseBoardState(raw);
  if (!parsed.success) {
    const fresh = createDefaultBoard();
    await writeBoard(userId, fresh);
    return NextResponse.json(fresh);
  }

  try {
    assertBoardIntegrity(parsed.data);
  } catch {
    const fresh = createDefaultBoard();
    await writeBoard(userId, fresh);
    return NextResponse.json(fresh);
  }

  return NextResponse.json(parsed.data);
}

export async function PUT(req: Request) {
  const userId = await resolveUserId();
  if (userId instanceof NextResponse) return userId;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = safeParseBoardState(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    assertBoardIntegrity(parsed.data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Estado inválido";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await writeBoard(userId, parsed.data);
  return NextResponse.json({ ok: true });
}

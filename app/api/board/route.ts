import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { readBoardForSession, writeBoardForSession } from "@/lib/board-storage";
import { assertBoardIntegrity } from "@/lib/board-operations";
import { createDefaultBoard, safeParseBoardState } from "@/lib/board-schema";
export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { data: raw } = await readBoardForSession();
    if (raw == null) {
      const initial = createDefaultBoard();
      await writeBoardForSession(initial);
      return NextResponse.json(initial);
    }

    const parsed = safeParseBoardState(raw);
    if (!parsed.success) {
      const fresh = createDefaultBoard();
      await writeBoardForSession(fresh);
      return NextResponse.json(fresh);
    }

    try {
      assertBoardIntegrity(parsed.data);
    } catch {
      const fresh = createDefaultBoard();
      await writeBoardForSession(fresh);
      return NextResponse.json(fresh);
    }

    return NextResponse.json(parsed.data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao ler tabuleiro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

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

  try {
    await writeBoardForSession(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao guardar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

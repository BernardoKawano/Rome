import { NextResponse } from "next/server";
import { canEditBoard } from "@/lib/access";
import { assertBoardIntegrity } from "@/lib/board-operations";
import { safeParseBoardState, withCurrentVersion } from "@/lib/board-schema";
import { jsonError, readJson, requireViewer } from "@/lib/guard";
import { getStore } from "@/lib/store";

export async function GET() {
  const auth = await requireViewer();
  if (auth.error) return auth.error;

  try {
    const board = await getStore().getBoard(auth.viewer.id);
    return NextResponse.json(board);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(req: Request) {
  const auth = await requireViewer();
  if (auth.error) return auth.error;
  if (!canEditBoard(auth.viewer, auth.viewer.id)) {
    return NextResponse.json({ error: "O quadro do gestor é só de leitura" }, { status: 403 });
  }

  const parsed = safeParseBoardState(await readJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    assertBoardIntegrity(parsed.data);
    await getStore().saveBoard(auth.viewer.id, withCurrentVersion(parsed.data));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && /Cartão/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return jsonError(error);
  }
}

import { NextResponse } from "next/server";
import { canEditBoard, canReadTalent } from "@/lib/access";
import { assertBoardIntegrity } from "@/lib/board-operations";
import { safeParseBoardState, withCurrentVersion } from "@/lib/board-schema";
import { jsonError, readJson, requireViewer } from "@/lib/guard";
import { getStore } from "@/lib/store";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Context) {
  const auth = await requireViewer();
  if (auth.error) return auth.error;
  const { id } = await context.params;
  if (!canReadTalent(auth.viewer, id)) {
    return NextResponse.json({ error: "Sem acesso a este quadro" }, { status: 403 });
  }

  try {
    const board = await getStore().getBoard(id);
    return NextResponse.json(board);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(req: Request, context: Context) {
  const auth = await requireViewer();
  if (auth.error) return auth.error;
  const { id } = await context.params;
  if (!canEditBoard(auth.viewer, id)) {
    return NextResponse.json({ error: "Sem permissão para alterar este quadro" }, { status: 403 });
  }

  const parsed = safeParseBoardState(await readJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    assertBoardIntegrity(parsed.data);
    await getStore().saveBoard(id, withCurrentVersion(parsed.data));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && /Cartão/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return jsonError(error);
  }
}

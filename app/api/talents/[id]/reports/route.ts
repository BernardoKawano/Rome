import { NextResponse } from "next/server";
import { canEditReport, canReadTalent } from "@/lib/access";
import { reportInputSchema } from "@/lib/api-input";
import { jsonError, readJson, requireViewer } from "@/lib/guard";
import { summarizeCompleted } from "@/lib/impact";
import { getStore } from "@/lib/store";

type Context = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: Context) {
  const auth = await requireViewer();
  if (auth.error) return auth.error;
  const { id } = await context.params;
  if (!canReadTalent(auth.viewer, id)) {
    return NextResponse.json({ error: "Sem acesso ao relatório" }, { status: 403 });
  }

  const url = new URL(req.url);
  const periodStart = url.searchParams.get("start");
  const periodEnd = url.searchParams.get("end");
  if (!periodStart || !periodEnd) {
    return NextResponse.json({ error: "Informe o período" }, { status: 400 });
  }

  try {
    const report = await getStore().getReport(id, periodStart, periodEnd);
    return NextResponse.json(report);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(req: Request, context: Context) {
  const auth = await requireViewer();
  if (auth.error) return auth.error;
  const { id } = await context.params;
  if (!canEditReport(auth.viewer, id)) {
    return NextResponse.json({ error: "Só o talento escreve o relatório" }, { status: 403 });
  }

  const parsed = reportInputSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: "Relatório inválido" }, { status: 400 });
  }

  try {
    const board = await getStore().getBoard(id);
    const snapshot = summarizeCompleted(board, {
      start: parsed.data.periodStart,
      end: parsed.data.periodEnd,
    });
    const report = await getStore().saveReport({
      talentId: id,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      narrative: parsed.data.narrative,
      snapshot,
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json(report);
  } catch (error) {
    return jsonError(error);
  }
}

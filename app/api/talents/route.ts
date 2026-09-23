import { NextResponse } from "next/server";
import { canManageTalents } from "@/lib/access";
import { createTalentInputSchema } from "@/lib/api-input";
import { jsonError, readJson, requireViewer } from "@/lib/guard";
import { summarizeCompleted, weekRange } from "@/lib/impact";
import { getStore } from "@/lib/store";

export async function GET() {
  const auth = await requireViewer();
  if (auth.error) return auth.error;
  if (!canManageTalents(auth.viewer)) {
    return NextResponse.json({ error: "Só o gestor vê a lista de talentos" }, { status: 403 });
  }

  try {
    const talents = await getStore().listTalents();
    const week = weekRange(new Date());
    const rows = await Promise.all(
      talents.map(async (talent) => {
        const board = await getStore().getBoard(talent.id);
        const summary = summarizeCompleted(board, week);
        return {
          ...talent,
          week: {
            needleHours: summary.needleHours,
            totalHours: summary.totalHours,
            percent: summary.percent,
            meetsTarget: summary.meetsTarget,
          },
        };
      })
    );
    return NextResponse.json(rows);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  const auth = await requireViewer();
  if (auth.error) return auth.error;
  if (!canManageTalents(auth.viewer)) {
    return NextResponse.json({ error: "Só o gestor cria talentos" }, { status: 403 });
  }

  const parsed = createTalentInputSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: "Preencha nome, e-mail, senha (mínimo 8) e empresa" }, { status: 400 });
  }

  try {
    const talent = await getStore().createTalentAccount({
      ...parsed.data,
      email: parsed.data.email.toLowerCase(),
    });
    return NextResponse.json(talent, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

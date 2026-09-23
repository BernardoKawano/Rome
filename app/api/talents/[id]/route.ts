import { NextResponse } from "next/server";
import { canManageTalents, canReadTalent } from "@/lib/access";
import { updateTalentInputSchema } from "@/lib/api-input";
import { jsonError, readJson, requireViewer } from "@/lib/guard";
import { getStore } from "@/lib/store";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Context) {
  const auth = await requireViewer();
  if (auth.error) return auth.error;
  const { id } = await context.params;
  if (!canReadTalent(auth.viewer, id)) {
    return NextResponse.json({ error: "Sem acesso a este talento" }, { status: 403 });
  }

  try {
    const profile = await getStore().getProfile(id);
    if (!profile || profile.role !== "talento") {
      return NextResponse.json({ error: "Talento não encontrado" }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: Request, context: Context) {
  const auth = await requireViewer();
  if (auth.error) return auth.error;
  if (!canManageTalents(auth.viewer)) {
    return NextResponse.json({ error: "Só o gestor altera o talento" }, { status: 403 });
  }
  const { id } = await context.params;
  const parsed = updateTalentInputSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados do talento inválidos" }, { status: 400 });
  }

  try {
    const profile = await getStore().updateTalentAccount(id, parsed.data);
    return NextResponse.json(profile);
  } catch (error) {
    return jsonError(error);
  }
}

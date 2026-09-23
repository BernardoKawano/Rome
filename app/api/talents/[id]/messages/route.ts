import { NextResponse } from "next/server";
import { canPostMessage, canReadTalent } from "@/lib/access";
import { messageInputSchema } from "@/lib/api-input";
import { jsonError, readJson, requireViewer } from "@/lib/guard";
import { getStore } from "@/lib/store";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Context) {
  const auth = await requireViewer();
  if (auth.error) return auth.error;
  const { id } = await context.params;
  if (!canReadTalent(auth.viewer, id)) {
    return NextResponse.json({ error: "Sem acesso aos recados" }, { status: 403 });
  }

  try {
    const messages = await getStore().listMessages(id);
    return NextResponse.json(messages);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request, context: Context) {
  const auth = await requireViewer();
  if (auth.error) return auth.error;
  const { id } = await context.params;
  if (!canPostMessage(auth.viewer, id)) {
    return NextResponse.json({ error: "Sem permissão para escrever aqui" }, { status: 403 });
  }

  const parsed = messageInputSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: "Escreva uma mensagem" }, { status: 400 });
  }

  try {
    const message = await getStore().addMessage({
      talentId: id,
      authorId: auth.viewer.id,
      authorRole: auth.viewer.role,
      body: parsed.data.body,
    });
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

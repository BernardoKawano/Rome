import { NextResponse } from "next/server";
import { canCreateMeeting, canReadTalent } from "@/lib/access";
import { meetingInputSchema } from "@/lib/api-input";
import { jsonError, readJson, requireViewer } from "@/lib/guard";
import { getStore } from "@/lib/store";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Context) {
  const auth = await requireViewer();
  if (auth.error) return auth.error;
  const { id } = await context.params;
  if (!canReadTalent(auth.viewer, id)) {
    return NextResponse.json({ error: "Sem acesso às reuniões" }, { status: 403 });
  }

  try {
    const meetings = await getStore().listMeetings(id);
    return NextResponse.json(meetings);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request, context: Context) {
  const auth = await requireViewer();
  if (auth.error) return auth.error;
  if (!canCreateMeeting(auth.viewer)) {
    return NextResponse.json({ error: "Só o gestor marca reuniões" }, { status: 403 });
  }
  const { id } = await context.params;
  const parsed = meetingInputSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe título e data da reunião" }, { status: 400 });
  }

  try {
    const meeting = await getStore().addMeeting({
      talentId: id,
      title: parsed.data.title,
      startsAt: parsed.data.startsAt,
      link: parsed.data.link || null,
      notes: parsed.data.notes || null,
    });
    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

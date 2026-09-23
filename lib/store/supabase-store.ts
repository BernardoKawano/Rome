import type { Profile, Role } from "@/lib/access";
import { createDefaultBoard, safeParseBoardState, withCurrentVersion, type BoardState } from "@/lib/board-schema";
import type { AppMessage, Meeting, WeeklyReport } from "@/lib/records";
import { StoreError } from "@/lib/store-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  company: string | null;
};

function mapProfile(row: ProfileRow): Profile {
  if (row.role !== "gestor" && row.role !== "talento") {
    throw new StoreError("Papel inválido no perfil");
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    company: row.company,
  };
}

async function userClient() {
  return createSupabaseServerClient();
}

function adminClient() {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new StoreError("SUPABASE_SECRET_KEY é necessário para criar contas", 503);
  return admin;
}

export async function getProfile(id: string): Promise<Profile | null> {
  const supabase = await userClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, role, company")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new StoreError(error.message, 500);
  return data ? mapProfile(data as ProfileRow) : null;
}

export async function listTalents(): Promise<Profile[]> {
  const supabase = await userClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, role, company")
    .eq("role", "talento")
    .order("name");
  if (error) throw new StoreError(error.message, 500);
  return ((data ?? []) as ProfileRow[]).map(mapProfile);
}

export async function ensureGestorAccount(email: string, password: string, name: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  const normalized = email.trim().toLowerCase();
  const { data: existing, error: lookupError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("email", normalized)
    .maybeSingle();
  if (lookupError) throw new StoreError(lookupError.message, 500);
  if (!existing) {
    const created = await admin.auth.admin.createUser({
      email: normalized,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (created.error || !created.data.user) {
      throw new StoreError(created.error?.message ?? "Falha ao criar gestor", 500);
    }
    const id = created.data.user.id;
    const { error: profileError } = await admin.from("profiles").upsert({
      id,
      email: normalized,
      name: name.trim() || "Gestor",
      role: "gestor",
      company: null,
    });
    if (profileError) throw new StoreError(profileError.message, 500);
    const { error: boardError } = await admin.from("boards").upsert({
      talent_id: id,
      state: createDefaultBoard(),
    });
    if (boardError) throw new StoreError(boardError.message, 500);
    return;
  }
  if (existing.role !== "gestor") {
    const { error } = await admin.from("profiles").update({ role: "gestor" }).eq("id", existing.id);
    if (error) throw new StoreError(error.message, 500);
  }
}

export async function createTalentAccount(input: {
  name: string;
  email: string;
  password: string;
  company: string;
}): Promise<Profile> {
  const admin = adminClient();
  const email = input.email.trim().toLowerCase();
  const created = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name, company: input.company },
  });
  if (created.error || !created.data.user) {
    const message = created.error?.message ?? "Falha ao criar talento";
    const status = /already|registered|exists/i.test(message) ? 409 : 400;
    throw new StoreError(status === 409 ? "Este e-mail já está em uso" : message, status);
  }
  const profile: Profile = {
    id: created.data.user.id,
    email,
    name: input.name.trim(),
    role: "talento",
    company: input.company.trim(),
  };
  const { error: profileError } = await admin.from("profiles").upsert({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: "talento",
    company: profile.company,
  });
  if (profileError) throw new StoreError(profileError.message, 500);
  const { error: boardError } = await admin.from("boards").upsert({
    talent_id: profile.id,
    state: createDefaultBoard(),
  });
  if (boardError) throw new StoreError(boardError.message, 500);
  return profile;
}

export async function updateTalentAccount(
  id: string,
  patch: { name?: string; company?: string | null }
): Promise<Profile> {
  const admin = adminClient();
  const changes: { name?: string; company?: string | null } = {};
  if (patch.name) changes.name = patch.name.trim();
  if (patch.company !== undefined) changes.company = patch.company?.trim() || null;
  const { data, error } = await admin
    .from("profiles")
    .update(changes)
    .eq("id", id)
    .eq("role", "talento")
    .select("id, email, name, role, company")
    .maybeSingle();
  if (error) throw new StoreError(error.message, 500);
  if (!data) throw new StoreError("Talento não encontrado", 404);
  return mapProfile(data as ProfileRow);
}

export async function setRole(id: string, role: Role): Promise<void> {
  const admin = adminClient();
  const { error } = await admin.from("profiles").update({ role }).eq("id", id);
  if (error) throw new StoreError(error.message, 500);
}

export async function getBoard(talentId: string): Promise<BoardState> {
  const supabase = await userClient();
  const { data, error } = await supabase.from("boards").select("state").eq("talent_id", talentId).maybeSingle();
  if (error) throw new StoreError(error.message, 500);
  if (!data?.state) return createDefaultBoard();
  const parsed = safeParseBoardState(data.state);
  if (!parsed.success) return createDefaultBoard();
  return withCurrentVersion(parsed.data);
}

export async function saveBoard(talentId: string, board: BoardState): Promise<void> {
  const supabase = await userClient();
  const { error } = await supabase.from("boards").upsert({
    talent_id: talentId,
    state: withCurrentVersion(board),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new StoreError(error.message, 500);
}

export async function listMessages(talentId: string): Promise<AppMessage[]> {
  const supabase = await userClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, talent_id, author_id, author_role, body, created_at")
    .eq("talent_id", talentId)
    .order("created_at");
  if (error) throw new StoreError(error.message, 500);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    talentId: row.talent_id as string,
    authorId: row.author_id as string,
    authorRole: row.author_role as Role,
    body: row.body as string,
    createdAt: row.created_at as string,
  }));
}

export async function addMessage(input: Omit<AppMessage, "id" | "createdAt">): Promise<AppMessage> {
  const supabase = await userClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      talent_id: input.talentId,
      author_id: input.authorId,
      author_role: input.authorRole,
      body: input.body,
    })
    .select("id, talent_id, author_id, author_role, body, created_at")
    .single();
  if (error || !data) throw new StoreError(error?.message ?? "Falha ao gravar recado", 500);
  return {
    id: data.id as string,
    talentId: data.talent_id as string,
    authorId: data.author_id as string,
    authorRole: data.author_role as Role,
    body: data.body as string,
    createdAt: data.created_at as string,
  };
}

export async function listMeetings(talentId: string): Promise<Meeting[]> {
  const supabase = await userClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("id, talent_id, title, starts_at, link, notes, created_at")
    .eq("talent_id", talentId)
    .order("starts_at");
  if (error) throw new StoreError(error.message, 500);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    talentId: row.talent_id as string,
    title: row.title as string,
    startsAt: row.starts_at as string,
    link: (row.link as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}

export async function addMeeting(input: Omit<Meeting, "id" | "createdAt">): Promise<Meeting> {
  const supabase = await userClient();
  const { data, error } = await supabase
    .from("meetings")
    .insert({
      talent_id: input.talentId,
      title: input.title,
      starts_at: input.startsAt,
      link: input.link,
      notes: input.notes,
    })
    .select("id, talent_id, title, starts_at, link, notes, created_at")
    .single();
  if (error || !data) throw new StoreError(error?.message ?? "Falha ao marcar reunião", 500);
  return {
    id: data.id as string,
    talentId: data.talent_id as string,
    title: data.title as string,
    startsAt: data.starts_at as string,
    link: (data.link as string | null) ?? null,
    notes: (data.notes as string | null) ?? null,
    createdAt: data.created_at as string,
  };
}

export async function getReport(
  talentId: string,
  periodStart: string,
  periodEnd: string
): Promise<WeeklyReport | null> {
  const supabase = await userClient();
  const { data, error } = await supabase
    .from("weekly_reports")
    .select("talent_id, period_start, period_end, narrative, snapshot, updated_at")
    .eq("talent_id", talentId)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .maybeSingle();
  if (error) throw new StoreError(error.message, 500);
  if (!data) return null;
  return {
    talentId: data.talent_id as string,
    periodStart: data.period_start as string,
    periodEnd: data.period_end as string,
    narrative: (data.narrative as string) ?? "",
    snapshot: data.snapshot as WeeklyReport["snapshot"],
    updatedAt: data.updated_at as string,
  };
}

export async function saveReport(report: WeeklyReport): Promise<WeeklyReport> {
  const supabase = await userClient();
  const { error } = await supabase.from("weekly_reports").upsert({
    talent_id: report.talentId,
    period_start: report.periodStart,
    period_end: report.periodEnd,
    narrative: report.narrative,
    snapshot: report.snapshot,
    updated_at: report.updatedAt,
  });
  if (error) throw new StoreError(error.message, 500);
  return report;
}

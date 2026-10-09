import fs from "fs/promises";
import path from "path";
import type { Profile, Role } from "@/lib/access";
import { createDefaultBoard, safeParseBoardState, withCurrentVersion, type BoardState } from "@/lib/board-schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { AppMessage, Meeting, WeeklyReport } from "@/lib/records";
import { StoreError } from "@/lib/store-error";
import { configuredGestorEmail, isFileStoreAllowed } from "@/lib/supabase/env";

type StoredUser = Profile & {
  passwordSalt: string;
  passwordHash: string;
};

type AppData = {
  users: StoredUser[];
  boards: Record<string, unknown>;
  messages: AppMessage[];
  meetings: Meeting[];
  reports: WeeklyReport[];
};

function assertFileStoreAllowed(): void {
  if (!isFileStoreAllowed()) {
    throw new StoreError(
      "Em produção configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (o disco da Vercel não guarda dados).",
      503
    );
  }
}

function dataFile(): string {
  const dir = process.env.APP_DATA_DIR?.trim() || path.join(process.cwd(), ".data");
  return path.join(dir, "app-store.json");
}

function emptyData(): AppData {
  return { users: [], boards: {}, messages: [], meetings: [], reports: [] };
}

async function readUnlocked(): Promise<AppData> {
  try {
    const raw = await fs.readFile(dataFile(), "utf-8");
    const parsed = JSON.parse(raw) as AppData;
    return {
      users: parsed.users ?? [],
      boards: parsed.boards ?? {},
      messages: parsed.messages ?? [],
      meetings: parsed.meetings ?? [],
      reports: parsed.reports ?? [],
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return emptyData();
    throw error;
  }
}

async function writeUnlocked(data: AppData): Promise<void> {
  assertFileStoreAllowed();
  const file = dataFile();
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(data), "utf-8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "EACCES" || code === "EROFS") {
      throw new StoreError(
        "Em produção configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (o disco da Vercel não guarda dados).",
        503
      );
    }
    throw error;
  }
}

let queue: Promise<void> = Promise.resolve();

async function update<T>(fn: (data: AppData) => T | Promise<T>): Promise<T> {
  let result!: T;
  const run = queue.then(async () => {
    const data = await readUnlocked();
    result = await fn(data);
    await writeUnlocked(data);
  });
  queue = run.then(
    () => undefined,
    () => undefined
  );
  await run;
  return result;
}

function toProfile(user: StoredUser): Profile {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    company: user.company,
  };
}

export async function getProfile(id: string): Promise<Profile | null> {
  const data = await readUnlocked();
  const user = data.users.find((item) => item.id === id);
  return user ? toProfile(user) : null;
}

export async function listTalents(): Promise<Profile[]> {
  const data = await readUnlocked();
  return data.users.filter((user) => user.role === "talento").map(toProfile);
}

export async function loginWithPassword(email: string, password: string): Promise<Profile | null> {
  const normalized = email.trim().toLowerCase();
  return update((data) => {
    const user = data.users.find((item) => item.email === normalized);
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return null;
    }
    if (configuredGestorEmail() === user.email && user.role !== "gestor") {
      user.role = "gestor";
    }
    return toProfile(user);
  });
}

export async function ensureGestorAccount(email: string, password: string, name: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await update((data) => {
    const existing = data.users.find((user) => user.email === normalized);
    if (!existing) {
      const { salt, hash } = hashPassword(password);
      const id = crypto.randomUUID();
      data.users.push({
        id,
        email: normalized,
        name: name.trim() || "Gestor",
        role: "gestor",
        company: null,
        passwordSalt: salt,
        passwordHash: hash,
      });
      data.boards[id] = createDefaultBoard();
      return;
    }
    if (existing.role !== "gestor") existing.role = "gestor";
  });
}

export async function createTalentAccount(input: {
  name: string;
  email: string;
  password: string;
  company: string;
}): Promise<Profile> {
  const email = input.email.trim().toLowerCase();
  return update((data) => {
    if (data.users.some((user) => user.email === email)) {
      throw new StoreError("Este e-mail já está em uso", 409);
    }
    const { salt, hash } = hashPassword(input.password);
    const profile: Profile = {
      id: crypto.randomUUID(),
      email,
      name: input.name.trim(),
      role: "talento",
      company: input.company.trim(),
    };
    data.users.push({ ...profile, passwordSalt: salt, passwordHash: hash });
    data.boards[profile.id] = createDefaultBoard();
    return profile;
  });
}

export async function updateTalentAccount(
  id: string,
  patch: { name?: string; company?: string | null }
): Promise<Profile> {
  return update((data) => {
    const user = data.users.find((item) => item.id === id && item.role === "talento");
    if (!user) throw new StoreError("Talento não encontrado", 404);
    if (patch.name) user.name = patch.name.trim();
    if (patch.company !== undefined) user.company = patch.company?.trim() || null;
    return toProfile(user);
  });
}

export async function setRole(id: string, role: Role): Promise<void> {
  await update((data) => {
    const user = data.users.find((item) => item.id === id);
    if (!user) throw new StoreError("Utilizador não encontrado", 404);
    user.role = role;
  });
}

export async function getBoard(talentId: string): Promise<BoardState> {
  const data = await readUnlocked();
  const raw = data.boards[talentId];
  if (!raw) return createDefaultBoard();
  const parsed = safeParseBoardState(raw);
  if (!parsed.success) return createDefaultBoard();
  return withCurrentVersion(parsed.data);
}

export async function saveBoard(talentId: string, board: BoardState): Promise<void> {
  const next = withCurrentVersion(board);
  await update((data) => {
    data.boards[talentId] = next;
  });
}

export async function listMessages(talentId: string): Promise<AppMessage[]> {
  const data = await readUnlocked();
  return data.messages
    .filter((message) => message.talentId === talentId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

export async function addMessage(input: Omit<AppMessage, "id" | "createdAt">): Promise<AppMessage> {
  const message: AppMessage = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await update((data) => {
    data.messages.push(message);
  });
  return message;
}

export async function listMeetings(talentId: string): Promise<Meeting[]> {
  const data = await readUnlocked();
  return data.meetings
    .filter((meeting) => meeting.talentId === talentId)
    .sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1));
}

export async function addMeeting(input: Omit<Meeting, "id" | "createdAt">): Promise<Meeting> {
  const meeting: Meeting = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await update((data) => {
    data.meetings.push(meeting);
  });
  return meeting;
}

export async function deleteMeeting(talentId: string, meetingId: string): Promise<boolean> {
  let removed = false;
  await update((data) => {
    const before = data.meetings.length;
    data.meetings = data.meetings.filter((meeting) => !(meeting.id === meetingId && meeting.talentId === talentId));
    removed = data.meetings.length < before;
  });
  return removed;
}

export async function getReport(
  talentId: string,
  periodStart: string,
  periodEnd: string
): Promise<WeeklyReport | null> {
  const data = await readUnlocked();
  return (
    data.reports.find(
      (report) =>
        report.talentId === talentId && report.periodStart === periodStart && report.periodEnd === periodEnd
    ) ?? null
  );
}

export async function saveReport(report: WeeklyReport): Promise<WeeklyReport> {
  await update((data) => {
    const index = data.reports.findIndex(
      (item) =>
        item.talentId === report.talentId &&
        item.periodStart === report.periodStart &&
        item.periodEnd === report.periodEnd
    );
    if (index >= 0) data.reports[index] = report;
    else data.reports.push(report);
  });
  return report;
}

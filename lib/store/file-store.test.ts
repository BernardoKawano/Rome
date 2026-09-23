import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCard } from "@/lib/board-schema";
import { weekRange, summarizeCompleted } from "@/lib/impact";
import {
  addMessage,
  addMeeting,
  createTalentAccount,
  ensureGestorAccount,
  getBoard,
  listMessages,
  listTalents,
  loginWithPassword,
  saveBoard,
} from "./file-store";

describe("file-store", () => {
  let tmpDir: string;
  const previous = process.env.APP_DATA_DIR;
  const previousEmail = process.env.GESTOR_EMAIL;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "rome-store-"));
    process.env.APP_DATA_DIR = tmpDir;
    process.env.GESTOR_EMAIL = "gestor@masterboard.com.br";
  });

  afterEach(async () => {
    if (previous === undefined) delete process.env.APP_DATA_DIR;
    else process.env.APP_DATA_DIR = previous;
    if (previousEmail === undefined) delete process.env.GESTOR_EMAIL;
    else process.env.GESTOR_EMAIL = previousEmail;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("cria gestor e talento, guarda o quadro e calcula a semana", async () => {
    await ensureGestorAccount("gestor@masterboard.com.br", "senha-gestor-teste", "Bernardo");
    const gestor = await loginWithPassword("gestor@masterboard.com.br", "senha-gestor-teste");
    expect(gestor?.role).toBe("gestor");
    expect(await loginWithPassword("gestor@masterboard.com.br", "errada")).toBeNull();

    const talento = await createTalentAccount({
      name: "Allan",
      email: "allan@masterboard.com.br",
      password: "senha-do-allan",
      company: "Casa do Caminhão",
    });

    const card = {
      ...createCard({ title: "Automação de pátio", company: "Casa do Caminhão" }),
      hoursSpent: 8,
      movesNeedle: true,
      needleKind: "despesa" as const,
      impactAmount: 900,
      completedAt: "2026-09-22T15:00:00.000Z",
    };
    const board = await getBoard(talento.id);
    board.cards[card.id] = card;
    board.columns.done = [card.id];
    await saveBoard(talento.id, board);

    const saved = await getBoard(talento.id);
    const summary = summarizeCompleted(saved, weekRange(new Date("2026-09-23T15:00:00.000Z")));
    expect(summary.meetsTarget).toBe(true);
    expect(summary.byKind.despesa).toBe(900);

    const talents = await listTalents();
    expect(talents.map((item) => item.email)).toEqual(["allan@masterboard.com.br"]);

    await addMessage({
      talentId: talento.id,
      authorId: talento.id,
      authorRole: "talento",
      body: "Fechei a automação do pátio.",
    });
    await addMeeting({
      talentId: talento.id,
      title: "Feedback da semana",
      startsAt: "2026-09-25T18:00:00.000Z",
      link: "https://meet.example/allan",
      notes: null,
    });
    const messages = await listMessages(talento.id);
    expect(messages[0]?.body).toBe("Fechei a automação do pátio.");
  });
});

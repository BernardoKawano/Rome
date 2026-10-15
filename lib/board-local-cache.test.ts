import { describe, expect, it } from "vitest";
import type { BoardState } from "./board-schema";
import { boardHasContent, mergeBoardSources, pickNewerBoard } from "./board-local-cache";

function board(cards: Record<string, { updatedAt: string }>): BoardState {
  const cardEntries = Object.fromEntries(
    Object.entries(cards).map(([id, meta]) => [
      id,
      {
        id,
        title: id,
        subItems: [],
        hoursSpent: 0,
        movesNeedle: false,
        isPoc: false,
        pocRecipients: [],
        pocAccess: [],
        createdAt: meta.updatedAt,
        updatedAt: meta.updatedAt,
      },
    ])
  );
  return {
    version: 1,
    columns: { todo: Object.keys(cards), doing: [], done: [] },
    cards: cardEntries,
    completedLog: [],
    candidates: [],
  };
}

describe("board-local-cache", () => {
  it("boardHasContent detecta tabuleiro vazio", () => {
    const empty = board({});
    expect(boardHasContent(empty)).toBe(false);
    expect(boardHasContent(board({ a: { updatedAt: "2026-01-01T00:00:00.000Z" } }))).toBe(true);
  });

  it("pickNewerBoard prefere updatedAt mais recente", () => {
    const older = board({ a: { updatedAt: "2026-01-01T00:00:00.000Z" } });
    const newer = board({ a: { updatedAt: "2026-05-01T00:00:00.000Z" } });
    expect(pickNewerBoard(older, newer)).toBe(newer);
  });

  it("mergeBoardSources usa local se servidor vazio", () => {
    const server = board({});
    const local = board({ x: { updatedAt: "2026-05-01T00:00:00.000Z" } });
    expect(mergeBoardSources(server, local)).toBe(local);
  });

  it("entrevista recente conta como conteúdo e vence cartão mais antigo", () => {
    const older = board({ a: { updatedAt: "2026-01-01T00:00:00.000Z" } });
    const withInterview = {
      ...board({}),
      candidates: [
        {
          id: "p1",
          name: "Ana Lima",
          address: "Rua do Pátio, 10",
          culturalScore: 8,
          technicalScore: 7,
          pocs: "",
          phone: "",
          stage: "list",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
    };
    expect(boardHasContent(withInterview)).toBe(true);
    expect(pickNewerBoard(older, withInterview)).toBe(withInterview);
  });
});

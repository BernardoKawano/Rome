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
});

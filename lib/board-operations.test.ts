import { describe, expect, it } from "vitest";
import type { BoardState } from "./board-schema";
import { createCard, createDefaultBoard, safeParseBoardState, withCurrentVersion } from "./board-schema";
import { applyCompletionOnMove, assertBoardIntegrity, moveCardBetweenColumns, removeCard } from "./board-operations";

describe("board-schema", () => {
  it("cria tabuleiro vazio válido", () => {
    const b = createDefaultBoard();
    expect(b.version).toBe(2);
    expect(b.columns.todo).toEqual([]);
    assertBoardIntegrity(b);
  });

  it("cria cartão com timestamps", () => {
    const c = createCard({ title: "Teste" });
    expect(c.title).toBe("Teste");
    expect(c.subItems).toEqual([]);
    expect(c.hoursSpent).toBe(0);
    expect(c.movesNeedle).toBe(false);
    expect(c.createdAt).toBe(c.updatedAt);
  });
});

describe("applyCompletionOnMove", () => {
  it("preenche completedAt e registo ao entrar em done", () => {
    const card = createCard({ title: "Demanda X" });
    const state = {
      ...createDefaultBoard(),
      columns: { todo: [card.id], doing: [], done: [] },
      cards: { [card.id]: card },
    };
    assertBoardIntegrity(state);
    const now = "2026-05-14T12:00:00.000Z";
    let next = moveCardBetweenColumns(state, card.id, "todo", "done", 0);
    next = applyCompletionOnMove(next, card.id, "todo", "done", now);
    expect(next.cards[card.id].completedAt).toBe(now);
    expect(next.completedLog[0]).toEqual({ id: card.id, title: "Demanda X", completedAt: now });
  });

  it("remove completedAt ao sair de done", () => {
    const card = createCard({ title: "Y" });
    const now = "2026-05-14T12:00:00.000Z";
    let state: BoardState = {
      ...createDefaultBoard(),
      columns: { todo: [], doing: [], done: [card.id] },
      cards: { [card.id]: { ...card, completedAt: now, updatedAt: now } },
      completedLog: [{ id: card.id, title: "Y", completedAt: now }],
    };
    state = moveCardBetweenColumns(state, card.id, "done", "todo", 0);
    state = applyCompletionOnMove(state, card.id, "done", "todo", "2026-05-14T13:00:00.000Z");
    expect(state.cards[card.id].completedAt).toBeUndefined();
  });
});

describe("removeCard", () => {
  it("tira o cartão realizado das colunas e do registo", () => {
    const card = createCard({ title: "Automação de pátio", company: "Casa do Caminhão" });
    const now = "2026-09-22T15:00:00.000Z";
    const state: BoardState = {
      ...createDefaultBoard(),
      columns: { todo: [], doing: [], done: [card.id] },
      cards: { [card.id]: { ...card, completedAt: now, hoursSpent: 8, movesNeedle: true, needleKind: "despesa" } },
      completedLog: [{ id: card.id, title: card.title, completedAt: now }],
    };
    const next = removeCard(state, card.id);
    expect(next.cards[card.id]).toBeUndefined();
    expect(next.columns.done).toEqual([]);
    expect(next.completedLog).toEqual([]);
    assertBoardIntegrity(next);
  });
});

describe("safeParseBoardState", () => {
  it("rejeita JSON inválido", () => {
    const r = safeParseBoardState({ version: 2 });
    expect(r.success).toBe(false);
  });

  it("aceita quadro da versão 1 e promove para a versão 2", () => {
    const legacy = {
      version: 1,
      columns: { todo: [], doing: [], done: [] },
      cards: {
        c1: {
          id: "c1",
          title: "Sem impacto",
          subItems: [],
          createdAt: "2026-05-14T12:00:00.000Z",
          updatedAt: "2026-05-14T12:00:00.000Z",
        },
      },
      completedLog: [],
    };
    const parsed = safeParseBoardState(legacy);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.cards.c1.hoursSpent).toBe(0);
    expect(parsed.data.cards.c1.movesNeedle).toBe(false);
    expect(withCurrentVersion(parsed.data).version).toBe(2);
  });
});

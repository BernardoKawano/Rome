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
    expect(c.isPoc).toBe(false);
    expect(c.pocRecipients).toEqual([]);
    expect(c.pocAccess).toEqual([]);
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
    expect(parsed.data.cards.c1.isPoc).toBe(false);
    expect(parsed.data.cards.c1.pocRecipients).toEqual([]);
    expect(parsed.data.cards.c1.pocAccess).toEqual([]);
    expect(parsed.data.candidates).toEqual([]);
    expect(withCurrentVersion(parsed.data).version).toBe(2);
  });

  it("aceita POC com destinatário e acesso", () => {
    const card = {
      ...createCard({ title: "POC de pátio" }),
      isPoc: true,
      pocCompany: "Casa do Caminhão",
      pocAddress: "Rua do Pátio, 10",
      pocRecipients: [
        { id: "r1", name: "Ana Lima", role: "Operações", sentAt: "2026-10-01T12:00:00.000Z" },
      ],
      pocAccess: [
        {
          id: "a1",
          label: "Staging",
          role: "leitura",
          url: "https://staging.exemplo",
          notes: "Painel de fretes",
        },
      ],
    };
    const parsed = safeParseBoardState({
      ...createDefaultBoard(),
      columns: { todo: [card.id], doing: [], done: [] },
      cards: { [card.id]: card },
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.cards[card.id].pocCompany).toBe("Casa do Caminhão");
    expect(parsed.data.cards[card.id].pocRecipients[0].name).toBe("Ana Lima");
    expect(parsed.data.cards[card.id].pocAccess[0].label).toBe("Staging");
    expect(parsed.data.cards[card.id].pocAccess[0].notes).toBe("Painel de fretes");
  });

  it("rejeita acesso com senha", () => {
    const card = {
      ...createCard({ title: "POC" }),
      isPoc: true,
      pocAccess: [{ id: "a1", label: "Staging", password: "segredo" }],
    };
    const parsed = safeParseBoardState({
      ...createDefaultBoard(),
      columns: { todo: [card.id], doing: [], done: [] },
      cards: { [card.id]: card },
    });
    expect(parsed.success).toBe(false);
  });

  it("aceita entrevista com endereço e notas", () => {
    const parsed = safeParseBoardState({
      ...createDefaultBoard(),
      candidates: [
        {
          id: "p1",
          name: "Ana Lima",
          address: "Rua do Pátio, 10",
          culturalScore: 8,
          technicalScore: 7.5,
          updatedAt: "2026-10-15T12:00:00.000Z",
        },
      ],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.candidates[0].address).toBe("Rua do Pátio, 10");
    expect(parsed.data.candidates[0].culturalScore).toBe(8);
    expect(parsed.data.candidates[0].technicalScore).toBe(7.5);
    expect(parsed.data.candidates[0].pocs).toBe("");
  });

  it("guarda o texto livre das POCs da pessoa", () => {
    const parsed = safeParseBoardState({
      ...createDefaultBoard(),
      candidates: [
        {
          id: "p1",
          name: "Ana Lima",
          address: "Rua do Pátio, 10",
          culturalScore: 8,
          technicalScore: 7,
          pocs: "POC de pátio enviada em outubro. Acesso de leitura no staging.",
          updatedAt: "2026-10-15T12:00:00.000Z",
        },
      ],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.candidates[0].pocs).toContain("POC de pátio");
  });

  it("rejeita nota técnica acima de 10", () => {
    const parsed = safeParseBoardState({
      ...createDefaultBoard(),
      candidates: [
        {
          id: "p1",
          name: "Ana Lima",
          address: "Rua do Pátio, 10",
          culturalScore: 8,
          technicalScore: 11,
          updatedAt: "2026-10-15T12:00:00.000Z",
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});

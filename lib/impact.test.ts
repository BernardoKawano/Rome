import { describe, expect, it } from "vitest";
import { createCard, createDefaultBoard } from "./board-schema";
import type { BoardState, Card } from "./board-schema";
import {
  defaultSprintRange,
  formatNeedlePercent,
  monthRange,
  sprintRange,
  summarizeCompleted,
  weekRange,
} from "./impact";

function boardWith(cards: Card[]): BoardState {
  return {
    ...createDefaultBoard(),
    columns: {
      todo: [],
      doing: [],
      done: cards.map((card) => card.id),
    },
    cards: Object.fromEntries(cards.map((card) => [card.id, card])),
  };
}

describe("períodos em America/Sao_Paulo", () => {
  it("semana de quarta 23 set 2026 começa na segunda 21 set às 00:00", () => {
    const range = weekRange(new Date("2026-09-23T15:00:00.000Z"));
    expect(range.start).toBe("2026-09-21T03:00:00.000Z");
    expect(range.end).toBe("2026-09-28T03:00:00.000Z");
  });

  it("mês de setembro 2026 vai de 1 set a 1 out", () => {
    const range = monthRange(new Date("2026-09-23T15:00:00.000Z"));
    expect(range.start).toBe("2026-09-01T03:00:00.000Z");
    expect(range.end).toBe("2026-10-01T03:00:00.000Z");
  });

  it("sprint inclusivo de 8 a 21 set cobre o dia 21 inteiro", () => {
    const range = sprintRange("2026-09-08", "2026-09-21");
    expect(range.start).toBe("2026-09-08T03:00:00.000Z");
    expect(range.end).toBe("2026-09-22T03:00:00.000Z");
  });

  it("rejeita sprint com fim antes do início", () => {
    expect(() => sprintRange("2026-09-21", "2026-09-08")).toThrow(/inválido/);
  });

  it("sprint padrão cobre 14 dias até o dia da âncora", () => {
    expect(defaultSprintRange(new Date("2026-09-23T15:00:00.000Z"))).toEqual({
      startDay: "2026-09-10",
      endDay: "2026-09-23",
    });
  });
});

describe("summarizeCompleted", () => {
  it("8 h de automação que reduz despesa e 2 h operacionais atingem 80%", () => {
    const automacao = {
      ...createCard({ title: "Automação de conferência de fretes", company: "Casa do Caminhão" }),
      hoursSpent: 8,
      movesNeedle: true,
      needleKind: "despesa" as const,
      impactAmount: 1200,
      completedAt: "2026-09-22T15:00:00.000Z",
    };
    const operacional = {
      ...createCard({ title: "Organizar pastas do Drive", company: "Casa do Caminhão" }),
      hoursSpent: 2,
      movesNeedle: false,
      completedAt: "2026-09-23T18:00:00.000Z",
    };
    const foraDaSemana = {
      ...createCard({ title: "Robô de cotações da semana anterior" }),
      hoursSpent: 6,
      movesNeedle: true,
      needleKind: "tempo" as const,
      impactAmount: 6,
      completedAt: "2026-09-18T15:00:00.000Z",
    };
    const emProgresso = {
      ...createCard({ title: "Ainda em progresso" }),
      hoursSpent: 4,
      movesNeedle: true,
      needleKind: "receita" as const,
    };

    const summary = summarizeCompleted(
      boardWith([automacao, operacional, foraDaSemana, emProgresso]),
      weekRange(new Date("2026-09-23T15:00:00.000Z"))
    );

    expect(summary.cards.map((card) => card.title)).toEqual([
      "Organizar pastas do Drive",
      "Automação de conferência de fretes",
    ]);
    expect(summary.needleHours).toBe(8);
    expect(summary.operationalHours).toBe(2);
    expect(summary.totalHours).toBe(10);
    expect(summary.percent).toBeCloseTo(0.8);
    expect(summary.meetsTarget).toBe(true);
    expect(summary.byKind.despesa).toBe(1200);
    expect(summary.byKind.receita).toBe(0);
    expect(formatNeedlePercent(summary.percent)).toBe("80%");
  });

  it("abaixo de 80% não atinge a meta", () => {
    const card = {
      ...createCard({ title: "Reunião sem entrega" }),
      hoursSpent: 3,
      movesNeedle: false,
      completedAt: "2026-09-22T15:00:00.000Z",
    };
    const needle = {
      ...createCard({ title: "Corte de hora extra" }),
      hoursSpent: 1,
      movesNeedle: true,
      needleKind: "despesa" as const,
      impactAmount: 400,
      completedAt: "2026-09-22T16:00:00.000Z",
    };
    const summary = summarizeCompleted(
      boardWith([card, needle]),
      weekRange(new Date("2026-09-23T15:00:00.000Z"))
    );
    expect(summary.meetsTarget).toBe(false);
    expect(formatNeedlePercent(summary.percent)).toBe("25%");
  });

  it("período sem horas não finge que a meta foi batida", () => {
    const summary = summarizeCompleted(
      createDefaultBoard(),
      monthRange(new Date("2026-09-23T15:00:00.000Z"))
    );
    expect(summary.percent).toBeNull();
    expect(summary.meetsTarget).toBe(false);
    expect(formatNeedlePercent(summary.percent)).toBe("—");
  });

  it("domingo à noite em São Paulo fica na semana anterior", () => {
    const card = {
      ...createCard({ title: "Fechado domingo" }),
      hoursSpent: 1,
      movesNeedle: true,
      needleKind: "tempo" as const,
      impactAmount: 1,
      completedAt: "2026-09-21T02:00:00.000Z",
    };
    const summary = summarizeCompleted(
      boardWith([card]),
      weekRange(new Date("2026-09-23T15:00:00.000Z"))
    );
    expect(summary.cards).toHaveLength(0);
  });
});

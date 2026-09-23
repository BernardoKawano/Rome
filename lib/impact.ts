import type { BoardState, Card, NeedleKind } from "./board-schema";

/** Meta: 80% das horas em trabalho que mexe o ponteiro. */
export const NEEDLE_HOUR_TARGET = 0.8;

/** Semana e mês usam o calendário de São Paulo (UTC−3, sem horário de verão). */
export const REPORT_TIMEZONE = "America/Sao_Paulo";

export type PeriodRange = {
  /** Início inclusivo, ISO UTC. */
  start: string;
  /** Fim exclusivo, ISO UTC. */
  end: string;
};

export type ImpactCardSnapshot = {
  id: string;
  title: string;
  description?: string;
  company?: string;
  hoursSpent: number;
  movesNeedle: boolean;
  needleKind?: NeedleKind;
  impactAmount?: number;
  completedAt: string;
};

export type ImpactSummary = {
  needleHours: number;
  operationalHours: number;
  totalHours: number;
  /** null quando não há horas registadas no período. */
  percent: number | null;
  meetsTarget: boolean;
  byKind: Record<NeedleKind, number>;
  cards: ImpactCardSnapshot[];
};

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function zonedParts(date: Date): { year: number; month: number; day: number; weekday: string } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday"),
  };
}

function addDays(
  year: number,
  month: number,
  day: number,
  delta: number
): { year: number; month: number; day: number } {
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + delta);
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

function saoPauloStart(year: number, month: number, day: number): Date {
  return new Date(`${year}-${pad(month)}-${pad(day)}T00:00:00.000-03:00`);
}

function formatDay(parts: { year: number; month: number; day: number }): string {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function parseDay(value: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Data de sprint inválida");
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function weekRange(anchor: Date): PeriodRange {
  const parts = zonedParts(anchor);
  const index = WEEKDAY_INDEX[parts.weekday] ?? 0;
  const monday = addDays(parts.year, parts.month, parts.day, -index);
  const next = addDays(monday.year, monday.month, monday.day, 7);
  return {
    start: saoPauloStart(monday.year, monday.month, monday.day).toISOString(),
    end: saoPauloStart(next.year, next.month, next.day).toISOString(),
  };
}

export function monthRange(anchor: Date): PeriodRange {
  const { year, month } = zonedParts(anchor);
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return {
    start: saoPauloStart(year, month, 1).toISOString(),
    end: saoPauloStart(next.year, next.month, 1).toISOString(),
  };
}

/** `startDay` e `endDay` são dias de calendário (YYYY-MM-DD), inclusivos, em São Paulo. */
export function sprintRange(startDay: string, endDay: string): PeriodRange {
  const startParts = parseDay(startDay);
  const endParts = parseDay(endDay);
  const endExclusive = addDays(endParts.year, endParts.month, endParts.day, 1);
  const start = saoPauloStart(startParts.year, startParts.month, startParts.day);
  const end = saoPauloStart(endExclusive.year, endExclusive.month, endExclusive.day);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new Error("Intervalo de sprint inválido");
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

export function defaultSprintRange(anchor: Date): { startDay: string; endDay: string } {
  const parts = zonedParts(anchor);
  const start = addDays(parts.year, parts.month, parts.day, -13);
  return { startDay: formatDay(start), endDay: formatDay(parts) };
}

export function isInPeriod(iso: string, range: PeriodRange): boolean {
  return iso >= range.start && iso < range.end;
}

export function meetsNeedleTarget(needleHours: number, totalHours: number): boolean {
  if (totalHours <= 0) return false;
  return needleHours * 1000 >= totalHours * NEEDLE_HOUR_TARGET * 1000;
}

export function formatNeedlePercent(percent: number | null): string {
  if (percent == null) return "—";
  return `${Math.round(percent * 100)}%`;
}

function snapshotFromCard(card: Card, completedAt: string): ImpactCardSnapshot {
  return {
    id: card.id,
    title: card.title,
    description: card.description,
    company: card.company,
    hoursSpent: card.hoursSpent,
    movesNeedle: card.movesNeedle,
    needleKind: card.movesNeedle ? card.needleKind : undefined,
    impactAmount: card.movesNeedle ? card.impactAmount : undefined,
    completedAt,
  };
}

/** Soma cartões com `completedAt` dentro do intervalo. Horas sem `movesNeedle` são operacionais. */
export function summarizeCompleted(board: BoardState, range: PeriodRange): ImpactSummary {
  const byKind: Record<NeedleKind, number> = { receita: 0, despesa: 0, tempo: 0 };
  const cards: ImpactCardSnapshot[] = [];
  let needleHours = 0;
  let operationalHours = 0;

  for (const card of Object.values(board.cards)) {
    if (!card.completedAt || !isInPeriod(card.completedAt, range)) continue;
    const snap = snapshotFromCard(card, card.completedAt);
    cards.push(snap);
    if (card.movesNeedle) {
      needleHours += card.hoursSpent;
      if (card.needleKind && card.impactAmount) {
        byKind[card.needleKind] += card.impactAmount;
      }
    } else {
      operationalHours += card.hoursSpent;
    }
  }

  cards.sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  const totalHours = needleHours + operationalHours;
  const percent = totalHours > 0 ? needleHours / totalHours : null;

  return {
    needleHours,
    operationalHours,
    totalHours,
    percent,
    meetsTarget: meetsNeedleTarget(needleHours, totalHours),
    byKind,
    cards,
  };
}

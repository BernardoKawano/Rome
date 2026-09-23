"use client";

import type { BoardState } from "@/lib/board-schema";
import {
  defaultSprintRange,
  formatNeedlePercent,
  monthRange,
  sprintRange,
  summarizeCompleted,
  weekRange,
  type PeriodRange,
} from "@/lib/impact";
import { useEffect, useMemo, useState } from "react";

type PeriodKind = "week" | "month" | "sprint";

type Props = {
  talentId: string;
  board: BoardState;
  readOnly: boolean;
};

const KIND_LABEL = {
  receita: "Receita",
  despesa: "Despesa",
  tempo: "Tempo",
} as const;

export function WeeklyReportPanel({ talentId, board, readOnly }: Props) {
  const [kind, setKind] = useState<PeriodKind>("week");
  const [sprint, setSprint] = useState(() => defaultSprintRange(new Date()));
  const [narrative, setNarrative] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const range: PeriodRange | null = useMemo(() => {
    const now = new Date();
    if (kind === "week") return weekRange(now);
    if (kind === "month") return monthRange(now);
    try {
      return sprintRange(sprint.startDay, sprint.endDay);
    } catch {
      return null;
    }
  }, [kind, sprint.endDay, sprint.startDay]);

  const summary = useMemo(
    () => (range ? summarizeCompleted(board, range) : null),
    [board, range]
  );

  useEffect(() => {
    if (!range) return;
    let cancelled = false;
    const params = new URLSearchParams({ start: range.start, end: range.end });
    void fetch(`/api/talents/${talentId}/reports?${params}`)
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { narrative?: string } | null;
      })
      .then((report) => {
        if (!cancelled) setNarrative(report?.narrative ?? "");
      })
      .catch(() => {
        if (!cancelled) setNarrative("");
      });
    return () => {
      cancelled = true;
    };
  }, [range, talentId]);

  async function save() {
    if (!range || readOnly) return;
    setStatus("A guardar…");
    const res = await fetch(`/api/talents/${talentId}/reports`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodStart: range.start,
        periodEnd: range.end,
        narrative,
      }),
    });
    setStatus(res.ok ? "Relatório guardado" : "Não foi possível guardar o relatório");
  }

  return (
    <section className="border border-neutral-200 bg-white">
      <header className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Relatório</h2>
          <p className="mt-1 text-[11px] text-neutral-400">
            O que foi realizado no período. A meta é 80% das horas no ponteiro.
          </p>
        </div>
        <div className="flex gap-2">
          {(
            [
              ["week", "Semana"],
              ["month", "Mês"],
              ["sprint", "Sprint"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={`border px-3 py-1 text-[11px] uppercase tracking-wide ${
                kind === value ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>
      <div className="space-y-4 px-4 py-4">
        {kind === "sprint" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Início
              <input
                type="date"
                value={sprint.startDay}
                onChange={(e) => setSprint((current) => ({ ...current, startDay: e.target.value }))}
                className="mt-1 w-full border border-neutral-200 px-2 py-2 text-sm"
              />
            </label>
            <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Fim
              <input
                type="date"
                value={sprint.endDay}
                onChange={(e) => setSprint((current) => ({ ...current, endDay: e.target.value }))}
                className="mt-1 w-full border border-neutral-200 px-2 py-2 text-sm"
              />
            </label>
          </div>
        ) : null}

        {summary ? (
          <>
            <p className="text-sm text-neutral-800">
              {formatNeedlePercent(summary.percent)} das horas mexeram o ponteiro ({summary.needleHours} h de{" "}
              {summary.totalHours} h).
              {summary.byKind.despesa > 0 ? ` Despesa reduzida: R$ ${summary.byKind.despesa}.` : ""}
              {summary.byKind.receita > 0 ? ` Receita: R$ ${summary.byKind.receita}.` : ""}
              {summary.byKind.tempo > 0 ? ` Tempo economizado: ${summary.byKind.tempo} h.` : ""}
            </p>
            {summary.cards.length === 0 ? (
              <p className="text-sm text-neutral-400">Nada em Realizado neste período.</p>
            ) : (
              <ul className="divide-y divide-neutral-100 border border-neutral-100">
                {summary.cards.map((card) => (
                  <li key={`${card.id}-${card.completedAt}`} className="px-3 py-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <span className="text-sm text-neutral-900">{card.title}</span>
                      <span className="text-[11px] uppercase tracking-wide text-neutral-500">
                        {card.hoursSpent} h ·{" "}
                        {card.movesNeedle && card.needleKind ? KIND_LABEL[card.needleKind] : "Operacional"}
                      </span>
                    </div>
                    {card.description ? <p className="mt-1 text-sm text-neutral-600">{card.description}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-sm text-neutral-500">Escolha um intervalo de sprint válido.</p>
        )}

        <label className="block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          O que entreguei neste período
          <textarea
            value={narrative}
            disabled={readOnly}
            onChange={(e) => setNarrative(e.target.value)}
            rows={4}
            placeholder="O resultado para a empresa, em poucas linhas."
            className="mt-2 w-full resize-none border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-400 disabled:bg-neutral-50"
          />
        </label>
        {readOnly ? null : (
          <button
            type="button"
            onClick={() => void save()}
            className="border border-neutral-900 bg-neutral-900 px-4 py-2 text-xs font-medium uppercase tracking-wide text-white"
          >
            Guardar relatório
          </button>
        )}
        {status ? <p className="text-xs text-neutral-500">{status}</p> : null}
      </div>
    </section>
  );
}

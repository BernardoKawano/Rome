"use client";

import type { BoardState } from "@/lib/board-schema";
import type { Meeting } from "@/lib/records";
import { useEffect, useMemo, useState } from "react";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Props = {
  ownerId: string;
  board: BoardState;
};

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const end = new Date(last);
  end.setDate(last.getDate() + (6 - last.getDay()));
  const days: Date[] = [];
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
  return days;
}

export function AgendaPanel({ ownerId, board }: Props) {
  const [events, setEvents] = useState<Meeting[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const url = `/api/talents/${ownerId}/meetings`;

  async function load() {
    const res = await fetch(url);
    if (!res.ok) {
      setError("Não foi possível carregar a agenda.");
      return;
    }
    setEvents((await res.json()) as Meeting[]);
  }

  useEffect(() => {
    let cancelled = false;
    void fetch(url)
      .then(async (res) => (res.ok ? ((await res.json()) as Meeting[]) : null))
      .then((rows) => {
        if (cancelled) return;
        if (rows) setEvents(rows);
        else setError("Não foi possível carregar a agenda.");
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar a agenda.");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const event of events) {
      const key = dayKey(new Date(event.startsAt));
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events]);

  const duesByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const card of Object.values(board.cards)) {
      if (!card.dueAt || card.completedAt) continue;
      const key = card.dueAt.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), card.title]);
    }
    return map;
  }, [board]);

  async function addEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const time = String(data.get("time") ?? "") || "09:00";
    const notes = String(data.get("notes") ?? "").trim();
    if (!title) return;
    setPending(true);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        startsAt: new Date(`${selected}T${time}`).toISOString(),
        notes: notes || undefined,
      }),
    });
    setPending(false);
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Não foi possível adicionar");
      return;
    }
    form.reset();
    await load();
  }

  async function removeEvent(id: string) {
    if (!window.confirm("Remover este compromisso?")) return;
    const res = await fetch(`${url}?meetingId=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Não foi possível remover");
      return;
    }
    setEvents((current) => current.filter((item) => item.id !== id));
  }

  const today = dayKey(new Date());
  const selectedEvents = eventsByDay.get(selected) ?? [];
  const selectedDues = duesByDay.get(selected) ?? [];
  const selectedLabel = new Date(`${selected}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <section className="border border-neutral-200 bg-white">
      <header className="flex items-center justify-between border-b border-neutral-100 px-4 py-4">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Agenda</h2>
          <p className="mt-1 text-sm capitalize text-neutral-900">
            {month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            className="border border-neutral-300 px-2.5 py-1 text-sm text-neutral-700 hover:border-neutral-900"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => {
              setMonth(new Date());
              setSelected(today);
            }}
            className="border border-neutral-300 px-3 py-1 text-xs uppercase tracking-wide text-neutral-700 hover:border-neutral-900"
          >
            Hoje
          </button>
          <button
            type="button"
            aria-label="Próximo mês"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            className="border border-neutral-300 px-2.5 py-1 text-sm text-neutral-700 hover:border-neutral-900"
          >
            ›
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_20rem]">
        <div className="p-2">
          <div className="grid grid-cols-7 text-center text-[10px] uppercase tracking-wide text-neutral-400">
            {WEEKDAYS.map((label) => (
              <div key={label} className="py-1">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-neutral-100">
            {monthDays(month).map((day) => {
              const key = dayKey(day);
              const inMonth = day.getMonth() === month.getMonth();
              const dayEvents = eventsByDay.get(key) ?? [];
              const dayDues = duesByDay.get(key) ?? [];
              const isSelected = key === selected;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  className={`flex min-h-16 flex-col items-stretch gap-0.5 p-1 text-left sm:min-h-20 ${
                    isSelected ? "bg-neutral-900 text-white" : "bg-white hover:bg-neutral-50"
                  }`}
                >
                  <span
                    className={`text-xs ${
                      isSelected ? "text-white" : key === today ? "font-semibold text-neutral-950" : inMonth ? "text-neutral-700" : "text-neutral-300"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {dayEvents.slice(0, 2).map((item) => (
                    <span
                      key={item.id}
                      className={`truncate text-[10px] leading-tight ${isSelected ? "text-neutral-200" : "text-neutral-700"}`}
                    >
                      {new Date(item.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} {item.title}
                    </span>
                  ))}
                  {dayEvents.length > 2 ? (
                    <span className={`text-[10px] leading-tight ${isSelected ? "text-neutral-300" : "text-neutral-400"}`}>
                      +{dayEvents.length - 2}
                    </span>
                  ) : null}
                  {dayDues.length > 0 ? (
                    <span className={`text-[10px] leading-tight ${isSelected ? "text-neutral-300" : "text-neutral-400"}`}>
                      {dayDues.length} prazo{dayDues.length > 1 ? "s" : ""}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col border-t border-neutral-100 lg:border-l lg:border-t-0">
          <p className="px-4 pt-4 text-sm font-medium first-letter:uppercase text-neutral-900">{selectedLabel}</p>
          <ul className="divide-y divide-neutral-100 px-4">
            {selectedEvents.length === 0 && selectedDues.length === 0 ? (
              <li className="py-3 text-sm text-neutral-400">Nada marcado.</li>
            ) : null}
            {selectedEvents.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-3">
                <span className="font-mono text-xs text-neutral-500">
                  {new Date(item.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-neutral-900">{item.title}</span>
                  {item.notes ? <span className="mt-0.5 block text-xs text-neutral-500">{item.notes}</span> : null}
                </span>
                <button
                  type="button"
                  onClick={() => void removeEvent(item.id)}
                  className="text-[11px] uppercase tracking-wide text-neutral-400 hover:text-red-700"
                >
                  Remover
                </button>
              </li>
            ))}
            {selectedDues.map((title, index) => (
              <li key={`due-${index}`} className="flex items-start gap-3 py-3">
                <span className="text-[10px] uppercase tracking-wide text-neutral-400">Prazo</span>
                <span className="text-sm text-neutral-700">{title}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={(event) => void addEvent(event)} className="mt-auto space-y-2 border-t border-neutral-100 px-4 py-4">
            <input
              name="title"
              required
              maxLength={200}
              autoComplete="off"
              placeholder="Novo compromisso"
              className="w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none placeholder:text-neutral-300 focus:border-neutral-900"
            />
            <div className="flex gap-2">
              <input
                name="time"
                type="time"
                defaultValue="09:00"
                className="border border-neutral-200 px-2 py-1.5 text-sm outline-none focus:border-neutral-400"
              />
              <input
                name="notes"
                maxLength={2000}
                autoComplete="off"
                placeholder="Notas (opcional)"
                className="min-w-0 flex-1 border-b border-neutral-300 bg-transparent py-1.5 text-sm outline-none placeholder:text-neutral-300 focus:border-neutral-900"
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={pending}
              className="w-full border border-neutral-900 bg-neutral-900 px-4 py-2 text-xs font-medium uppercase tracking-wide text-white hover:bg-black disabled:opacity-60"
            >
              {pending ? "A adicionar…" : "Adicionar ao dia"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

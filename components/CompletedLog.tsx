"use client";

import type { CompletedLogEntry } from "@/lib/board-schema";

type Props = {
  entries: CompletedLogEntry[];
};

export function CompletedLog({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <section className="border border-neutral-200 bg-white px-4 py-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Registo de conclusões</h2>
        <p className="mt-3 text-sm text-neutral-400">Ainda não há entradas. Ao mover para Realizado, a data fica registada aqui.</p>
      </section>
    );
  }

  return (
    <section className="border border-neutral-200 bg-white">
      <header className="border-b border-neutral-100 px-4 py-4">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Registo de conclusões</h2>
        <p className="mt-1 text-[11px] text-neutral-400">Mais recentes primeiro.</p>
      </header>
      <ul className="divide-y divide-neutral-100">
        {entries.map((e) => (
          <li key={`${e.id}-${e.completedAt}`} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between">
            <span className="text-sm text-neutral-900">{e.title}</span>
            <time className="font-mono text-xs text-neutral-500" dateTime={e.completedAt}>
              {new Date(e.completedAt).toLocaleString("pt-PT", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}

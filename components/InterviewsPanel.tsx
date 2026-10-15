"use client";

import type { Candidate } from "@/lib/board-schema";
import { newId } from "@/lib/board-schema";

type Props = {
  candidates: Candidate[];
  onChange: (candidates: Candidate[]) => void;
};

function readScore(raw: string): number | null | undefined {
  if (!raw.trim()) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 10) return undefined;
  return value;
}

export function InterviewsPanel({ candidates, onChange }: Props) {
  const people = [...candidates].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  function patch(id: string, next: Partial<Candidate>) {
    const now = new Date().toISOString();
    onChange(candidates.map((person) => (person.id === id ? { ...person, ...next, updatedAt: now } : person)));
  }

  function addPerson(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (candidates.length >= 200) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim().slice(0, 120);
    const address = String(data.get("address") ?? "").trim().slice(0, 300);
    const culturalScore = readScore(String(data.get("cultural") ?? ""));
    const technicalScore = readScore(String(data.get("technical") ?? ""));
    const pocs = String(data.get("pocs") ?? "").slice(0, 5000);
    if (!name || !address || culturalScore === undefined || technicalScore === undefined) return;
    onChange([
      {
        id: newId(),
        name,
        address,
        culturalScore,
        technicalScore,
        pocs,
        updatedAt: new Date().toISOString(),
      },
      ...candidates,
    ]);
    form.reset();
  }

  return (
    <section className="border border-neutral-200 bg-white">
      <header className="border-b border-neutral-100 px-4 py-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Entrevistas</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Pessoas que está a entrevistar. Notas de 0 a 10.
        </p>
      </header>
      <form onSubmit={addPerson} className="grid gap-3 border-b border-neutral-100 px-4 py-4 sm:grid-cols-2">
        <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          Nome
          <input
            name="name"
            required
            autoComplete="off"
            className="mt-2 w-full border-b border-neutral-300 bg-transparent py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
          />
        </label>
        <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          Endereço
          <input
            name="address"
            required
            autoComplete="off"
            placeholder="Onde a pessoa mora"
            className="mt-2 w-full border-b border-neutral-300 bg-transparent py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-300 focus:border-neutral-900"
          />
        </label>
        <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          Nota cultural
          <input
            name="cultural"
            type="number"
            min={0}
            max={10}
            step={0.5}
            className="mt-2 w-full border border-neutral-200 bg-white px-2 py-2 text-sm outline-none focus:border-neutral-400"
          />
        </label>
        <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          Nota técnica
          <input
            name="technical"
            type="number"
            min={0}
            max={10}
            step={0.5}
            className="mt-2 w-full border border-neutral-200 bg-white px-2 py-2 text-sm outline-none focus:border-neutral-400"
          />
        </label>
        <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 sm:col-span-2">
          POCs
          <textarea
            name="pocs"
            rows={3}
            placeholder="Escreva as POCs desta pessoa"
            className="mt-2 w-full resize-y border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm text-neutral-800 outline-none placeholder:text-neutral-300 focus:border-neutral-400"
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={candidates.length >= 200}
            className="border border-neutral-900 bg-neutral-900 px-5 py-2 text-xs font-medium uppercase tracking-wide text-white hover:bg-black disabled:opacity-40"
          >
            Registar pessoa
          </button>
        </div>
      </form>
      {people.length === 0 ? (
        <p className="px-4 py-4 text-sm text-neutral-400">Nenhuma pessoa registada.</p>
      ) : (
        <ul>
          {people.map((person) => (
            <li key={person.id} className="grid gap-3 border-b border-neutral-100 px-4 py-4 last:border-b-0 sm:grid-cols-2">
              <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                Nome
                <input
                  value={person.name}
                  onChange={(event) => {
                    const name = event.target.value.slice(0, 120).trim();
                    if (!name) return;
                    patch(person.id, { name: event.target.value.slice(0, 120) });
                  }}
                  className="mt-2 w-full border-b border-neutral-200 bg-transparent py-1 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                />
              </label>
              <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                Endereço
                <input
                  value={person.address}
                  onChange={(event) => patch(person.id, { address: event.target.value.slice(0, 300) })}
                  className="mt-2 w-full border-b border-neutral-200 bg-transparent py-1 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                />
              </label>
              <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                Nota cultural
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={person.culturalScore ?? ""}
                  onChange={(event) => {
                    const score = readScore(event.target.value);
                    if (score === undefined) return;
                    patch(person.id, { culturalScore: score });
                  }}
                  className="mt-2 w-full border border-neutral-200 bg-white px-2 py-2 text-sm outline-none focus:border-neutral-400"
                />
              </label>
              <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                Nota técnica
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={person.technicalScore ?? ""}
                  onChange={(event) => {
                    const score = readScore(event.target.value);
                    if (score === undefined) return;
                    patch(person.id, { technicalScore: score });
                  }}
                  className="mt-2 w-full border border-neutral-200 bg-white px-2 py-2 text-sm outline-none focus:border-neutral-400"
                />
              </label>
              <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 sm:col-span-2">
                POCs
                <textarea
                  rows={4}
                  value={person.pocs}
                  placeholder="Escreva as POCs desta pessoa"
                  onChange={(event) => patch(person.id, { pocs: event.target.value.slice(0, 5000) })}
                  className="mt-2 w-full resize-y border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm text-neutral-800 outline-none placeholder:text-neutral-300 focus:border-neutral-400"
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(`Remover ${person.name}?`)) return;
                    onChange(candidates.filter((item) => item.id !== person.id));
                  }}
                  className="text-[11px] uppercase tracking-wide text-neutral-400 hover:text-red-700"
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

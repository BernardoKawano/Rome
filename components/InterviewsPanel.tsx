"use client";

import { CANDIDATE_STAGES, candidatesInStage } from "@/lib/candidate-search";
import type { Candidate, CandidateStage } from "@/lib/board-schema";
import { newId } from "@/lib/board-schema";
import { useState } from "react";

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

function scoreLabel(person: Candidate): string | null {
  if (person.culturalScore == null && person.technicalScore == null) return null;
  const cultural = person.culturalScore == null ? "—" : String(person.culturalScore);
  const technical = person.technicalScore == null ? "—" : String(person.technicalScore);
  return `Cultural ${cultural} · Técnica ${technical}`;
}

export function InterviewsPanel({ candidates, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(candidates.length === 0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    const phone = String(data.get("phone") ?? "").trim().slice(0, 40);
    const culturalScore = readScore(String(data.get("cultural") ?? ""));
    const technicalScore = readScore(String(data.get("technical") ?? ""));
    const pocs = String(data.get("pocs") ?? "").slice(0, 5000);
    if (!name || !address || culturalScore === undefined || technicalScore === undefined) return;
    const id = newId();
    onChange([
      {
        id,
        name,
        address,
        phone,
        culturalScore,
        technicalScore,
        pocs,
        stage: "list",
        updatedAt: new Date().toISOString(),
      },
      ...candidates,
    ]);
    form.reset();
    setAdding(false);
    setExpandedId(id);
  }

  return (
    <section className="border border-neutral-200 bg-white">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-100 px-4 py-3">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Entrevistas</h2>
          <p className="mt-1 text-sm text-neutral-600">Cartões por coluna. Notas de 0 a 10.</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((open) => !open)}
          className="border border-neutral-900 bg-neutral-900 px-4 py-2 text-xs font-medium uppercase tracking-wide text-white hover:bg-black"
        >
          {adding ? "Fechar" : "Nova pessoa"}
        </button>
      </header>

      <div className="border-b border-neutral-100 px-4 py-3">
        <label className="block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          Pesquisar
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome, celular, endereço ou POC"
            className="mt-2 w-full border-b border-neutral-300 bg-transparent py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-300 focus:border-neutral-900"
          />
        </label>
      </div>

      {adding ? (
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
            Celular
            <input
              name="phone"
              type="tel"
              autoComplete="off"
              placeholder="(11) 90000-0000"
              className="mt-2 w-full border-b border-neutral-300 bg-transparent py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-300 focus:border-neutral-900"
            />
          </label>
          <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 sm:col-span-2">
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
              rows={2}
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
      ) : null}

      <div className="grid gap-3 p-3 lg:grid-cols-3">
        {CANDIDATE_STAGES.map((column) => {
          const people = candidatesInStage(candidates, column.id, query);
          return (
            <div key={column.id} className="min-h-32 border border-neutral-100 bg-neutral-50">
              <header className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
                <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500">{column.label}</h3>
                <span className="text-[11px] text-neutral-400">{people.length}</span>
              </header>
              {people.length === 0 ? (
                <p className="px-3 py-4 text-sm text-neutral-400">
                  {query.trim() ? "Nenhum resultado." : "Ninguém nesta coluna."}
                </p>
              ) : (
                <ul className="flex flex-col gap-2 p-2">
                  {people.map((person) => (
                    <CandidateCard
                      key={person.id}
                      person={person}
                      expanded={expandedId === person.id}
                      onToggle={() => setExpandedId((current) => (current === person.id ? null : person.id))}
                      onPatch={(next) => patch(person.id, next)}
                      onRemove={() => {
                        if (!window.confirm(`Remover ${person.name}?`)) return;
                        onChange(candidates.filter((item) => item.id !== person.id));
                        setExpandedId((current) => (current === person.id ? null : current));
                      }}
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CandidateCard({
  person,
  expanded,
  onToggle,
  onPatch,
  onRemove,
}: {
  person: Candidate;
  expanded: boolean;
  onToggle: () => void;
  onPatch: (next: Partial<Candidate>) => void;
  onRemove: () => void;
}) {
  const scores = scoreLabel(person);
  return (
    <li className="border border-neutral-200 bg-white">
      <button type="button" onClick={onToggle} className="block w-full px-3 py-3 text-left">
        <span className="block text-sm font-medium text-neutral-900">{person.name}</span>
        <span className="mt-1 block text-xs text-neutral-500">{person.phone || "Sem celular"}</span>
        {scores ? <span className="mt-1 block text-xs text-neutral-500">{scores}</span> : null}
        <span className="mt-1 block truncate text-xs text-neutral-400">{person.address}</span>
      </button>
      <div className="border-t border-neutral-100 px-3 py-2">
        <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
          Coluna
          <select
            value={person.stage}
            onChange={(event) => onPatch({ stage: event.target.value as CandidateStage })}
            className="mt-1 w-full border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-800 outline-none focus:border-neutral-400"
          >
            {CANDIDATE_STAGES.map((column) => (
              <option key={column.id} value={column.id}>
                {column.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {expanded ? (
        <div className="grid gap-3 border-t border-neutral-100 px-3 py-3">
          <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Nome
            <input
              value={person.name}
              onChange={(event) => {
                const name = event.target.value.slice(0, 120).trim();
                if (!name) return;
                onPatch({ name: event.target.value.slice(0, 120) });
              }}
              className="mt-2 w-full border-b border-neutral-200 bg-transparent py-1 text-sm text-neutral-900 outline-none focus:border-neutral-900"
            />
          </label>
          <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Celular
            <input
              type="tel"
              value={person.phone}
              placeholder="(11) 90000-0000"
              onChange={(event) => onPatch({ phone: event.target.value.slice(0, 40) })}
              className="mt-2 w-full border-b border-neutral-200 bg-transparent py-1 text-sm text-neutral-900 outline-none focus:border-neutral-900"
            />
          </label>
          <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Endereço
            <input
              value={person.address}
              onChange={(event) => onPatch({ address: event.target.value.slice(0, 300) })}
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
                onPatch({ culturalScore: score });
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
                onPatch({ technicalScore: score });
              }}
              className="mt-2 w-full border border-neutral-200 bg-white px-2 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </label>
          <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            POCs
            <textarea
              rows={3}
              value={person.pocs}
              placeholder="Escreva as POCs desta pessoa"
              onChange={(event) => onPatch({ pocs: event.target.value.slice(0, 5000) })}
              className="mt-2 w-full resize-y border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm text-neutral-800 outline-none placeholder:text-neutral-300 focus:border-neutral-400"
            />
          </label>
          <button type="button" onClick={onRemove} className="text-left text-[11px] uppercase tracking-wide text-neutral-400 hover:text-red-700">
            Remover
          </button>
        </div>
      ) : null}
    </li>
  );
}

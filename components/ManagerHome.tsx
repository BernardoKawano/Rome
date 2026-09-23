"use client";

import { RotatingPrinciple } from "@/components/RotatingPrinciple";
import { formatNeedlePercent } from "@/lib/impact";
import Link from "next/link";
import { useEffect, useState } from "react";

type TalentRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  week: {
    needleHours: number;
    totalHours: number;
    percent: number | null;
    meetsTarget: boolean;
  };
};

export function ManagerHome() {
  const [talents, setTalents] = useState<TalentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function load() {
    const res = await fetch("/api/talents");
    if (!res.ok) {
      setError("Não foi possível carregar os talentos.");
      return;
    }
    setTalents((await res.json()) as TalentRow[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createTalent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const res = await fetch("/api/talents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
        company: String(data.get("company") ?? ""),
      }),
    });
    setPending(false);
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setError(typeof payload.error === "string" ? payload.error : "Não foi possível criar o talento");
      return;
    }
    form.reset();
    await load();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12">
      <header className="flex items-end justify-between border-b border-neutral-200 pb-8">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-neutral-950">Talentos</h1>
          <p className="mt-2 text-sm text-neutral-500">A semana de cada pessoa, contra a meta de 80% no ponteiro.</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
          className="border border-neutral-300 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-neutral-700"
        >
          Sair
        </button>
      </header>

      <form onSubmit={(event) => void createTalent(event)} className="grid gap-3 border border-neutral-200 bg-white p-4 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Novo talento</h2>
        <input name="name" required placeholder="Nome" className="border-b border-neutral-300 py-2 text-sm outline-none" />
        <input name="email" type="email" required placeholder="E-mail" className="border-b border-neutral-300 py-2 text-sm outline-none" />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Senha inicial"
          autoComplete="new-password"
          className="border-b border-neutral-300 py-2 text-sm outline-none"
        />
        <input name="company" required placeholder="Empresa" className="border-b border-neutral-300 py-2 text-sm outline-none" />
        <button
          type="submit"
          disabled={pending}
          className="border border-neutral-900 bg-neutral-900 px-4 py-2 text-xs font-medium uppercase tracking-wide text-white sm:col-span-2"
        >
          {pending ? "A criar…" : "Criar talento"}
        </button>
        {error ? <p className="text-sm text-red-600 sm:col-span-2">{error}</p> : null}
      </form>

      <ul className="divide-y divide-neutral-200 border border-neutral-200 bg-white">
        {talents.length === 0 ? (
          <li className="px-4 py-6 text-sm text-neutral-400">Nenhum talento ainda.</li>
        ) : (
          talents.map((talent) => (
            <li key={talent.id}>
              <Link href={`/gestor/talento/${talent.id}`} className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-neutral-50">
                <span>
                  <span className="block text-sm font-medium text-neutral-900">{talent.name}</span>
                  <RotatingPrinciple />
                  <span className="mt-1 block text-[11px] text-neutral-400">
                    {talent.company ?? "Sem empresa"} · {talent.email}
                  </span>
                </span>
                <span className="text-right text-sm text-neutral-800">
                  {formatNeedlePercent(talent.week.percent)}
                  <span className="mt-1 block text-[11px] uppercase tracking-wide text-neutral-400">
                    {talent.week.needleHours} h / {talent.week.totalHours} h
                  </span>
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

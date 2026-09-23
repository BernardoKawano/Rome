"use client";

import { BrandMark } from "@/components/BrandMark";
import { useState } from "react";

export default function LoginClient({ errorMessage }: { errorMessage: string | null }) {
  const [error, setError] = useState<string | null>(errorMessage);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
      }),
    });
    const payload = (await res.json().catch(() => ({}))) as { role?: string; error?: string };
    setPending(false);
    if (!res.ok) {
      setError(payload.error ?? "Não foi possível entrar.");
      return;
    }
    window.location.href = payload.role === "gestor" ? "/gestor" : "/";
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="w-full max-w-sm border border-neutral-200 bg-white p-8 shadow-sm">
        <BrandMark iconSize={120} title="Demandas" subtitle="Entre com o e-mail da sua conta." />
        <form onSubmit={(event) => void submit(event)} className="mt-8 space-y-4">
          <label className="block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            E-mail
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              className="mt-2 w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-neutral-900"
            />
          </label>
          <label className="block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Senha
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-2 w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-neutral-900"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="w-full border border-neutral-900 bg-neutral-900 py-2.5 text-xs font-medium uppercase tracking-wide text-white"
          >
            {pending ? "A entrar…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

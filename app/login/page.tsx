"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const username = String(form.get("username") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Não foi possível entrar.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-medium tracking-tight text-neutral-950">Demandas</h1>
        <p className="mt-2 text-sm text-neutral-500">Entre com o seu utilizador e senha.</p>

        <label className="mt-8 block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          Utilizador
          <input
            name="username"
            type="text"
            autoComplete="username"
            required
            className="mt-2 w-full border-b border-neutral-300 bg-transparent py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
          />
        </label>

        <label className="mt-6 block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          Senha
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-2 w-full border-b border-neutral-300 bg-transparent py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
          />
        </label>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-8 w-full border border-neutral-900 bg-neutral-900 py-2.5 text-xs font-medium uppercase tracking-wide text-white hover:bg-black disabled:opacity-50"
        >
          {loading ? "A entrar…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

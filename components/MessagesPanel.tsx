"use client";

import type { Role } from "@/lib/access";
import type { AppMessage } from "@/lib/records";
import { useEffect, useState } from "react";

type Props = {
  talentId: string;
  viewerRole: Role;
};

export function MessagesPanel({ talentId, viewerRole }: Props) {
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/talents/${talentId}/messages`);
    if (!res.ok) return;
    setMessages((await res.json()) as AppMessage[]);
  }

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/talents/${talentId}/messages`)
      .then(async (res) => {
        if (!res.ok) return [] as AppMessage[];
        return (await res.json()) as AppMessage[];
      })
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [talentId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await fetch(`/api/talents/${talentId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Não foi possível enviar");
      return;
    }
    setBody("");
    await load();
  }

  return (
    <section className="border border-neutral-200 bg-white">
      <header className="border-b border-neutral-100 px-4 py-4">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Recados</h2>
        <p className="mt-1 text-[11px] text-neutral-400">
          {viewerRole === "gestor" ? "O feedback fica visível para o talento." : "Escreva o que quer mostrar. O gestor responde aqui."}
        </p>
      </header>
      <ul className="max-h-80 divide-y divide-neutral-100 overflow-auto">
        {messages.length === 0 ? (
          <li className="px-4 py-4 text-sm text-neutral-400">Ainda não há recados.</li>
        ) : (
          messages.map((message) => (
            <li key={message.id} className="px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-neutral-400">
                {message.authorRole === "gestor" ? "Feedback" : "Talento"} ·{" "}
                {new Date(message.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800">{message.body}</p>
            </li>
          ))
        )}
      </ul>
      <form onSubmit={(event) => void submit(event)} className="border-t border-neutral-100 px-4 py-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder={viewerRole === "gestor" ? "Feedback para o talento" : "O que você quer mostrar ou perguntar"}
          className="w-full resize-none border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm outline-none focus:border-neutral-400"
        />
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          className="mt-3 border border-neutral-900 px-4 py-2 text-xs font-medium uppercase tracking-wide text-neutral-900"
        >
          Enviar
        </button>
      </form>
    </section>
  );
}

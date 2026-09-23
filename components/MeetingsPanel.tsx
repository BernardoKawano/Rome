"use client";

import type { Role } from "@/lib/access";
import type { Meeting } from "@/lib/records";
import { useEffect, useState } from "react";

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    return null;
  }
  return null;
}

type Props = {
  talentId: string;
  viewerRole: Role;
};

export function MeetingsPanel({ talentId, viewerRole }: Props) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/talents/${talentId}/meetings`);
    if (!res.ok) return;
    setMeetings((await res.json()) as Meeting[]);
  }

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/talents/${talentId}/meetings`)
      .then(async (res) => {
        if (!res.ok) return [] as Meeting[];
        return (await res.json()) as Meeting[];
      })
      .then((rows) => {
        if (!cancelled) setMeetings(rows);
      })
      .catch(() => {
        if (!cancelled) setMeetings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [talentId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const when = String(data.get("when") ?? "");
    const link = String(data.get("link") ?? "").trim();
    const notes = String(data.get("notes") ?? "").trim();
    if (!title || !when) return;
    const startsAt = new Date(when).toISOString();
    const res = await fetch(`/api/talents/${talentId}/meetings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        startsAt,
        link: link || undefined,
        notes: notes || undefined,
      }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Não foi possível marcar");
      return;
    }
    form.reset();
    await load();
  }

  return (
    <section className="border border-neutral-200 bg-white">
      <header className="border-b border-neutral-100 px-4 py-4">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Reuniões</h2>
        <p className="mt-1 text-[11px] text-neutral-400">Encontros marcados com o gestor.</p>
      </header>
      <ul className="divide-y divide-neutral-100">
        {meetings.length === 0 ? (
          <li className="px-4 py-4 text-sm text-neutral-400">Nenhuma reunião marcada.</li>
        ) : (
          meetings.map((meeting) => (
            <li key={meeting.id} className="px-4 py-3">
              <p className="text-sm text-neutral-900">{meeting.title}</p>
              <p className="mt-1 text-xs text-neutral-500">
                {new Date(meeting.startsAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </p>
              {meeting.link && safeHttpUrl(meeting.link) ? (
                <a href={safeHttpUrl(meeting.link) ?? undefined} className="mt-1 inline-block text-xs text-neutral-700 underline" target="_blank" rel="noreferrer">
                  Abrir chamada
                </a>
              ) : null}
              {meeting.notes ? <p className="mt-1 text-sm text-neutral-600">{meeting.notes}</p> : null}
            </li>
          ))
        )}
      </ul>
      {viewerRole === "gestor" ? (
        <form onSubmit={(event) => void submit(event)} className="space-y-3 border-t border-neutral-100 px-4 py-4">
          <input
            name="title"
            placeholder="Título"
            className="w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-neutral-900"
          />
          <input name="when" type="datetime-local" className="w-full border border-neutral-200 px-2 py-2 text-sm" required />
          <input
            name="link"
            placeholder="Link da chamada"
            className="w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-neutral-900"
          />
          <input
            name="notes"
            placeholder="Notas"
            className="w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-neutral-900"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" className="border border-neutral-900 px-4 py-2 text-xs font-medium uppercase tracking-wide">
            Marcar reunião
          </button>
        </form>
      ) : null}
    </section>
  );
}

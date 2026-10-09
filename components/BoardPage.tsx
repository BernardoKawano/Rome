"use client";

import { AgendaPanel } from "@/components/AgendaPanel";
import { CompletedLog } from "@/components/CompletedLog";
import { KanbanColumn } from "@/components/KanbanColumn";
import { MeetingsPanel } from "@/components/MeetingsPanel";
import { MessagesPanel } from "@/components/MessagesPanel";
import { NeedleMeter } from "@/components/NeedleMeter";
import { RotatingPrinciple } from "@/components/RotatingPrinciple";
import { WeeklyReportPanel } from "@/components/WeeklyReportPanel";
import type { Role } from "@/lib/access";
import { applyCompletionOnMove, findColumnForCard, moveCardBetweenColumns, removeCard } from "@/lib/board-operations";
import { mergeBoardSources, readLocalBoard, writeLocalBoard } from "@/lib/board-local-cache";
import type { BoardState, Card, ColumnId } from "@/lib/board-schema";
import { COLUMN_IDS, createCard, newId } from "@/lib/board-schema";
import { summarizeCompleted, weekRange } from "@/lib/impact";
import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  talentId: string;
  talentName: string;
  talentEmail: string;
  company: string | null;
  readOnly: boolean;
  viewerRole: Role;
  /** Quadro pessoal do gestor: só demandas, sem horas, ponteiro, relatório nem recados. */
  personal?: boolean;
};

function LogoutButton({ onBeforeLogout }: { onBeforeLogout: () => Promise<void> }) {
  return (
    <button
      type="button"
      onClick={async () => {
        await onBeforeLogout();
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }}
      className="border border-neutral-300 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-neutral-700 hover:border-neutral-900 hover:text-neutral-900"
    >
      Sair
    </button>
  );
}

export function BoardPage({ talentId, talentName, talentEmail, company, readOnly, viewerRole, personal = false }: Props) {
  const viewingAsGestor = !personal && (viewerRole === "gestor" || readOnly);
  const [companyName, setCompanyName] = useState(company ?? "");
  const [board, setBoard] = useState<BoardState | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const skipPersistRef = useRef(true);
  const boardRef = useRef<BoardState | null>(null);
  boardRef.current = board;

  const boardUrl = viewingAsGestor ? `/api/talents/${talentId}/board` : "/api/board";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const persistBoard = useCallback(
    async (state: BoardState) => {
      writeLocalBoard(talentId, state);
      setSaveState("saving");
      try {
        const res = await fetch(boardUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
        });
        if (res.status === 401) {
          setSaveState("error");
          setError("Sessão expirada. A redirecionar para entrar novamente…");
          window.location.href = "/login";
          return false;
        }
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string };
          const detail = typeof payload.error === "string" ? payload.error : null;
          setSaveState("error");
          setError(detail ? `Não foi possível guardar: ${detail}` : "Falha ao guardar. Os dados ficam neste browser até sincronizar.");
          return false;
        }
        setSaveState("saved");
        setError(null);
        return true;
      } catch {
        setSaveState("error");
        setError("Falha ao guardar no servidor. Os dados ficam neste browser até sincronizar.");
        return false;
      }
    },
    [boardUrl, talentId]
  );

  const flushBoard = useCallback(async () => {
    const state = boardRef.current;
    if (!state) return;
    writeLocalBoard(talentId, state);
    await persistBoard(state);
  }, [persistBoard, talentId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const boardRes = await fetch(boardUrl);
        if (boardRes.status === 401) {
          window.location.href = "/login";
          return;
        }
        const boardJson = (await boardRes.json()) as BoardState & { error?: string };
        if (!boardRes.ok || !boardJson.version) {
          throw new Error(typeof boardJson.error === "string" ? boardJson.error : "Falha ao carregar");
        }
        const serverBoard = boardJson;
        const localBoard = readLocalBoard(talentId);
        const merged = mergeBoardSources(serverBoard, localBoard);

        if (!cancelled) {
          setBoard(merged);
          writeLocalBoard(talentId, merged);
          skipPersistRef.current = true;
          if (merged !== serverBoard) {
            void persistBoard(merged);
          }
        }
      } catch {
        if (!cancelled) setError("Não foi possível carregar o tabuleiro.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [boardUrl, persistBoard, talentId]);

  useEffect(() => {
    if (!board) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    writeLocalBoard(talentId, board);
    const timer = setTimeout(() => {
      void persistBoard(board);
    }, 250);
    return () => clearTimeout(timer);
  }, [board, persistBoard, talentId]);

  useEffect(() => {
    const flush = () => {
      const state = boardRef.current;
      if (!state || skipPersistRef.current) return;
      writeLocalBoard(talentId, state);
      void fetch(boardUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
        keepalive: true,
      });
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [boardUrl, talentId]);

  const patchCard = useCallback((id: string, patch: Partial<Card>) => {
    setBoard((current) => {
      if (!current) return current;
      const card = current.cards[id];
      if (!card) return current;
      return {
        ...current,
        cards: { ...current.cards, [id]: { ...card, ...patch, updatedAt: new Date().toISOString() } },
      };
    });
  }, []);

  const addSubItem = useCallback((cardId: string, title: string) => {
    setBoard((current) => {
      if (!current) return current;
      const card = current.cards[cardId];
      if (!card || card.subItems.length >= 10) return current;
      return {
        ...current,
        cards: {
          ...current.cards,
          [cardId]: {
            ...card,
            subItems: [...card.subItems, { id: newId(), title, done: false }],
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, []);

  const toggleSubItem = useCallback((cardId: string, subId: string) => {
    setBoard((current) => {
      if (!current) return current;
      const card = current.cards[cardId];
      if (!card) return current;
      return {
        ...current,
        cards: {
          ...current.cards,
          [cardId]: {
            ...card,
            subItems: card.subItems.map((item) => (item.id === subId ? { ...item, done: !item.done } : item)),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, []);

  const removeSubItem = useCallback((cardId: string, subId: string) => {
    setBoard((current) => {
      if (!current) return current;
      const card = current.cards[cardId];
      if (!card) return current;
      return {
        ...current,
        cards: {
          ...current.cards,
          [cardId]: {
            ...card,
            subItems: card.subItems.filter((item) => item.id !== subId),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, []);

  const deleteCard = useCallback((cardId: string) => {
    setBoard((current) => (current ? removeCard(current, cardId) : current));
    setExpandedId((current) => (current === cardId ? null : current));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId === overId) return;

      setBoard((current) => {
        if (!current) return current;
        const fromCol = findColumnForCard(current, activeId);
        if (!fromCol) return current;

        let toCol: ColumnId;
        let toIndex: number;

        if (overId.startsWith("col:")) {
          const raw = overId.slice(4);
          if (!(COLUMN_IDS as readonly string[]).includes(raw)) return current;
          toCol = raw as ColumnId;
          const list = current.columns[toCol].filter((id) => id !== activeId);
          toIndex = list.length;
        } else {
          const col = findColumnForCard(current, overId);
          if (!col) return current;
          toCol = col;
          const list = current.columns[toCol].filter((id) => id !== activeId);
          const idx = list.indexOf(overId);
          toIndex = idx >= 0 ? idx : list.length;
        }

        const nowIso = new Date().toISOString();
        let next = moveCardBetweenColumns(current, activeId, fromCol, toCol, toIndex);
        next = applyCompletionOnMove(next, activeId, fromCol, toCol, nowIso);
        return next;
      });
  }, []);

  const onAddDemand = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const title = String(data.get("title") ?? "").trim();
      if (!title) return;
      const card = createCard({ title, company: companyName || undefined });
      setBoard((current) => {
        if (!current) return current;
        return {
          ...current,
          cards: { ...current.cards, [card.id]: card },
          columns: { ...current.columns, todo: [card.id, ...current.columns.todo] },
        };
      });
      event.currentTarget.reset();
    },
    [companyName]
  );

  const weekSummary = useMemo(
    () => (board ? summarizeCompleted(board, weekRange(new Date())) : null),
    [board]
  );

  if (error && !board) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center text-sm text-neutral-600">
        <p>{error}</p>
      </div>
    );
  }

  if (!board || !weekSummary) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-24 text-center text-sm text-neutral-400">
        <p>A carregar…</p>
      </div>
    );
  }

  const saveLabel =
    saveState === "saving" ? "A guardar…" : saveState === "saved" ? "Guardado" : saveState === "error" ? "Erro ao guardar" : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
      {personal ? (
        <div className="flex flex-col gap-3 border border-neutral-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-700">As suas demandas pessoais.</p>
          <Link href="/gestor" className="text-xs uppercase tracking-wide text-neutral-600 underline">
            Voltar aos talentos
          </Link>
        </div>
      ) : null}

      {viewingAsGestor ? (
        <div className="flex flex-col gap-3 border border-neutral-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-700">
            Você está vendo o quadro de <strong className="font-medium">{talentName}</strong>
            {companyName ? ` · ${companyName}` : ""}.
          </p>
          <Link href="/gestor" className="text-xs uppercase tracking-wide text-neutral-600 underline">
            Voltar aos talentos
          </Link>
        </div>
      ) : null}

      <header className="flex flex-col gap-6 border-b border-neutral-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-medium tracking-tight text-neutral-950 sm:text-3xl">{talentName}</h1>
          {personal ? null : (
            <p className="mt-1 text-xs uppercase tracking-wide text-neutral-400">{companyName || "Sem empresa"}</p>
          )}
          <RotatingPrinciple />
          {saveLabel ? <p className="mt-2 text-[11px] uppercase tracking-wide text-neutral-400">{saveLabel}</p> : null}
        </div>
        <div className="flex flex-col items-stretch gap-4 sm:items-end">
          {personal ? null : <NeedleMeter summary={weekSummary} />}
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-neutral-500">{talentEmail}</span>
            <LogoutButton onBeforeLogout={flushBoard} />
          </div>
        </div>
      </header>

      <div className="flex max-w-3xl flex-col gap-6">
        {viewingAsGestor ? (
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={async (event) => {
              event.preventDefault();
              const res = await fetch(`/api/talents/${talentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ company: companyName }),
              });
              setError(res.ok ? null : "Não foi possível atualizar a empresa");
            }}
          >
            <label className="flex-1 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Empresa atual
              <input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                className="mt-2 w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-neutral-900"
              />
            </label>
            <button type="submit" className="border border-neutral-900 px-4 py-2 text-xs uppercase tracking-wide">
              Atualizar
            </button>
          </form>
        ) : null}
        <form onSubmit={onAddDemand} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Nova demanda
            <input
              name="title"
              autoComplete="off"
              placeholder="Título curto e claro"
              className="mt-2 w-full border-b border-neutral-300 bg-transparent py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-300 focus:border-neutral-900"
            />
          </label>
          <button
            type="submit"
            className="border border-neutral-900 bg-neutral-900 px-5 py-2 text-xs font-medium uppercase tracking-wide text-white hover:bg-black"
          >
            Adicionar
          </button>
        </form>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMN_IDS.map((columnId) => (
            <KanbanColumn
              key={columnId}
              columnId={columnId}
              state={board}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              patchCard={patchCard}
              addSubItem={addSubItem}
              toggleSubItem={toggleSubItem}
              removeSubItem={removeSubItem}
              removeCard={deleteCard}
              hideHours={personal}
            />
          ))}
        </div>
      </DndContext>

      {personal ? <AgendaPanel ownerId={talentId} board={board} /> : (
        <>
          <WeeklyReportPanel talentId={talentId} board={board} readOnly={viewingAsGestor} />

          <div className="grid gap-4 lg:grid-cols-2">
            <MessagesPanel talentId={talentId} viewerRole={viewerRole} />
            <MeetingsPanel talentId={talentId} viewerRole={viewerRole} />
          </div>
        </>
      )}

      <CompletedLog entries={board.completedLog} />
    </div>
  );
}

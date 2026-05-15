"use client";

import { CompletedLog } from "@/components/CompletedLog";
import { KanbanColumn } from "@/components/KanbanColumn";
import { applyCompletionOnMove, findColumnForCard, moveCardBetweenColumns } from "@/lib/board-operations";
import type { BoardState, Card, ColumnId } from "@/lib/board-schema";
import { COLUMN_IDS, createCard, newId } from "@/lib/board-schema";
import type { AuthMode } from "@/lib/auth";
import { UserButton } from "@clerk/nextjs";
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
import { useCallback, useEffect, useRef, useState } from "react";

function LogoutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }}
      className="border border-neutral-300 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-neutral-700 hover:border-neutral-900 hover:text-neutral-900"
    >
      Sair
    </button>
  );
}

export function BoardPage({ authMode }: { authMode: AuthMode }) {
  const [board, setBoard] = useState<BoardState | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const skipPersistRef = useRef(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/board");
        if (!res.ok) throw new Error("Falha ao carregar");
        const data = (await res.json()) as BoardState;
        if (!cancelled) {
          setBoard(data);
          skipPersistRef.current = true;
        }
      } catch {
        if (!cancelled) setError("Não foi possível carregar o tabuleiro.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!board) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    const t = setTimeout(() => {
      void fetch("/api/board", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(board),
      }).catch(() => setError("Falha ao guardar. Tente outra vez."));
    }, 450);
    return () => clearTimeout(t);
  }, [board]);

  const patchCard = useCallback((id: string, patch: Partial<Card>) => {
    setBoard((b) => {
      if (!b) return b;
      const cur = b.cards[id];
      if (!cur) return b;
      const updated: Card = { ...cur, ...patch, updatedAt: new Date().toISOString() };
      return { ...b, cards: { ...b.cards, [id]: updated } };
    });
  }, []);

  const addSubItem = useCallback((cardId: string, title: string) => {
    setBoard((b) => {
      if (!b) return b;
      const cur = b.cards[cardId];
      if (!cur || cur.subItems.length >= 10) return b;
      const sub = { id: newId(), title, done: false };
      return {
        ...b,
        cards: {
          ...b.cards,
          [cardId]: {
            ...cur,
            subItems: [...cur.subItems, sub],
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, []);

  const toggleSubItem = useCallback((cardId: string, subId: string) => {
    setBoard((b) => {
      if (!b) return b;
      const cur = b.cards[cardId];
      if (!cur) return b;
      const subItems = cur.subItems.map((s) => (s.id === subId ? { ...s, done: !s.done } : s));
      return {
        ...b,
        cards: {
          ...b.cards,
          [cardId]: { ...cur, subItems, updatedAt: new Date().toISOString() },
        },
      };
    });
  }, []);

  const removeSubItem = useCallback((cardId: string, subId: string) => {
    setBoard((b) => {
      if (!b) return b;
      const cur = b.cards[cardId];
      if (!cur) return b;
      const subItems = cur.subItems.filter((s) => s.id !== subId);
      return {
        ...b,
        cards: {
          ...b.cards,
          [cardId]: { ...cur, subItems, updatedAt: new Date().toISOString() },
        },
      };
    });
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

  const onAddDemand = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    if (!title) return;
    const card = createCard({ title });
    setBoard((b) => {
      if (!b) return b;
      return {
        ...b,
        cards: { ...b.cards, [card.id]: card },
        columns: { ...b.columns, todo: [card.id, ...b.columns.todo] },
      };
    });
    e.currentTarget.reset();
  }, []);

  if (error && !board) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center text-sm text-neutral-600">
        <p>{error}</p>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-24 text-center text-sm text-neutral-400">
        A carregar…
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
      <header className="flex flex-col gap-6 border-b border-neutral-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-neutral-950">Demandas</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-500">
            Arraste para definir prioridade. Expanda um cartão só quando precisar de detalhe.
          </p>
        </div>
        <div className="self-end sm:self-auto">
          {authMode === "clerk" ? <UserButton afterSignOutUrl="/sign-in" /> : null}
          {authMode === "app" ? <LogoutButton /> : null}
        </div>
      </header>

      <form onSubmit={onAddDemand} className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-end">
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

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 lg:grid-cols-3">
          <KanbanColumn
            columnId="todo"
            state={board}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            patchCard={patchCard}
            addSubItem={addSubItem}
            toggleSubItem={toggleSubItem}
            removeSubItem={removeSubItem}
          />
          <KanbanColumn
            columnId="doing"
            state={board}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            patchCard={patchCard}
            addSubItem={addSubItem}
            toggleSubItem={toggleSubItem}
            removeSubItem={removeSubItem}
          />
          <KanbanColumn
            columnId="done"
            state={board}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            patchCard={patchCard}
            addSubItem={addSubItem}
            toggleSubItem={toggleSubItem}
            removeSubItem={removeSubItem}
          />
        </div>
      </DndContext>

      <CompletedLog entries={board.completedLog} />
    </div>
  );
}

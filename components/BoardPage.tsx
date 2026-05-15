"use client";

import { CompletedLog } from "@/components/CompletedLog";
import { KanbanColumn } from "@/components/KanbanColumn";
import { applyCompletionOnMove, findColumnForCard, moveCardBetweenColumns } from "@/lib/board-operations";
import { mergeBoardSources, readLocalBoard, writeLocalBoard } from "@/lib/board-local-cache";
import type { BoardState, Card, ColumnId } from "@/lib/board-schema";
import { COLUMN_IDS, createCard, newId } from "@/lib/board-schema";
import type { AuthMode } from "@/lib/auth";
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

export function BoardPage(_props: { authMode: AuthMode }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [board, setBoard] = useState<BoardState | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const skipPersistRef = useRef(true);
  const boardRef = useRef<BoardState | null>(null);
  const userIdRef = useRef<string | null>(null);
  boardRef.current = board;
  userIdRef.current = userId;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const persistBoard = useCallback(async (state: BoardState, uid: string) => {
    writeLocalBoard(uid, state);
    setSaveState("saving");
    try {
      const res = await fetch("/api/board", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      if (!res.ok) {
        setSaveState("error");
        setError("Falha ao guardar no Google Drive. Os dados ficam neste browser até sincronizar.");
        return false;
      }
      setSaveState("saved");
      setError((prev) =>
        prev === "Falha ao guardar no Google Drive. Os dados ficam neste browser até sincronizar." ? null : prev
      );
      return true;
    } catch {
      setSaveState("error");
      setError("Falha ao guardar no servidor. Os dados ficam neste browser até sincronizar.");
      return false;
    }
  }, []);

  const flushBoard = useCallback(async () => {
    const state = boardRef.current;
    const uid = userIdRef.current;
    if (!state || !uid) return;
    writeLocalBoard(uid, state);
    await persistBoard(state, uid);
  }, [persistBoard]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) throw new Error("Sessão inválida");
        const profile = (await meRes.json()) as { userId: string; email?: string };
        const uid = profile.userId;

        const boardRes = await fetch("/api/board");
        if (!boardRes.ok) throw new Error("Falha ao carregar");
        const serverBoard = (await boardRes.json()) as BoardState;
        const localBoard = readLocalBoard(uid);
        const merged = mergeBoardSources(serverBoard, localBoard);

        if (!cancelled) {
          setUserId(uid);
          setUserEmail(profile.email ?? null);
          setBoard(merged);
          writeLocalBoard(uid, merged);
          skipPersistRef.current = true;
          if (merged !== serverBoard) {
            void persistBoard(merged, uid);
          }
        }
      } catch {
        if (!cancelled) setError("Não foi possível carregar o tabuleiro.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [persistBoard]);

  useEffect(() => {
    if (!board || !userId) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    writeLocalBoard(userId, board);
    const t = setTimeout(() => {
      void persistBoard(board, userId);
    }, 250);
    return () => clearTimeout(t);
  }, [board, userId, persistBoard]);

  useEffect(() => {
    const flush = () => {
      const state = boardRef.current;
      const uid = userIdRef.current;
      if (!state || !uid || skipPersistRef.current) return;
      writeLocalBoard(uid, state);
      void fetch("/api/board", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
        keepalive: true,
      });
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

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

  const saveLabel =
    saveState === "saving" ? "A guardar…" : saveState === "saved" ? "Guardado" : saveState === "error" ? "Erro ao guardar" : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
      <header className="flex flex-col gap-6 border-b border-neutral-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-neutral-950">Demandas</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-500">
            Arraste para definir prioridade. Expanda um cartão só quando precisar de detalhe.
          </p>
          {saveLabel ? <p className="mt-1 text-[11px] uppercase tracking-wide text-neutral-400">{saveLabel}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-2 self-end sm:self-auto">
          {userEmail ? <span className="text-xs text-neutral-500">{userEmail}</span> : null}
          <LogoutButton onBeforeLogout={flushBoard} />
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

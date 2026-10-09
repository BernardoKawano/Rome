"use client";

import type { BoardState, Card, ColumnId } from "@/lib/board-schema";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "./KanbanCard";

const LABELS: Record<ColumnId, string> = {
  todo: "A fazer",
  doing: "Em progresso",
  done: "Realizado",
};

type Props = {
  columnId: ColumnId;
  state: BoardState;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  patchCard: (id: string, patch: Partial<Card>) => void;
  addSubItem: (cardId: string, title: string) => void;
  toggleSubItem: (cardId: string, subId: string) => void;
  removeSubItem: (cardId: string, subId: string) => void;
  removeCard: (cardId: string) => void;
  readOnly?: boolean;
  hideHours?: boolean;
};

export function KanbanColumn({
  columnId,
  state,
  expandedId,
  setExpandedId,
  patchCard,
  addSubItem,
  toggleSubItem,
  removeSubItem,
  removeCard,
  readOnly = false,
  hideHours = false,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${columnId}` });
  const ids = state.columns[columnId];

  return (
    <section className="flex h-[min(60dvh,28rem)] flex-col overflow-hidden border border-neutral-200 bg-white">
      <header className="shrink-0 border-b border-neutral-100 px-3 py-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">{LABELS[columnId]}</h2>
        <p className="mt-1 text-[11px] text-neutral-400">{ids.length} itens</p>
      </header>
      <div
        ref={setNodeRef}
        className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-2 ${isOver ? "bg-neutral-50" : "bg-white"}`}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {ids.map((id) => {
              const card = state.cards[id];
              if (!card) return null;
              return (
                <KanbanCard
                  key={id}
                  card={card}
                  expanded={expandedId === id}
                  onToggleExpand={() => setExpandedId(expandedId === id ? null : id)}
                  onChange={(patch) => patchCard(id, patch)}
                  onAddSubItem={(title) => addSubItem(id, title)}
                  onToggleSub={(subId) => toggleSubItem(id, subId)}
                  onRemoveSub={(subId) => removeSubItem(id, subId)}
                  onRemove={() => removeCard(id)}
                  readOnly={readOnly}
                  hideHours={hideHours}
                />
              );
            })}
          </div>
        </SortableContext>
      </div>
    </section>
  );
}

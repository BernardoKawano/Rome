"use client";

import type { Card, NeedleKind } from "@/lib/board-schema";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Props = {
  card: Card;
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (patch: Partial<Card>) => void;
  onAddSubItem: (title: string) => void;
  onToggleSub: (subId: string) => void;
  onRemoveSub: (subId: string) => void;
  onRemove: () => void;
  readOnly?: boolean;
};

export function KanbanCard({
  card,
  expanded,
  onToggleExpand,
  onChange,
  onAddSubItem,
  onToggleSub,
  onRemoveSub,
  onRemove,
  readOnly = false,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const dueSoon =
    card.dueAt &&
    (() => {
      const d = new Date(card.dueAt).getTime();
      const now = Date.now();
      const days = (d - now) / (1000 * 60 * 60 * 24);
      return days >= 0 && days <= 3;
    })();

  const overdue =
    card.dueAt &&
    (() => {
      const d = new Date(card.dueAt).getTime();
      return d < Date.now();
    })();

  return (
    <div ref={setNodeRef} style={style} className="border border-neutral-200 bg-white">
      <div className="flex items-start gap-2 px-3 py-3">
        {readOnly ? null : (
          <button
            type="button"
            className="mt-0.5 cursor-grab touch-none text-neutral-400 hover:text-neutral-800 active:cursor-grabbing"
            aria-label="Arrastar"
            {...attributes}
            {...listeners}
          >
            <span className="block h-4 w-3 leading-none">⋮⋮</span>
          </button>
        )}
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggleExpand}
            className="w-full text-left text-sm font-medium tracking-tight text-neutral-900"
          >
            {card.title}
          </button>
          {readOnly ? null : (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Excluir este cartão?")) onRemove();
              }}
              className="mt-1 text-[11px] uppercase tracking-wide text-neutral-400 hover:text-red-700"
            >
              Excluir
            </button>
          )}
          {card.tags && card.tags.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {card.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-neutral-200 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          {card.hoursSpent > 0 || card.movesNeedle ? (
            <p className="mt-1 text-[11px] uppercase tracking-wide text-neutral-500">
              {card.hoursSpent} h · {card.movesNeedle ? "Ponteiro" : "Operacional"}
            </p>
          ) : null}
          {card.dueAt ? (
            <p
              className={`mt-1 text-xs ${overdue ? "text-red-600" : dueSoon ? "text-neutral-700" : "text-neutral-400"}`}
            >
              Prazo: {new Date(card.dueAt).toLocaleDateString("pt-PT")}
            </p>
          ) : null}
        </div>
      </div>
      {expanded ? (
        <div className="space-y-3 border-t border-neutral-100 px-3 pb-3 pt-2">
          <label className="block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Título
            <input
              disabled={readOnly}
              value={card.title}
              onChange={(e) => {
                const t = e.target.value;
                if (!t.trim()) {
                  onChange({ title: card.title });
                  return;
                }
                onChange({ title: t.slice(0, 500) });
              }}
              className="mt-1 w-full border-b border-neutral-200 bg-transparent py-1 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900"
            />
          </label>
          <label className="block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Notas
            <textarea
              disabled={readOnly}
              value={card.description ?? ""}
              onChange={(e) => onChange({ description: e.target.value || undefined })}
              rows={3}
              className="mt-1 w-full resize-none border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-400"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Prazo
              <input
                type="date"
                disabled={readOnly}
                value={card.dueAt ? card.dueAt.slice(0, 10) : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange({ dueAt: v ? new Date(`${v}T12:00:00.000Z`).toISOString() : undefined });
                }}
                className="mt-1 w-full border border-neutral-200 bg-white px-2 py-2 text-sm outline-none focus:border-neutral-400"
              />
            </label>
            <label className="block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Etiquetas (até 3, vírgula)
              <input
                type="text"
                disabled={readOnly}
                value={(card.tags ?? []).join(", ")}
                onChange={(e) => {
                  const tags = e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .slice(0, 3);
                  onChange({ tags: tags.length ? tags : undefined });
                }}
                className="mt-1 w-full border border-neutral-200 bg-white px-2 py-2 text-sm outline-none focus:border-neutral-400"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Horas gastas
              <input
                type="number"
                min={0}
                step={0.5}
                disabled={readOnly}
                value={card.hoursSpent}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  onChange({ hoursSpent: Number.isFinite(value) && value >= 0 ? value : 0 });
                }}
                className="mt-1 w-full border border-neutral-200 bg-white px-2 py-2 text-sm outline-none focus:border-neutral-400 disabled:bg-neutral-50"
              />
            </label>
            <label className="block text-[11px] font-medium uppercase tracking-wide text-neutral-500 sm:col-span-2">
              Este trabalho
              <select
                disabled={readOnly}
                value={card.movesNeedle && card.needleKind ? card.needleKind : "operacional"}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "operacional") {
                    onChange({ movesNeedle: false, needleKind: undefined, impactAmount: undefined });
                    return;
                  }
                  onChange({ movesNeedle: true, needleKind: value as NeedleKind });
                }}
                className="mt-1 w-full border border-neutral-200 bg-white px-2 py-2 text-sm outline-none focus:border-neutral-400 disabled:bg-neutral-50"
              >
                <option value="operacional">Operacional</option>
                <option value="receita">Aumenta receita</option>
                <option value="despesa">Reduz despesa</option>
                <option value="tempo">Economiza tempo</option>
              </select>
            </label>
          </div>
          {card.movesNeedle ? (
            <label className="block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              {card.needleKind === "tempo" ? "Horas economizadas" : "Valor em R$"}
              <input
                type="number"
                min={0}
                step={card.needleKind === "tempo" ? 0.5 : 1}
                disabled={readOnly}
                value={card.impactAmount ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!raw) {
                    onChange({ impactAmount: undefined });
                    return;
                  }
                  const value = Number(raw);
                  onChange({ impactAmount: Number.isFinite(value) && value >= 0 ? value : undefined });
                }}
                className="mt-1 w-full border border-neutral-200 bg-white px-2 py-2 text-sm outline-none focus:border-neutral-400 disabled:bg-neutral-50"
              />
            </label>
          ) : null}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Sub-itens</p>
            <ul className="mt-2 space-y-1">
              {card.subItems.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={s.done}
                    onChange={() => onToggleSub(s.id)}
                    className="h-3.5 w-3.5 rounded border-neutral-300"
                  />
                  <span className={s.done ? "text-neutral-400 line-through" : "text-neutral-800"}>{s.title}</span>
                  {readOnly ? null : (
                    <button
                      type="button"
                      onClick={() => onRemoveSub(s.id)}
                      className="ml-auto text-xs text-neutral-400 hover:text-neutral-900"
                    >
                      remover
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {readOnly ? null : (
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const title = String(fd.get("sub") ?? "").trim();
                  if (!title) return;
                  if (card.subItems.length >= 10) return;
                  onAddSubItem(title);
                  e.currentTarget.reset();
                }}
              >
                <input
                  name="sub"
                  placeholder="Novo sub-item"
                  className="min-w-0 flex-1 border-b border-neutral-200 bg-transparent py-1 text-sm outline-none focus:border-neutral-900"
                />
                <button type="submit" className="text-xs uppercase tracking-wide text-neutral-600 hover:text-neutral-900">
                  Adicionar
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

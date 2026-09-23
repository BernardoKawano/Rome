import type { BoardState, Card, ColumnId } from "./board-schema";
import { COLUMN_IDS } from "./board-schema";

export function findColumnForCard(state: BoardState, cardId: string): ColumnId | undefined {
  for (const col of COLUMN_IDS) {
    if (state.columns[col].includes(cardId)) return col;
  }
  return undefined;
}

/** Verifica se todos os ids nas colunas existem em `cards` e não há órfãos duplicados. */
export function assertBoardIntegrity(state: BoardState): void {
  const seen = new Set<string>();
  for (const col of COLUMN_IDS) {
    for (const id of state.columns[col]) {
      if (!state.cards[id]) {
        throw new Error(`Cartão referenciado em ${col} não existe: ${id}`);
      }
      if (seen.has(id)) {
        throw new Error(`Cartão duplicado nas colunas: ${id}`);
      }
      seen.add(id);
    }
  }
  for (const id of Object.keys(state.cards)) {
    if (!seen.has(id)) {
      throw new Error(`Cartão órfão (não está em nenhuma coluna): ${id}`);
    }
  }
}

/**
 * Ao mover para a coluna "done" vinda de outra coluna, define completedAt no cartão
 * e acrescenta entrada ao registo (mais recente primeiro após aplicar).
 */
export function applyCompletionOnMove(
  state: BoardState,
  cardId: string,
  fromColumn: ColumnId,
  toColumn: ColumnId,
  nowIso: string
): BoardState {
  if (fromColumn === toColumn) return state;
  const card = state.cards[cardId];
  if (!card) return state;

  if (toColumn === "done" && fromColumn !== "done") {
    const updatedCard: Card = {
      ...card,
      completedAt: nowIso,
      updatedAt: nowIso,
    };
    const entry = { id: card.id, title: card.title, completedAt: nowIso };
    const filtered = state.completedLog.filter((e) => !(e.id === cardId && e.completedAt === nowIso));
    return {
      ...state,
      cards: { ...state.cards, [cardId]: updatedCard },
      completedLog: [entry, ...filtered].slice(0, 500),
    };
  }

  if (toColumn !== "done" && fromColumn === "done") {
    const updatedCard: Card = {
      ...card,
      completedAt: undefined,
      updatedAt: nowIso,
    };
    return {
      ...state,
      cards: { ...state.cards, [cardId]: updatedCard },
    };
  }

  return {
    ...state,
    cards: {
      ...state.cards,
      [cardId]: { ...card, updatedAt: nowIso },
    },
  };
}

/** Reordena ids dentro de uma coluna ou move entre colunas (sem lógica de conclusão). */
export function moveCardBetweenColumns(
  state: BoardState,
  cardId: string,
  fromColumn: ColumnId,
  toColumn: ColumnId,
  targetIndex: number
): BoardState {
  const fromList = state.columns[fromColumn].filter((id) => id !== cardId);
  const toListRaw =
    fromColumn === toColumn ? fromList : state.columns[toColumn].filter((id) => id !== cardId);
  const insertAt = Math.max(0, Math.min(targetIndex, toListRaw.length));
  const toList = [...toListRaw.slice(0, insertAt), cardId, ...toListRaw.slice(insertAt)];

  return {
    ...state,
    columns: {
      ...state.columns,
      [fromColumn]: fromColumn === toColumn ? toList : fromList,
      [toColumn]: fromColumn === toColumn ? toList : toList,
    },
  };
}

/** Remove o cartão das colunas, do mapa e do registo de conclusões. */
export function removeCard(state: BoardState, cardId: string): BoardState {
  const cards = { ...state.cards };
  delete cards[cardId];
  return {
    ...state,
    columns: {
      todo: state.columns.todo.filter((id) => id !== cardId),
      doing: state.columns.doing.filter((id) => id !== cardId),
      done: state.columns.done.filter((id) => id !== cardId),
    },
    cards,
    completedLog: state.completedLog.filter((entry) => entry.id !== cardId),
  };
}

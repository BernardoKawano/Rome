import type { BoardState } from "@/lib/board-schema";
import { safeParseBoardState } from "@/lib/board-schema";

const PREFIX = "kanban-board:";

export function localBoardKey(userId: string): string {
  return `${PREFIX}${userId}`;
}

export function readLocalBoard(userId: string): BoardState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(localBoardKey(userId));
    if (!raw) return null;
    const parsed = safeParseBoardState(JSON.parse(raw) as unknown);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeLocalBoard(userId: string, board: BoardState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(localBoardKey(userId), JSON.stringify(board));
  } catch {
    // quota ou modo privado
  }
}

export function boardHasContent(board: BoardState): boolean {
  return Object.keys(board.cards).length > 0 || board.completedLog.length > 0;
}

function boardRevision(board: BoardState): number {
  let max = 0;
  for (const card of Object.values(board.cards)) {
    const t = Date.parse(card.updatedAt);
    if (!Number.isNaN(t) && t > max) max = t;
  }
  for (const entry of board.completedLog) {
    const t = Date.parse(entry.completedAt);
    if (!Number.isNaN(t) && t > max) max = t;
  }
  return max;
}

/** Escolhe o tabuleiro com alterações mais recentes. */
export function pickNewerBoard(a: BoardState, b: BoardState): BoardState {
  return boardRevision(a) >= boardRevision(b) ? a : b;
}

export function mergeBoardSources(server: BoardState, local: BoardState | null): BoardState {
  if (!local) return server;
  if (!boardHasContent(local)) return server;
  if (!boardHasContent(server)) return local;
  return pickNewerBoard(server, local);
}

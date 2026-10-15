import { z } from "zod";

export const COLUMN_IDS = ["todo", "doing", "done"] as const;
export type ColumnId = (typeof COLUMN_IDS)[number];

export const NEEDLE_KINDS = ["receita", "despesa", "tempo"] as const;
export type NeedleKind = (typeof NEEDLE_KINDS)[number];

export const subItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  done: z.boolean(),
});

/** Pessoa para quem a POC foi enviada. Sem credenciais. */
export const pocRecipientSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(120),
    role: z.string().max(80).optional(),
    sentAt: z.string().datetime().optional(),
  })
  .strict();

/** Acesso concedido pela empresa. Descrição apenas: ambiente, papel, URL e o que foi liberado. */
export const pocAccessSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1).max(120),
    role: z.string().max(80).optional(),
    url: z.string().max(500).optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();

export const cardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  dueAt: z.string().datetime().optional(),
  tags: z.array(z.string().max(40)).max(3).optional(),
  subItems: z.array(subItemSchema).max(10).default([]),
  /** Horas gastas neste cartão. Cartões antigos sem o campo contam como 0. */
  hoursSpent: z.number().min(0).max(1000).default(0),
  /** Verdadeiro quando o trabalho aumenta receita, reduz despesa ou economiza tempo. */
  movesNeedle: z.boolean().default(false),
  needleKind: z.enum(NEEDLE_KINDS).optional(),
  /** Reais (receita/despesa) ou horas economizadas (tempo). */
  impactAmount: z.number().min(0).max(1_000_000_000).optional(),
  /** Empresa no momento em que o cartão foi criado. Permanece se o talento mudar de empresa. */
  company: z.string().max(120).optional(),
  /** Cartões antigos sem o campo não são POC. */
  isPoc: z.boolean().default(false),
  pocCompany: z.string().max(120).optional(),
  pocAddress: z.string().max(300).optional(),
  pocRecipients: z.array(pocRecipientSchema).max(20).default([]),
  pocAccess: z.array(pocAccessSchema).max(20).default([]),
  completedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const completedLogEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  completedAt: z.string().datetime(),
});

export const boardStateSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  columns: z.object({
    todo: z.array(z.string()),
    doing: z.array(z.string()),
    done: z.array(z.string()),
  }),
  cards: z.record(z.string(), cardSchema),
  completedLog: z.array(completedLogEntrySchema).max(500),
});

export type SubItem = z.infer<typeof subItemSchema>;
export type PocRecipient = z.infer<typeof pocRecipientSchema>;
export type PocAccess = z.infer<typeof pocAccessSchema>;
export type Card = z.infer<typeof cardSchema>;
export type CompletedLogEntry = z.infer<typeof completedLogEntrySchema>;
export type BoardState = z.infer<typeof boardStateSchema>;

function newId(): string {
  return crypto.randomUUID();
}

export function createDefaultBoard(): BoardState {
  return {
    version: 2,
    columns: { todo: [], doing: [], done: [] },
    cards: {},
    completedLog: [],
  };
}

/** Quadros gravados na versão 1 continuam válidos e passam a versão 2 ao serem guardados. */
export function withCurrentVersion(board: BoardState): BoardState {
  if (board.version === 2) return board;
  return { ...board, version: 2 };
}

export function parseBoardState(raw: unknown): BoardState {
  return boardStateSchema.parse(raw);
}

export function safeParseBoardState(raw: unknown) {
  return boardStateSchema.safeParse(raw);
}

export function createCard(input: {
  title: string;
  description?: string;
  dueAt?: string;
  tags?: string[];
  company?: string;
}): Card {
  const now = new Date().toISOString();
  const company = input.company?.trim();
  return {
    id: newId(),
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    dueAt: input.dueAt,
    tags: input.tags?.slice(0, 3),
    subItems: [],
    hoursSpent: 0,
    movesNeedle: false,
    company: company || undefined,
    isPoc: false,
    pocRecipients: [],
    pocAccess: [],
    createdAt: now,
    updatedAt: now,
  };
}

export { newId };

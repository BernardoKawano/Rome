import fs from "fs/promises";
import path from "path";

export function boardDataDir(): string {
  return process.env.BOARD_DATA_DIR?.trim() || path.join(process.cwd(), ".data", "boards");
}

/** Nome de ficheiro seguro a partir do id de utilizador. */
export function safeBoardFilename(userId: string): string {
  const base = userId.trim() || "anonymous";
  return `${base.replace(/[^a-zA-Z0-9._-]/g, "_")}.json`;
}

export function boardFilePath(userId: string): string {
  return path.join(boardDataDir(), safeBoardFilename(userId));
}

export async function readBoardFromFile(userId: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(boardFilePath(userId), "utf-8");
    return JSON.parse(raw) as unknown;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw e;
  }
}

export async function writeBoardToFile(userId: string, data: unknown): Promise<void> {
  const dir = boardDataDir();
  await fs.mkdir(dir, { recursive: true });
  const file = boardFilePath(userId);
  await fs.writeFile(file, JSON.stringify(data), "utf-8");
}

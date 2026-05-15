import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  boardFilePath,
  readBoardFromFile,
  safeBoardFilename,
  writeBoardToFile,
} from "./board-file-store";

describe("board-file-store", () => {
  let tmpDir: string;
  const prevDir = process.env.BOARD_DATA_DIR;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "kanban-board-"));
    process.env.BOARD_DATA_DIR = tmpDir;
  });

  afterEach(async () => {
    if (prevDir === undefined) delete process.env.BOARD_DATA_DIR;
    else process.env.BOARD_DATA_DIR = prevDir;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("safeBoardFilename remove caracteres inválidos", () => {
    expect(safeBoardFilename("app:user@host")).toBe("app_user_host.json");
  });

  it("readBoardFromFile devolve null se o ficheiro não existir", async () => {
    expect(await readBoardFromFile("app:test")).toBeNull();
  });

  it("writeBoardToFile e readBoardFromFile fazem round-trip", async () => {
    const userId = "app_demo";
    const board = { version: 1, columns: { todo: [], doing: [], done: [] }, cards: {}, completedLog: [] };
    await writeBoardToFile(userId, board);
    expect(await readBoardFromFile(userId)).toEqual(board);
    expect(boardFilePath(userId)).toContain(safeBoardFilename(userId));
  });
});

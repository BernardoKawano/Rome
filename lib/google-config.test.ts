import { describe, expect, it, afterEach } from "vitest";
import { GOOGLE_BOARD_FILENAME, isGoogleAuthConfigured } from "./google-config";

describe("google-config", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("isGoogleAuthConfigured aceita VERCEL_URL como redirect", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;
    delete process.env.VERCEL_URL;
    expect(isGoogleAuthConfigured()).toBe(false);

    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    process.env.VERCEL_URL = "rome.vercel.app";
    expect(isGoogleAuthConfigured()).toBe(true);
  });

  it("nome do ficheiro no Drive é fixo", () => {
    expect(GOOGLE_BOARD_FILENAME).toBe("demandas-kanban.json");
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

describe("session", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("cria e valida token de sessão", async () => {
    process.env.AUTH_SESSION_SECRET = "test-secret-key";
    const token = await createSessionToken("ber.kawano");
    expect(await verifySessionToken(token)).toBe("app:ber.kawano");
    expect(await verifySessionToken("invalid.token")).toBeNull();
  });
});

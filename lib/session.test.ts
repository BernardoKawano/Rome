import { afterEach, describe, expect, it } from "vitest";
import { signSessionPayload, verifySessionPayload } from "./session-crypto";

describe("session-crypto", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("cria e valida payload de sessão Google", async () => {
    process.env.AUTH_SESSION_SECRET = "test-secret-key";
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = await signSessionPayload({
      sub: "google-user-1",
      exp,
      email: "user@example.com",
      accessToken: "access",
      refreshToken: "refresh",
      accessTokenExp: Date.now() + 3600_000,
    });
    const payload = await verifySessionPayload(token);
    expect(payload?.sub).toBe("google-user-1");
    expect((payload as { email?: string })?.email).toBe("user@example.com");
    expect(await verifySessionPayload("invalid.token")).toBeNull();
  });
});

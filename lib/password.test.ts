import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("aceita a senha original e rejeita outra", () => {
    const stored = hashPassword("senha-do-gestor-local");
    expect(verifyPassword("senha-do-gestor-local", stored.salt, stored.hash)).toBe(true);
    expect(verifyPassword("outra-senha", stored.salt, stored.hash)).toBe(false);
  });
});

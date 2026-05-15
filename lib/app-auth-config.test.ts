import { afterEach, describe, expect, it } from "vitest";
import { appAuthUserId, isAppAuthConfigured, validateAppCredentials } from "./app-auth-config";

describe("app-auth-config", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("isAppAuthConfigured exige utilizador e senha", () => {
    delete process.env.APP_AUTH_USERNAME;
    delete process.env.APP_AUTH_PASSWORD;
    expect(isAppAuthConfigured()).toBe(false);

    process.env.APP_AUTH_USERNAME = "ber.kawano";
    process.env.APP_AUTH_PASSWORD = "secret";
    expect(isAppAuthConfigured()).toBe(true);
  });

  it("validateAppCredentials aceita credenciais corretas", () => {
    process.env.APP_AUTH_USERNAME = "ber.kawano";
    process.env.APP_AUTH_PASSWORD = "MasterBoard88!!";
    expect(validateAppCredentials("ber.kawano", "MasterBoard88!!")).toBe(true);
    expect(validateAppCredentials("ber.kawano", "wrong")).toBe(false);
  });

  it("appAuthUserId normaliza o nome", () => {
    expect(appAuthUserId("ber.kawano")).toBe("app:ber.kawano");
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { isEphemeralServer, isFileStoreAllowed, isSupabaseConfigured } from "./env";

describe("supabase/env", () => {
  const previous = {
    VERCEL: process.env.VERCEL,
    AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("isSupabaseConfigured exige URL e chave pública", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(isSupabaseConfigured()).toBe(false);

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("isFileStoreAllowed fica falso na Vercel mesmo em development", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    delete process.env.VERCEL;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    expect(isFileStoreAllowed()).toBe(true);
    expect(isEphemeralServer()).toBe(false);

    process.env.VERCEL = "1";
    expect(isEphemeralServer()).toBe(true);
    expect(isFileStoreAllowed()).toBe(false);
  });

  it("isFileStoreAllowed fica falso em production local", () => {
    delete process.env.VERCEL;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    expect(isFileStoreAllowed()).toBe(false);
  });
});

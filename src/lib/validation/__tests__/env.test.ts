import { describe, it, expect } from "vitest";
import { validateEnv } from "../env";

const validEnv: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abc123.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
  SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service",
  STRIPE_SECRET_KEY: "sk_test_abc123",
  STRIPE_WEBHOOK_SECRET: "whsec_test_abc123",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc123",
  ANTHROPIC_API_KEY: "sk-ant-api03-test",
  NEXT_PUBLIC_APP_URL: "https://app.korva.com",
};

describe("validateEnv", () => {
  it("passes with all required vars present", () => {
    expect(() => validateEnv(validEnv)).not.toThrow();
  });

  it("returns parsed env object", () => {
    const result = validateEnv(validEnv);
    expect(result.NEXT_PUBLIC_SUPABASE_URL).toBe("https://abc123.supabase.co");
    expect(result.STRIPE_SECRET_KEY).toBe("sk_test_abc123");
  });

  it("throws when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
    const env = { ...validEnv };
    delete env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => validateEnv(env)).toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("throws when SUPABASE_SERVICE_ROLE_KEY is missing", () => {
    const env = { ...validEnv };
    delete env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => validateEnv(env)).toThrow("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("throws when STRIPE_SECRET_KEY has wrong prefix", () => {
    const env = { ...validEnv, STRIPE_SECRET_KEY: "invalid_key" };
    expect(() => validateEnv(env)).toThrow("must start with 'sk_'");
  });

  it("throws when STRIPE_WEBHOOK_SECRET has wrong prefix", () => {
    const env = { ...validEnv, STRIPE_WEBHOOK_SECRET: "invalid_secret" };
    expect(() => validateEnv(env)).toThrow("must start with 'whsec_'");
  });

  it("throws when NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY has wrong prefix", () => {
    const env = { ...validEnv, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "invalid" };
    expect(() => validateEnv(env)).toThrow("must start with 'pk_'");
  });

  it("throws when ANTHROPIC_API_KEY is missing", () => {
    const env = { ...validEnv };
    delete env.ANTHROPIC_API_KEY;
    expect(() => validateEnv(env)).toThrow("ANTHROPIC_API_KEY");
  });

  it("throws when NEXT_PUBLIC_APP_URL is not a valid URL", () => {
    const env = { ...validEnv, NEXT_PUBLIC_APP_URL: "not-a-url" };
    expect(() => validateEnv(env)).toThrow("must be a valid URL");
  });

  it("allows optional vars to be absent", () => {
    // validEnv has no optional vars set — should still pass
    expect(() => validateEnv(validEnv)).not.toThrow();
  });

  it("accepts optional vars when present", () => {
    const env = {
      ...validEnv,
      CRON_SECRET: "my-cron-secret",
      RESEND_API_KEY: "re_test_123",
      SHOPIFY_API_KEY: "shopify_key",
    };
    const result = validateEnv(env);
    expect(result.CRON_SECRET).toBe("my-cron-secret");
    expect(result.RESEND_API_KEY).toBe("re_test_123");
  });

  it("lists multiple errors when several vars are missing", () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
      NEXT_PUBLIC_APP_URL: "https://app.korva.com",
    };
    try {
      validateEnv(env);
      expect.fail("Should have thrown");
    } catch (e) {
      const message = (e as Error).message;
      expect(message).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
      expect(message).toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(message).toContain("STRIPE_SECRET_KEY");
      expect(message).toContain("ANTHROPIC_API_KEY");
    }
  });

  it("includes helpful message about .env.local", () => {
    try {
      validateEnv({});
      expect.fail("Should have thrown");
    } catch (e) {
      expect((e as Error).message).toContain(".env.local");
    }
  });
});

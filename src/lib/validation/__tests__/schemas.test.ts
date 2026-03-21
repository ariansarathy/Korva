import { describe, it, expect } from "vitest";
import {
  CustomerSearchSchema,
  ProductSearchSchema,
  AiQuerySchema,
  TeamInviteSchema,
  PaginationSchema,
  ReportGenerateSchema,
  StoreConnectSchema,
  sanitizeSearchInput,
} from "../schemas";

describe("sanitizeSearchInput", () => {
  it("removes SQL wildcards", () => {
    expect(sanitizeSearchInput("test%value")).toBe("testvalue");
    expect(sanitizeSearchInput("test_value")).toBe("testvalue");
  });

  it("removes PostgREST syntax characters", () => {
    expect(sanitizeSearchInput("first_name.ilike.%hack%")).toBe("firstnameilikehack");
  });

  it("removes SQL injection characters", () => {
    expect(sanitizeSearchInput("'; DROP TABLE customers;--")).toBe("DROP TABLE customers--");
  });

  it("removes XSS characters", () => {
    expect(sanitizeSearchInput('<script>alert("xss")</script>')).toBe("scriptalertxss/script");
  });

  it("trims whitespace", () => {
    expect(sanitizeSearchInput("  hello  ")).toBe("hello");
  });

  it("truncates to 200 characters", () => {
    const longInput = "a".repeat(300);
    expect(sanitizeSearchInput(longInput).length).toBe(200);
  });

  it("preserves safe alphanumeric input", () => {
    expect(sanitizeSearchInput("John Smith")).toBe("John Smith");
    expect(sanitizeSearchInput("alice123")).toBe("alice123");
  });

  it("handles empty string", () => {
    expect(sanitizeSearchInput("")).toBe("");
  });
});

describe("PaginationSchema", () => {
  it("provides defaults for empty input", () => {
    const result = PaginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("coerces string numbers", () => {
    const result = PaginationSchema.parse({ page: "3", limit: "50" });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it("rejects page < 1", () => {
    expect(() => PaginationSchema.parse({ page: 0 })).toThrow();
    expect(() => PaginationSchema.parse({ page: -1 })).toThrow();
  });

  it("rejects limit > 100", () => {
    expect(() => PaginationSchema.parse({ limit: 101 })).toThrow();
  });

  it("rejects limit < 1", () => {
    expect(() => PaginationSchema.parse({ limit: 0 })).toThrow();
  });
});

describe("CustomerSearchSchema", () => {
  it("sanitizes search input", () => {
    const result = CustomerSearchSchema.parse({ search: "alice%' OR 1=1" });
    expect(result.search).not.toContain("%");
    expect(result.search).not.toContain("'");
  });

  it("accepts valid segment values", () => {
    const result = CustomerSearchSchema.parse({ segment: "vip" });
    expect(result.segment).toBe("vip");
  });

  it("defaults to empty search and segment", () => {
    const result = CustomerSearchSchema.parse({});
    expect(result.search).toBe("");
    expect(result.segment).toBe("");
  });

  it("provides default pagination", () => {
    const result = CustomerSearchSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});

describe("ProductSearchSchema", () => {
  it("sanitizes search input", () => {
    const result = ProductSearchSchema.parse({
      search: "widget'); DELETE FROM products;--",
    });
    expect(result.search).not.toContain("'");
    expect(result.search).not.toContain(";");
    expect(result.search).not.toContain(")");
  });

  it("accepts valid status values", () => {
    const result = ProductSearchSchema.parse({ status: "active" });
    expect(result.status).toBe("active");
  });
});

describe("AiQuerySchema", () => {
  it("accepts valid question", () => {
    const result = AiQuerySchema.parse({ question: "What is my revenue?" });
    expect(result.question).toBe("What is my revenue?");
  });

  it("trims whitespace from question", () => {
    const result = AiQuerySchema.parse({ question: "  What is my revenue?  " });
    expect(result.question).toBe("What is my revenue?");
  });

  it("rejects question shorter than 3 characters", () => {
    expect(() => AiQuerySchema.parse({ question: "hi" })).toThrow();
  });

  it("rejects question longer than 2000 characters", () => {
    expect(() => AiQuerySchema.parse({ question: "a".repeat(2001) })).toThrow();
  });

  it("accepts optional conversation_id as UUID", () => {
    const result = AiQuerySchema.parse({
      question: "Show revenue",
      conversation_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.conversation_id).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects non-UUID conversation_id", () => {
    expect(() =>
      AiQuerySchema.parse({ question: "Show revenue", conversation_id: "not-a-uuid" })
    ).toThrow();
  });

  it("allows omitted conversation_id", () => {
    const result = AiQuerySchema.parse({ question: "Show revenue" });
    expect(result.conversation_id).toBeUndefined();
  });
});

describe("TeamInviteSchema", () => {
  it("accepts valid email and role", () => {
    const result = TeamInviteSchema.parse({
      email: "john@example.com",
      role: "member",
    });
    expect(result.email).toBe("john@example.com");
    expect(result.role).toBe("member");
  });

  it("normalizes email to lowercase", () => {
    const result = TeamInviteSchema.parse({
      email: "John@Example.COM",
      role: "admin",
    });
    expect(result.email).toBe("john@example.com");
  });

  it("trims email whitespace", () => {
    const result = TeamInviteSchema.parse({
      email: "  john@example.com  ",
      role: "viewer",
    });
    expect(result.email).toBe("john@example.com");
  });

  it("rejects invalid email", () => {
    expect(() =>
      TeamInviteSchema.parse({ email: "not-an-email", role: "member" })
    ).toThrow("Valid email address");
  });

  it("rejects email without @", () => {
    expect(() =>
      TeamInviteSchema.parse({ email: "notanemail", role: "member" })
    ).toThrow();
  });

  it("rejects invalid role", () => {
    expect(() =>
      TeamInviteSchema.parse({ email: "john@example.com", role: "superadmin" })
    ).toThrow();
  });

  it("accepts all valid roles", () => {
    for (const role of ["admin", "member", "viewer"]) {
      const result = TeamInviteSchema.parse({
        email: "test@example.com",
        role,
      });
      expect(result.role).toBe(role);
    }
  });
});

describe("ReportGenerateSchema", () => {
  it("accepts valid report type", () => {
    const result = ReportGenerateSchema.parse({ type: "summary" });
    expect(result.type).toBe("summary");
    expect(result.period).toBe("30d");
    expect(result.format).toBe("email");
  });

  it("rejects invalid type", () => {
    expect(() => ReportGenerateSchema.parse({ type: "invalid" })).toThrow();
  });
});

describe("StoreConnectSchema", () => {
  it("accepts valid store connection", () => {
    const result = StoreConnectSchema.parse({
      platform: "shopify",
      domain: "My-Store.myshopify.com",
    });
    expect(result.platform).toBe("shopify");
    expect(result.domain).toBe("my-store.myshopify.com");
  });

  it("rejects invalid platform", () => {
    expect(() =>
      StoreConnectSchema.parse({ platform: "etsy", domain: "test.com" })
    ).toThrow();
  });

  it("rejects empty domain", () => {
    expect(() =>
      StoreConnectSchema.parse({ platform: "shopify", domain: "" })
    ).toThrow();
  });
});

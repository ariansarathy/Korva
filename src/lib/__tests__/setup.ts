import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// ─── Mock Supabase Server Client ─────────────────────────────────

/**
 * Creates a chainable mock query builder that supports
 * all common Supabase PostgREST methods.
 */
export function createMockQueryBuilder(resolvedData: unknown = null, resolvedError: unknown = null) {
  const builder: Record<string, unknown> = {};

  const chainMethods = [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "in",
    "not",
    "or",
    "order",
    "limit",
    "range",
    "single",
    "maybeSingle",
    "is",
    "ilike",
    "like",
    "filter",
    "match",
    "textSearch",
    "containedBy",
    "contains",
    "overlaps",
  ];

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  // Terminal methods that resolve data
  builder.then = vi.fn().mockImplementation((resolve) =>
    resolve({ data: resolvedData, error: resolvedError, count: Array.isArray(resolvedData) ? resolvedData.length : null })
  );

  // Make it thenable
  Object.defineProperty(builder, Symbol.toStringTag, { value: "Promise" });

  // Override select to also set data and count for head queries
  const originalSelect = builder.select as ReturnType<typeof vi.fn>;
  builder.select = vi.fn().mockImplementation((...args: unknown[]) => {
    const opts = args[1] as { count?: string; head?: boolean } | undefined;
    if (opts?.head && opts?.count === "exact") {
      // Return object with count property
      const headBuilder = { ...builder };
      headBuilder.then = vi.fn().mockImplementation((resolve) =>
        resolve({ data: null, error: resolvedError, count: Array.isArray(resolvedData) ? resolvedData.length : 0 })
      );
      Object.defineProperty(headBuilder, Symbol.toStringTag, { value: "Promise" });
      // Re-chain all methods on headBuilder
      for (const m of chainMethods) {
        if (m !== "select") {
          headBuilder[m] = vi.fn().mockReturnValue(headBuilder);
        }
      }
      return headBuilder;
    }
    return originalSelect(...args);
  });

  return builder;
}

/**
 * Creates a mock Supabase client with customizable table responses.
 */
export function createMockSupabaseClient(tableResponses: Record<string, { data?: unknown; error?: unknown }> = {}) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      const response = tableResponses[table] ?? { data: null, error: null };
      return createMockQueryBuilder(response.data, response.error);
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user-id", email: "test@example.com" } },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

// ─── Default Mocks ───────────────────────────────────────────────

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(createMockSupabaseClient()),
}));

// Mock Supabase browser client
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn().mockReturnValue(createMockSupabaseClient()),
}));

// Mock Supabase admin client
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue(createMockSupabaseClient()),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn().mockReturnValue([]),
  }),
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
  }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: vi.fn().mockReturnValue("/"),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
}));

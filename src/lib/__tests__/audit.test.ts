import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mocks for vi.mock factories
const { mockInsertFn, mockThen } = vi.hoisted(() => {
  const mockThen = vi.fn().mockImplementation((resolve) => {
    resolve({ error: null });
    return { catch: vi.fn() };
  });

  const mockInsertFn = vi.fn().mockReturnValue({ then: mockThen });

  return { mockInsertFn, mockThen };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      insert: mockInsertFn,
    }),
  }),
}));

// Suppress logger output
vi.mock("@/lib/logging/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logAudit } from "../audit";

describe("logAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockThen.mockImplementation((resolve) => {
      resolve({ error: null });
      return { catch: vi.fn() };
    });
  });

  it("inserts an audit log entry with correct fields", () => {
    logAudit("user-123", "store-456", "ai_query", "conversation", "conv-789", {
      question: "What is my revenue?",
    });

    expect(mockInsertFn).toHaveBeenCalledWith({
      user_id: "user-123",
      store_id: "store-456",
      action: "ai_query",
      entity_type: "conversation",
      entity_id: "conv-789",
      metadata: { question: "What is my revenue?" },
      ip_address: null,
    });
  });

  it("extracts IP from x-forwarded-for header", () => {
    const mockRequest = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "192.168.1.100, 10.0.0.1" },
    });

    logAudit("user-123", "store-456", "data_export", undefined, undefined, undefined, mockRequest);

    expect(mockInsertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        ip_address: "192.168.1.100",
      })
    );
  });

  it("handles null store_id", () => {
    logAudit("user-123", null, "settings_update");

    expect(mockInsertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        store_id: null,
        action: "settings_update",
      })
    );
  });

  it("defaults metadata to empty object", () => {
    logAudit("user-123", "store-456", "team_invite");

    expect(mockInsertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {},
      })
    );
  });

  it("defaults entity_type and entity_id to null", () => {
    logAudit("user-123", "store-456", "store_switch");

    expect(mockInsertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: null,
        entity_id: null,
      })
    );
  });

  it("is fire-and-forget (does not throw on insert error)", () => {
    mockThen.mockImplementation((resolve) => {
      resolve({ error: { message: "DB error" } });
      return { catch: vi.fn() };
    });

    // Should not throw
    expect(() => {
      logAudit("user-123", "store-456", "ai_query");
    }).not.toThrow();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, withTiming } from "../logger";

// Suppress all console output globally for this test file
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logger", () => {
  it("calls console.log for info level", () => {
    logger.info("test message");
    expect(console.log).toHaveBeenCalled();
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0] as string;
    expect(lastCall).toContain("test message");
  });

  it("calls console.error for error level", () => {
    logger.error("test error");
    expect(console.error).toHaveBeenCalled();
    const calls = (console.error as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0] as string;
    expect(lastCall).toContain("test error");
  });

  it("calls console.warn for warn level", () => {
    logger.warn("test warning");
    expect(console.warn).toHaveBeenCalled();
    const calls = (console.warn as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0] as string;
    expect(lastCall).toContain("test warning");
  });

  it("includes context in output", () => {
    logger.info("with context", { userId: "user-123", path: "/api/test" });
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0] as string;
    expect(lastCall).toContain("user-123");
    expect(lastCall).toContain("/api/test");
  });

  it("formats error objects", () => {
    logger.error("something failed", { error: new Error("boom") });
    const calls = (console.error as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0] as string;
    expect(lastCall).toContain("boom");
  });

  it("handles non-Error objects in error field", () => {
    logger.error("something failed", { error: "string error" });
    const calls = (console.error as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0] as string;
    expect(lastCall).toContain("string error");
  });

  describe("child logger", () => {
    it("merges default context with per-call context", () => {
      const child = logger.child({ userId: "user-abc", storeId: "store-xyz" });
      child.info("child message", { path: "/api/test" });

      const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = calls[calls.length - 1][0] as string;
      expect(lastCall).toContain("user-abc");
      expect(lastCall).toContain("store-xyz");
      expect(lastCall).toContain("/api/test");
    });

    it("supports all log levels", () => {
      const child = logger.child({ userId: "user-1" });
      child.debug("debug msg");
      child.info("info msg");
      child.warn("warn msg");
      child.error("error msg");

      // debug + info go to console.log
      expect(console.log).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });
});

describe("withTiming", () => {
  it("returns the function result", async () => {
    const result = await withTiming("test", async () => 42);
    expect(result).toBe(42);
  });

  it("logs duration on success", async () => {
    await withTiming("test-op", async () => "ok");

    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
    const matchingCall = calls.find((c) => (c[0] as string).includes("test-op"));
    expect(matchingCall).toBeDefined();
    expect(matchingCall![0]).toContain("durationMs");
  });

  it("logs and re-throws on error", async () => {
    await expect(
      withTiming("failing-op", async () => {
        throw new Error("failure");
      })
    ).rejects.toThrow("failure");

    const calls = (console.error as ReturnType<typeof vi.fn>).mock.calls;
    const matchingCall = calls.find((c) => (c[0] as string).includes("failing-op"));
    expect(matchingCall).toBeDefined();
  });

  it("passes context through", async () => {
    await withTiming("ctx-op", async () => "ok", { userId: "u-123" });

    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
    const matchingCall = calls.find((c) => (c[0] as string).includes("u-123"));
    expect(matchingCall).toBeDefined();
  });
});

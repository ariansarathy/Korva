import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DB-backed rate limiter using atomic PL/pgSQL check-and-increment.
 * Works correctly across serverless cold starts (no in-memory state).
 * Uses the `check_rate_limit` RPC with FOR UPDATE row locking.
 */
export async function checkRateLimit(
  keyId: string,
  limitPerMinute: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const resetAt = now + 60_000;

  try {
    const supabase = createAdminClient();

    const { data: allowed, error } = await supabase.rpc("check_rate_limit", {
      p_key: keyId,
      p_max_count: limitPerMinute,
      p_window_seconds: 60,
    });

    if (error) {
      console.error("Rate limit RPC error:", error);
      // Fail open on error — don't block requests due to rate limiter issues
      return { allowed: true, remaining: limitPerMinute, resetAt };
    }

    return {
      allowed: !!allowed,
      remaining: allowed ? Math.max(0, limitPerMinute - 1) : 0,
      resetAt,
    };
  } catch (err) {
    console.error("Rate limiter error:", err);
    // Fail open on unexpected errors
    return { allowed: true, remaining: limitPerMinute, resetAt };
  }
}

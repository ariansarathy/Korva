import { NextResponse } from "next/server";
import { checkRateLimit } from "./rate-limiter";

const DASHBOARD_RATE_LIMIT = 120; // requests per minute

/**
 * Check rate limit for authenticated dashboard routes.
 * Uses user ID as the rate limit key.
 * Returns null if allowed, or a 429 response if rate limited.
 */
export async function checkDashboardRateLimit(
  userId: string
): Promise<NextResponse | null> {
  const key = `dashboard:${userId}`;
  const { allowed, remaining, resetAt } = await checkRateLimit(key, DASHBOARD_RATE_LIMIT);

  if (!allowed) {
    return NextResponse.json(
      {
        error: "Too many requests. Please wait a moment and try again.",
        retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(DASHBOARD_RATE_LIMIT),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // Allowed — return null (no blocking response)
  return null;
}

export { DASHBOARD_RATE_LIMIT };

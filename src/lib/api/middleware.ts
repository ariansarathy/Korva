import { NextResponse, type NextRequest } from "next/server";
import { authenticateApiKey, getApiUserStore, type ApiKeyInfo } from "./auth";
import { checkRateLimit } from "./rate-limiter";

export interface ApiContext {
  keyInfo: ApiKeyInfo;
  storeId: string;
  userId: string;
}

/**
 * Shared middleware for all v1 API endpoints.
 * Authenticates via API key, checks rate limits, resolves the store.
 */
export async function withApiAuth(
  request: NextRequest,
  requiredScope?: string
): Promise<{ ctx: ApiContext } | { error: NextResponse }> {
  // Authenticate
  const keyInfo = await authenticateApiKey(request);
  if (!keyInfo) {
    return {
      error: NextResponse.json(
        { error: "Invalid or missing API key. Include Authorization: Bearer korva_sk_..." },
        { status: 401 }
      ),
    };
  }

  // Check scope
  if (requiredScope && !keyInfo.scopes.includes(requiredScope) && !keyInfo.scopes.includes("*")) {
    return {
      error: NextResponse.json(
        { error: `Insufficient scope. Required: ${requiredScope}` },
        { status: 403 }
      ),
    };
  }

  // Rate limit
  const rateResult = await checkRateLimit(keyInfo.keyId, keyInfo.rateLimitPerMinute);
  if (!rateResult.allowed) {
    return {
      error: NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(keyInfo.rateLimitPerMinute),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(rateResult.resetAt / 1000)),
            "Retry-After": "60",
          },
        }
      ),
    };
  }

  // Resolve store
  const store = await getApiUserStore(keyInfo.userId);
  if (!store) {
    return {
      error: NextResponse.json(
        { error: "No store connected to this account." },
        { status: 400 }
      ),
    };
  }

  return {
    ctx: {
      keyInfo,
      storeId: store.id,
      userId: keyInfo.userId,
    },
  };
}

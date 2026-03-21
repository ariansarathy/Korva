import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";
import type { NextRequest } from "next/server";

export interface ApiKeyInfo {
  keyId: string;
  userId: string;
  scopes: string[];
  rateLimitPerMinute: number;
}

/**
 * Authenticate a request using Bearer token API key.
 * Reads `Authorization: Bearer korva_sk_...`, hashes the key, looks up in api_keys table.
 * Returns key info or null if invalid.
 */
export async function authenticateApiKey(
  request: NextRequest
): Promise<ApiKeyInfo | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith("korva_sk_")) {
    return null;
  }

  // Hash the key for lookup
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const adminSupabase = createAdminClient();

  const { data: apiKey, error } = await adminSupabase
    .from("api_keys")
    .select("id, user_id, scopes, rate_limit_per_minute, revoked_at, expires_at")
    .eq("key_hash", keyHash)
    .single();

  if (error || !apiKey) {
    return null;
  }

  // Check if revoked
  if (apiKey.revoked_at) {
    return null;
  }

  // Check if expired
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return null;
  }

  // Update last_used_at
  await adminSupabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id);

  return {
    keyId: apiKey.id,
    userId: apiKey.user_id,
    scopes: (apiKey.scopes as string[]) ?? [],
    rateLimitPerMinute: apiKey.rate_limit_per_minute,
  };
}

/**
 * Get the store for an authenticated API user.
 */
export async function getApiUserStore(userId: string) {
  const adminSupabase = createAdminClient();

  const { data: store } = await adminSupabase
    .from("stores")
    .select("*")
    .eq("user_id", userId)
    .order("connected_at", { ascending: false })
    .limit(1)
    .single();

  return store;
}

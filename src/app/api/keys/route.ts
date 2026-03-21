import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/utils/auth";
import { randomBytes, createHash } from "crypto";

/**
 * GET /api/keys
 * Returns all API keys for the authenticated user (excluding hashes).
 */
export async function GET() {
  try {
    const userId = await requireAuth();
    const supabase = await createClient();

    const { data: keys, error } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, scopes, last_used_at, expires_at, revoked_at, rate_limit_per_minute, created_at")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
    }

    return NextResponse.json({ keys: keys ?? [] });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * POST /api/keys
 * Body: { name: string, scopes?: string[], expiresInDays?: number }
 * Creates a new API key. Returns the raw key ONCE — it won't be retrievable again.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const { name, scopes, expiresInDays } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    // Generate key: korva_sk_ + 48 random bytes hex
    const rawKeyBytes = randomBytes(48);
    const rawKey = `korva_sk_${rawKeyBytes.toString("hex")}`;
    const keyPrefix = rawKey.slice(0, 16); // korva_sk_XXXX...
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    // Default scopes: all read
    const keyScopes = scopes && Array.isArray(scopes) ? scopes : ["*"];

    // Expiry
    let expiresAt: string | null = null;
    if (expiresInDays && expiresInDays > 0) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + expiresInDays);
      expiresAt = expiry.toISOString();
    }

    const supabase = await createClient();

    const { data: key, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: userId,
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scopes: keyScopes,
        expires_at: expiresAt,
        rate_limit_per_minute: 60,
      })
      .select("id, name, key_prefix, scopes, expires_at, rate_limit_per_minute, created_at")
      .single();

    if (error) {
      console.error("API key creation error:", error);
      return NextResponse.json(
        { error: "Failed to create API key" },
        { status: 500 }
      );
    }

    // Return the raw key — this is the ONLY time it will be visible
    return NextResponse.json(
      {
        key: {
          ...key,
          raw_key: rawKey,
        },
        warning: "Save this API key now. It won't be shown again.",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * DELETE /api/keys
 * Body: { keyId: string }
 * Revokes an API key.
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const { keyId } = await request.json();

    if (!keyId) {
      return NextResponse.json(
        { error: "keyId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", keyId)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to revoke key" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { randomBytes } from "crypto";

/**
 * GET /api/webhooks/manage
 * Returns webhook configurations for the current store.
 */
export async function GET() {
  try {
    const { store } = await getCurrentUserStore();
    if (!store) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: webhooks, error } = await supabase
      .from("webhook_configs")
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch webhooks" },
        { status: 500 }
      );
    }

    return NextResponse.json({ webhooks: webhooks ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webhooks/manage
 * Create or update a webhook endpoint configuration.
 */
export async function POST(request: NextRequest) {
  try {
    const { store } = await getCurrentUserStore();
    if (!store) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, url, events, enabled } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Webhook URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook URL" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    if (id) {
      // Update existing
      const { data: webhook, error } = await supabase
        .from("webhook_configs")
        .update({
          url,
          events: events ?? [],
          enabled: enabled ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("store_id", store.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Failed to update webhook" },
          { status: 500 }
        );
      }

      return NextResponse.json({ webhook });
    } else {
      // Create new
      const secret = `whsec_${randomBytes(24).toString("hex")}`;

      const { data: webhook, error } = await supabase
        .from("webhook_configs")
        .insert({
          store_id: store.id,
          url,
          events: events ?? ["order.created", "order.updated"],
          secret,
          enabled: enabled ?? true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Failed to create webhook" },
          { status: 500 }
        );
      }

      return NextResponse.json({ webhook }, { status: 201 });
    }
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

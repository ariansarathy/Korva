import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/connectors/slack/channels
 * List Slack channels the bot has access to.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Get Slack connection
    const { data: store } = await adminSupabase
      .from("stores")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!store) {
      return NextResponse.json({ error: "No store" }, { status: 404 });
    }

    const { data: connection } = await adminSupabase
      .from("integration_connections")
      .select("*")
      .eq("store_id", store.id)
      .eq("platform", "slack")
      .eq("status", "active")
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: "Slack not connected" },
        { status: 404 }
      );
    }

    // Fetch channels from Slack API
    const res = await fetch(
      "https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200",
      {
        headers: { Authorization: `Bearer ${connection.access_token}` },
      }
    );

    const data = await res.json();

    if (!data.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to list channels" },
        { status: 400 }
      );
    }

    const channels = (data.channels ?? []).map(
      (c: { id: string; name: string; is_private: boolean }) => ({
        id: c.id,
        name: c.name,
        isPrivate: c.is_private,
      })
    );

    return NextResponse.json({ channels });
  } catch (error) {
    console.error("Slack channels error:", error);
    return NextResponse.json(
      { error: "Failed to fetch channels" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/connectors/slack/channels
 * Set the notification channel for Slack.
 * Body: { channelId: string, channelName: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { channelId, channelName } = await request.json();
    if (!channelId) {
      return NextResponse.json(
        { error: "Missing channelId" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: store } = await adminSupabase
      .from("stores")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!store) {
      return NextResponse.json({ error: "No store" }, { status: 404 });
    }

    // Update the config with selected channel
    const { data: connection } = await adminSupabase
      .from("integration_connections")
      .select("*")
      .eq("store_id", store.id)
      .eq("platform", "slack")
      .eq("status", "active")
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: "Slack not connected" },
        { status: 404 }
      );
    }

    const config = (connection.config as Record<string, unknown>) ?? {};
    config.channel_id = channelId;
    config.channel_name = channelName;

    await adminSupabase
      .from("integration_connections")
      .update({ config })
      .eq("id", connection.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Set Slack channel error:", error);
    return NextResponse.json(
      { error: "Failed to set channel" },
      { status: 500 }
    );
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";

/**
 * GET /api/notifications/preferences
 * Returns the user's notification preferences.
 */
export async function GET() {
  try {
    const { userId } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Return defaults if no preferences exist yet
    const defaults = {
      weekly_report: true,
      anomaly_alerts: true,
      inventory_alerts: true,
      slack_enabled: false,
      slack_webhook_url: null,
      email_enabled: true,
    };

    return NextResponse.json({ preferences: prefs ?? { ...defaults, user_id: userId } });
  } catch (error) {
    console.error("Notification preferences fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/preferences
 * Body: { weekly_report?, anomaly_alerts?, inventory_alerts?, slack_enabled?, slack_webhook_url?, email_enabled? }
 * Creates or updates the user's notification preferences.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      weekly_report,
      anomaly_alerts,
      inventory_alerts,
      slack_enabled,
      slack_webhook_url,
      email_enabled,
    } = body;

    const supabase = await createClient();

    // Upsert preferences
    const { data: prefs, error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: userId,
          store_id: store?.id ?? null,
          ...(weekly_report !== undefined && { weekly_report }),
          ...(anomaly_alerts !== undefined && { anomaly_alerts }),
          ...(inventory_alerts !== undefined && { inventory_alerts }),
          ...(slack_enabled !== undefined && { slack_enabled }),
          ...(slack_webhook_url !== undefined && { slack_webhook_url }),
          ...(email_enabled !== undefined && { email_enabled }),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Notification preferences update error:", error);
      return NextResponse.json(
        { error: "Failed to update preferences." },
        { status: 500 }
      );
    }

    return NextResponse.json({ preferences: prefs });
  } catch (error) {
    console.error("Notification preferences update error:", error);
    return NextResponse.json(
      { error: "Failed to update preferences." },
      { status: 500 }
    );
  }
}

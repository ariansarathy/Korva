import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import type { ReportType, ScheduleFrequency } from "@/lib/supabase/types";

/**
 * GET /api/reports/schedules
 * Returns all report schedules for the user's store.
 */
export async function GET() {
  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!store) {
      return NextResponse.json({ error: "No store connected." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: schedules, error } = await supabase
      .from("report_schedules")
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch schedules." }, { status: 500 });
    }

    return NextResponse.json({ schedules: schedules ?? [] });
  } catch (error) {
    console.error("Schedules fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch schedules." }, { status: 500 });
  }
}

/**
 * POST /api/reports/schedules
 * Body: { report_type, schedule, day_of_week?, day_of_month?, recipients }
 * Creates a new report schedule.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!store) {
      return NextResponse.json({ error: "No store connected." }, { status: 400 });
    }

    const body = await request.json();
    const { report_type, schedule, day_of_week, day_of_month, recipients } = body as {
      report_type: ReportType;
      schedule: ScheduleFrequency;
      day_of_week?: number | null;
      day_of_month?: number | null;
      recipients: string[];
    };

    if (!report_type || !schedule || !recipients?.length) {
      return NextResponse.json(
        { error: "report_type, schedule, and recipients are required." },
        { status: 400 }
      );
    }

    // Calculate next_send_at
    const nextSendAt = calculateNextSend(schedule, day_of_week ?? null, day_of_month ?? null);

    const supabase = await createClient();
    const { data: newSchedule, error } = await supabase
      .from("report_schedules")
      .insert({
        store_id: store.id,
        user_id: userId,
        report_type,
        schedule,
        day_of_week: day_of_week ?? null,
        day_of_month: day_of_month ?? null,
        recipients,
        enabled: true,
        next_send_at: nextSendAt,
      })
      .select()
      .single();

    if (error) {
      console.error("Schedule creation error:", error);
      return NextResponse.json({ error: "Failed to create schedule." }, { status: 500 });
    }

    return NextResponse.json({ schedule: newSchedule }, { status: 201 });
  } catch (error) {
    console.error("Schedule creation error:", error);
    return NextResponse.json({ error: "Failed to create schedule." }, { status: 500 });
  }
}

/**
 * PUT /api/reports/schedules
 * Body: { id, ...fields }
 * Updates an existing report schedule.
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!store) {
      return NextResponse.json({ error: "No store connected." }, { status: 400 });
    }

    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: "Schedule id is required." }, { status: 400 });
    }

    // Recalculate next_send_at if schedule fields changed
    if (updateFields.schedule) {
      updateFields.next_send_at = calculateNextSend(
        updateFields.schedule,
        updateFields.day_of_week ?? null,
        updateFields.day_of_month ?? null
      );
    }

    const supabase = await createClient();
    const { data: updated, error } = await supabase
      .from("report_schedules")
      .update(updateFields)
      .eq("id", id)
      .eq("store_id", store.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update schedule." }, { status: 500 });
    }

    return NextResponse.json({ schedule: updated });
  } catch (error) {
    console.error("Schedule update error:", error);
    return NextResponse.json({ error: "Failed to update schedule." }, { status: 500 });
  }
}

/**
 * DELETE /api/reports/schedules
 * Body: { id }
 * Deletes a report schedule.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!store) {
      return NextResponse.json({ error: "No store connected." }, { status: 400 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Schedule id is required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("report_schedules")
      .delete()
      .eq("id", id)
      .eq("store_id", store.id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete schedule." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Schedule delete error:", error);
    return NextResponse.json({ error: "Failed to delete schedule." }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function calculateNextSend(
  frequency: ScheduleFrequency,
  dayOfWeek: number | null,
  dayOfMonth: number | null
): string {
  const now = new Date();
  const next = new Date(now);
  next.setHours(8, 0, 0, 0); // Default to 8 AM

  switch (frequency) {
    case "daily":
      // Next day at 8 AM
      if (now.getHours() >= 8) {
        next.setDate(next.getDate() + 1);
      }
      break;

    case "weekly": {
      const targetDay = dayOfWeek ?? 1; // Monday by default
      const currentDay = now.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      if (daysUntil === 0 && now.getHours() >= 8) daysUntil = 7;
      next.setDate(next.getDate() + daysUntil);
      break;
    }

    case "monthly": {
      const targetDate = dayOfMonth ?? 1;
      next.setDate(targetDate);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
        next.setDate(targetDate);
      }
      break;
    }
  }

  return next.toISOString();
}

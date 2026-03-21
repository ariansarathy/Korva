import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/utils/auth";

/**
 * GET /api/team/members
 * Returns all team members for the authenticated user.
 */
export async function GET() {
  try {
    const userId = await requireAuth();
    const supabase = await createClient();

    const { data: members, error } = await supabase
      .from("team_members")
      .select("id, email, role, status, invited_at, accepted_at")
      .eq("user_id", userId)
      .neq("status", "removed")
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch team." }, { status: 500 });
    }

    return NextResponse.json({ members: members ?? [] });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * PUT /api/team/members
 * Body: { memberId: string, role: string }
 * Updates a team member's role.
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const { memberId, role } = await request.json();

    if (!memberId || !role) {
      return NextResponse.json(
        { error: "memberId and role are required." },
        { status: 400 }
      );
    }

    const validRoles = ["admin", "member", "viewer"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("team_members")
      .update({ role })
      .eq("id", memberId)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: "Failed to update role." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * DELETE /api/team/members
 * Body: { memberId: string }
 * Removes a team member (sets status to "removed").
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const { memberId } = await request.json();

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("team_members")
      .update({ status: "removed" })
      .eq("id", memberId)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: "Failed to remove member." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

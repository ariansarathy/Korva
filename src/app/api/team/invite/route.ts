import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { sendEmail } from "@/lib/email/resend";
import { renderInviteEmail } from "@/lib/email/templates/invite";
import { randomBytes } from "crypto";
import { TeamInviteSchema } from "@/lib/validation/schemas";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/team/invite
 * Body: { email: string, role: "admin" | "member" | "viewer" }
 * Invites a new team member. Requires Growth plan or higher.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = TeamInviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { email, role } = parsed.data;

    const supabase = await createClient();

    // Check for existing invite
    const { data: existing } = await supabase
      .from("team_members")
      .select("id, status")
      .eq("user_id", userId)
      .eq("email", email)
      .single();

    if (existing && existing.status !== "removed" && existing.status !== "declined") {
      return NextResponse.json(
        { error: "This email has already been invited." },
        { status: 400 }
      );
    }

    // Generate invite token
    const inviteToken = randomBytes(32).toString("hex");

    // Get inviter email
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const inviterEmail = user?.email ?? "A team member";

    // Create or update team member record
    if (existing) {
      await supabase
        .from("team_members")
        .update({
          role,
          status: "pending",
          invite_token: inviteToken,
          invited_at: new Date().toISOString(),
          accepted_at: null,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("team_members").insert({
        user_id: userId,
        email,
        role,
        status: "pending",
        invite_token: inviteToken,
      });
    }

    // Send invite email
    const html = renderInviteEmail(inviterEmail, inviteToken, role);
    await sendEmail({
      to: email,
      subject: `You've been invited to join a team on Korva`,
      html,
    });

    logAudit(userId, null, "team_invite", "team_member", email, { role }, request);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Team invite error:", error);
    return NextResponse.json(
      { error: "Failed to send invitation." },
      { status: 500 }
    );
  }
}

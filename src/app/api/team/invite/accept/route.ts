import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.korva.app";

/**
 * GET /api/team/invite/accept?token=...
 * Accepts a team invitation. Links the logged-in user as the member.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(`${APP_URL}/login?error=invalid_token`);
    }

    const supabase = await createClient();

    // Find the invite
    const { data: invite } = await supabase
      .from("team_members")
      .select("*")
      .eq("invite_token", token)
      .eq("status", "pending")
      .single();

    if (!invite) {
      return NextResponse.redirect(`${APP_URL}/login?error=invite_expired`);
    }

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Redirect to login with the token to resume after auth
      return NextResponse.redirect(
        `${APP_URL}/login?invite_token=${token}`
      );
    }

    // Accept the invite
    await supabase
      .from("team_members")
      .update({
        member_id: user.id,
        status: "accepted",
        accepted_at: new Date().toISOString(),
        invite_token: null, // Invalidate the token
      })
      .eq("id", invite.id);

    return NextResponse.redirect(`${APP_URL}/dashboard`);
  } catch (error) {
    console.error("Invite accept error:", error);
    return NextResponse.redirect(`${APP_URL}/login?error=invite_failed`);
  }
}

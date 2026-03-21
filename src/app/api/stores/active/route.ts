import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "active-store-id";

/**
 * GET /api/stores/active
 * Return the current active store ID from cookie, verified against user ownership / team membership.
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

    const cookieStore = await cookies();
    const activeStoreId = cookieStore.get(COOKIE_NAME)?.value ?? null;

    if (!activeStoreId) {
      // Return the user's first store as default
      const { data: store } = await supabase
        .from("stores")
        .select("id, name, platform")
        .eq("user_id", user.id)
        .order("connected_at", { ascending: false })
        .limit(1)
        .single();

      return NextResponse.json({
        active_store_id: store?.id ?? null,
        store: store ?? null,
      });
    }

    // Verify user owns or is a team member of this store
    const { data: ownedStore } = await supabase
      .from("stores")
      .select("id, name, platform")
      .eq("id", activeStoreId)
      .eq("user_id", user.id)
      .single();

    if (ownedStore) {
      return NextResponse.json({
        active_store_id: ownedStore.id,
        store: ownedStore,
      });
    }

    // Check team membership
    const { data: teamMember } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("member_id", user.id)
      .eq("status", "accepted")
      .limit(50);

    if (teamMember && teamMember.length > 0) {
      const ownerIds = teamMember.map((m) => m.user_id);
      const { data: teamStore } = await supabase
        .from("stores")
        .select("id, name, platform")
        .eq("id", activeStoreId)
        .in("user_id", ownerIds)
        .single();

      if (teamStore) {
        return NextResponse.json({
          active_store_id: teamStore.id,
          store: teamStore,
        });
      }
    }

    // Cookie store ID is invalid — clear and return default
    const { data: defaultStore } = await supabase
      .from("stores")
      .select("id, name, platform")
      .eq("user_id", user.id)
      .order("connected_at", { ascending: false })
      .limit(1)
      .single();

    const response = NextResponse.json({
      active_store_id: defaultStore?.id ?? null,
      store: defaultStore ?? null,
    });
    response.cookies.delete(COOKIE_NAME);
    return response;
  } catch (error) {
    console.error("Get active store error:", error);
    return NextResponse.json(
      { error: "Failed to get active store" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stores/active
 * Set the active store ID cookie.
 * Body: { store_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { store_id } = await request.json();
    if (!store_id) {
      return NextResponse.json(
        { error: "store_id is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: ownedStore } = await supabase
      .from("stores")
      .select("id, name, platform")
      .eq("id", store_id)
      .eq("user_id", user.id)
      .single();

    if (ownedStore) {
      const response = NextResponse.json({
        active_store_id: ownedStore.id,
        store: ownedStore,
      });
      response.cookies.set(COOKIE_NAME, store_id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: "/",
      });
      return response;
    }

    // Check team membership
    const { data: teamMember } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("member_id", user.id)
      .eq("status", "accepted")
      .limit(50);

    if (teamMember && teamMember.length > 0) {
      const ownerIds = teamMember.map((m) => m.user_id);
      const { data: teamStore } = await supabase
        .from("stores")
        .select("id, name, platform")
        .eq("id", store_id)
        .in("user_id", ownerIds)
        .single();

      if (teamStore) {
        const response = NextResponse.json({
          active_store_id: teamStore.id,
          store: teamStore,
        });
        response.cookies.set(COOKIE_NAME, store_id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 365,
          path: "/",
        });
        return response;
      }
    }

    return NextResponse.json(
      { error: "Store not found or access denied" },
      { status: 403 }
    );
  } catch (error) {
    console.error("Set active store error:", error);
    return NextResponse.json(
      { error: "Failed to set active store" },
      { status: 500 }
    );
  }
}

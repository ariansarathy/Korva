import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { Store } from "@/lib/supabase/types";
import { isDemoMode, DEMO_USER, DEMO_STORE } from "@/lib/demo";

/**
 * Get the authenticated user and their active store.
 * Supports multi-store: checks `active-store-id` cookie first,
 * falls back to the user's most recently connected store.
 * Optionally accepts a storeId to override the cookie.
 * Returns null values if user is not authenticated or has no store.
 * Use in server components and API routes.
 */
export async function getCurrentUserStore(storeId?: string): Promise<{
  userId: string | null;
  store: Store | null;
}> {
  // Demo mode — return mock user and store
  if (isDemoMode()) {
    return { userId: DEMO_USER.id, store: DEMO_STORE };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { userId: null, store: null };
    }

    // Determine which store to use: explicit param > cookie > default
    let targetStoreId = storeId;

    if (!targetStoreId) {
      try {
        const cookieStore = await cookies();
        targetStoreId = cookieStore.get("active-store-id")?.value ?? undefined;
      } catch {
        // cookies() may fail in certain contexts (e.g., cron jobs)
      }
    }

    if (targetStoreId) {
      // Try to find the specified store — owned by user
      const { data: ownedStore } = await supabase
        .from("stores")
        .select("*")
        .eq("id", targetStoreId)
        .eq("user_id", user.id)
        .single();

      if (ownedStore) {
        return { userId: user.id, store: ownedStore as Store };
      }

      // Check team membership — user might be a team member
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
          .select("*")
          .eq("id", targetStoreId)
          .in("user_id", ownerIds)
          .single();

        if (teamStore) {
          return { userId: user.id, store: teamStore as Store };
        }
      }
    }

    // Fallback: user's most recently connected store
    const { data: store } = await supabase
      .from("stores")
      .select("*")
      .eq("user_id", user.id)
      .order("connected_at", { ascending: false })
      .limit(1)
      .single();

    return { userId: user.id, store: (store as Store) ?? null };
  } catch {
    return { userId: null, store: null };
  }
}

/**
 * Get the authenticated user ID, throwing if not authenticated.
 * Use in API routes that require authentication.
 */
export async function requireAuth(): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user.id;
}

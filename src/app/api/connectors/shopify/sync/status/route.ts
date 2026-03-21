import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/connectors/shopify/sync/status?storeId=xxx
 * Returns the current sync status for a store.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storeId = request.nextUrl.searchParams.get("storeId");
    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    }

    const { data: store } = await supabase
      .from("stores")
      .select("id, sync_status, last_synced_at, name")
      .eq("id", storeId)
      .eq("user_id", user.id)
      .single();

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Get counts for progress indication
    const [productCount, customerCount, orderCount] = await Promise.all([
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeId),
      supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeId),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeId),
    ]);

    return NextResponse.json({
      status: store.sync_status,
      lastSyncedAt: store.last_synced_at,
      storeName: store.name,
      counts: {
        products: productCount.count ?? 0,
        customers: customerCount.count ?? 0,
        orders: orderCount.count ?? 0,
      },
    });
  } catch (error) {
    console.error("Sync status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sync status" },
      { status: 500 }
    );
  }
}

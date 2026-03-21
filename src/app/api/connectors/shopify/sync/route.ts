import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ShopifyClient } from "@/lib/connectors/shopify";
import {
  mapShopifyProduct,
  mapShopifyOrder,
  mapShopifyLineItems,
  mapShopifyCustomer,
} from "@/lib/connectors/shopify-mappers";
import { checkOrderLimit, incrementOrderUsage } from "@/lib/utils/plan-limits";

/**
 * POST /api/connectors/shopify/sync
 * Triggers a full or incremental sync for a connected Shopify store.
 * Body: { storeId: string, incremental?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { storeId, incremental } = body;
    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    }

    // Fetch store with admin client (need access_token)
    const adminSupabase = createAdminClient();
    const { data: store } = await adminSupabase
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .eq("user_id", user.id)
      .single();

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    if (!store.access_token || !store.url) {
      return NextResponse.json({ error: "Store not properly connected" }, { status: 400 });
    }

    // Check order limits
    const orderLimit = await checkOrderLimit(user.id);
    if (!orderLimit.allowed && orderLimit.limit !== 0) {
      return NextResponse.json(
        { error: "Order limit reached. Upgrade your plan to sync more orders." },
        { status: 403 }
      );
    }

    // Mark as syncing
    await adminSupabase
      .from("stores")
      .update({ sync_status: "syncing" })
      .eq("id", storeId);

    const shopify = new ShopifyClient({
      shop: store.url,
      accessToken: store.access_token,
    });

    // Build incremental params if applicable
    const incrementalParams: Record<string, string> = {};
    if (incremental && store.last_synced_at) {
      incrementalParams.updated_at_min = store.last_synced_at;
    }

    // ─── Sync products ──────────────────────────────────────────
    let productsSynced = 0;
    const productIdMap = new Map<string, string>(); // external_id → db_id

    for await (const batch of shopify.fetchProducts(incrementalParams)) {
      const mapped = batch.map((p) => mapShopifyProduct(p, storeId));

      const { data: inserted } = await adminSupabase
        .from("products")
        .upsert(mapped, { onConflict: "store_id,external_id" })
        .select("id, external_id");

      if (inserted) {
        for (const p of inserted) {
          productIdMap.set(p.external_id, p.id);
        }
      }

      productsSynced += batch.length;
    }

    // ─── Sync customers ─────────────────────────────────────────
    let customersSynced = 0;
    const customerIdMap = new Map<string, string>(); // external_id → db_id

    for await (const batch of shopify.fetchCustomers(incrementalParams)) {
      const mapped = batch.map((c) => mapShopifyCustomer(c, storeId));

      const { data: inserted } = await adminSupabase
        .from("customers")
        .upsert(mapped, { onConflict: "store_id,external_id" })
        .select("id, external_id");

      if (inserted) {
        for (const c of inserted) {
          customerIdMap.set(c.external_id, c.id);
        }
      }

      customersSynced += batch.length;
    }

    // ─── Sync orders + line items ───────────────────────────────
    let ordersSynced = 0;

    for await (const batch of shopify.fetchOrders(incrementalParams)) {
      const mappedOrders = batch.map((o) =>
        mapShopifyOrder(o, storeId, customerIdMap)
      );

      const { data: insertedOrders } = await adminSupabase
        .from("orders")
        .upsert(mappedOrders, { onConflict: "store_id,external_id" })
        .select("id, external_id");

      if (insertedOrders) {
        // Build order external_id → db_id map
        const orderIdMap = new Map<string, string>();
        for (const o of insertedOrders) {
          orderIdMap.set(o.external_id, o.id);
        }

        // Upsert line items for each order
        for (const shopifyOrder of batch) {
          const dbOrderId = orderIdMap.get(String(shopifyOrder.id));
          if (!dbOrderId || !shopifyOrder.line_items.length) continue;

          const items = mapShopifyLineItems(
            shopifyOrder.line_items,
            dbOrderId,
            productIdMap
          );

          await adminSupabase.from("order_items").upsert(items, {
            onConflict: "order_id,external_product_id",
            ignoreDuplicates: true,
          });
        }
      }

      ordersSynced += batch.length;

      // Track usage
      await incrementOrderUsage(user.id, batch.length);
    }

    // ─── Mark sync complete ──────────────────────────────────────
    await adminSupabase
      .from("stores")
      .update({
        sync_status: "synced",
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", storeId);

    return NextResponse.json({
      success: true,
      stats: {
        products: productsSynced,
        customers: customersSynced,
        orders: ordersSynced,
      },
    });
  } catch (error) {
    console.error("Shopify sync error:", error);

    // Try to mark store as errored
    try {
      const { storeId } = await request.clone().json();
      if (storeId) {
        const adminSupabase = createAdminClient();
        await adminSupabase
          .from("stores")
          .update({ sync_status: "error" })
          .eq("id", storeId);
      }
    } catch {
      // ignore
    }

    return NextResponse.json(
      { error: "Sync failed. Please try again." },
      { status: 500 }
    );
  }
}

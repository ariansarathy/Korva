import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WooCommerceClient } from "@/lib/connectors/woocommerce";
import {
  mapWooProduct,
  mapWooOrder,
  mapWooLineItems,
  mapWooCustomer,
} from "@/lib/connectors/woocommerce-mappers";
import { checkOrderLimit, incrementOrderUsage } from "@/lib/utils/plan-limits";

/**
 * POST /api/connectors/woocommerce/sync
 * Triggers a full or incremental sync for a connected WooCommerce store.
 * Body: { storeId: string, incremental?: boolean }
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

    const body = await request.json();
    const { storeId, incremental } = body;
    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    }

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
      return NextResponse.json(
        { error: "Store not properly connected" },
        { status: 400 }
      );
    }

    // Check order limits
    const orderLimit = await checkOrderLimit(user.id);
    if (!orderLimit.allowed && orderLimit.limit !== 0) {
      return NextResponse.json(
        { error: "Order limit reached. Upgrade your plan." },
        { status: 403 }
      );
    }

    // Mark as syncing
    await adminSupabase
      .from("stores")
      .update({ sync_status: "syncing" })
      .eq("id", storeId);

    // Decode credentials
    const decoded = Buffer.from(store.access_token, "base64").toString("utf-8");
    const [consumerKey, consumerSecret] = decoded.split(":");

    const woo = new WooCommerceClient({
      url: store.url,
      consumerKey,
      consumerSecret,
    });

    // Build incremental params if applicable
    const incrementalParams: Record<string, string> = {};
    if (incremental && store.last_synced_at) {
      incrementalParams.modified_after = store.last_synced_at;
    }

    // ─── Sync products ──────────────────────────────────────────
    let productsSynced = 0;
    const productIdMap = new Map<string, string>();

    for await (const batch of woo.fetchProducts(incrementalParams)) {
      const mapped = batch.map((p) => mapWooProduct(p, storeId));

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
    const customerIdMap = new Map<string, string>();

    for await (const batch of woo.fetchCustomers(incrementalParams)) {
      const mapped = batch.map((c) => mapWooCustomer(c, storeId));

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

    for await (const batch of woo.fetchOrders(incrementalParams)) {
      const mappedOrders = batch.map((o) =>
        mapWooOrder(o, storeId, customerIdMap)
      );

      const { data: insertedOrders } = await adminSupabase
        .from("orders")
        .upsert(mappedOrders, { onConflict: "store_id,external_id" })
        .select("id, external_id");

      if (insertedOrders) {
        const orderIdMap = new Map<string, string>();
        for (const o of insertedOrders) {
          orderIdMap.set(o.external_id, o.id);
        }

        for (const wooOrder of batch) {
          const dbOrderId = orderIdMap.get(String(wooOrder.id));
          if (!dbOrderId || !wooOrder.line_items.length) continue;

          const items = mapWooLineItems(
            wooOrder.line_items,
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
    console.error("WooCommerce sync error:", error);

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

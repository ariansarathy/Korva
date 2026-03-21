import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AmazonSPClient } from "@/lib/connectors/amazon";
import {
  mapAmazonProduct,
  mapAmazonOrder,
  mapAmazonLineItems,
  mapAmazonCustomer,
} from "@/lib/connectors/amazon-mappers";
import { checkOrderLimit, incrementOrderUsage } from "@/lib/utils/plan-limits";

/**
 * POST /api/connectors/amazon/sync
 * Full/incremental sync for a connected Amazon store.
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

    const { storeId, incremental } = await request.json();
    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { data: store } = await adminSupabase
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .eq("user_id", user.id)
      .eq("platform", "amazon")
      .single();

    if (!store || !store.access_token) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const orderLimit = await checkOrderLimit(user.id);
    if (!orderLimit.allowed && orderLimit.limit !== 0) {
      return NextResponse.json(
        { error: "Order limit reached. Upgrade your plan." },
        { status: 403 }
      );
    }

    await adminSupabase
      .from("stores")
      .update({ sync_status: "syncing" })
      .eq("id", storeId);

    const amazon = new AmazonSPClient({
      refreshToken: store.access_token,
      clientId: process.env.AMAZON_SP_CLIENT_ID!,
      clientSecret: process.env.AMAZON_SP_CLIENT_SECRET!,
    });

    const orderParams: Record<string, string> = {};
    if (incremental && store.last_synced_at) {
      orderParams.CreatedAfter = store.last_synced_at;
    }

    // ─── Sync products ──────────────────────────────────────────
    let productsSynced = 0;
    const productIdMap = new Map<string, string>();

    for await (const batch of amazon.fetchProducts()) {
      const mapped = batch.map((p) => mapAmazonProduct(p, storeId));

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

    // ─── Sync orders + customers ─────────────────────────────────
    let ordersSynced = 0;
    let customersSynced = 0;

    for await (const batch of amazon.fetchOrders(orderParams)) {
      // Derive customers from orders
      for (const order of batch) {
        const customerData = mapAmazonCustomer(order, storeId);
        await adminSupabase
          .from("customers")
          .upsert(customerData, { onConflict: "store_id,external_id" });
        customersSynced++;
      }

      // Insert orders
      const mappedOrders = batch.map((o) =>
        mapAmazonOrder(o, storeId, new Map())
      );

      const { data: insertedOrders } = await adminSupabase
        .from("orders")
        .upsert(mappedOrders, { onConflict: "store_id,external_id" })
        .select("id, external_id");

      // Fetch and insert line items for each order
      if (insertedOrders) {
        const orderIdMap = new Map<string, string>();
        for (const o of insertedOrders) {
          orderIdMap.set(o.external_id, o.id);
        }

        for (const order of batch) {
          const dbOrderId = orderIdMap.get(order.AmazonOrderId);
          if (!dbOrderId) continue;

          try {
            const items = await amazon.getOrderItems(order.AmazonOrderId);
            if (items.length > 0) {
              const mappedItems = mapAmazonLineItems(items, dbOrderId, productIdMap);
              await adminSupabase.from("order_items").upsert(mappedItems, {
                onConflict: "order_id,external_product_id",
                ignoreDuplicates: true,
              });
            }
          } catch {
            // Skip line items on error, continue with next order
          }
        }
      }

      ordersSynced += batch.length;
      await incrementOrderUsage(user.id, batch.length);
    }

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
    console.error("Amazon sync error:", error);

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

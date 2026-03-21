import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  mapWooProduct,
  mapWooOrder,
  mapWooLineItems,
  mapWooCustomer,
} from "@/lib/connectors/woocommerce-mappers";
import type { WooProduct, WooOrder, WooCustomer } from "@/lib/connectors/woocommerce";

/**
 * POST /api/webhooks/woocommerce
 * Handles WooCommerce webhook events.
 * Verifies signature with X-WC-Webhook-Signature header.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("X-WC-Webhook-Signature");
    const topic = request.headers.get("X-WC-Webhook-Topic");
    const source = request.headers.get("X-WC-Webhook-Source");

    if (!signature || !topic) {
      return NextResponse.json(
        { error: "Missing webhook headers" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Find the store by source URL
    const sourceUrl = source?.replace(/\/$/, "") || "";
    const { data: store } = await adminSupabase
      .from("stores")
      .select("id, user_id, access_token")
      .eq("platform", "woocommerce")
      .eq("url", sourceUrl)
      .single();

    if (!store || !store.access_token) {
      // Try without trailing slash variations
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Verify webhook signature
    // WooCommerce signs with the webhook secret (which we stored as the consumer secret)
    const decoded = Buffer.from(store.access_token, "base64").toString("utf-8");
    const [, consumerSecret] = decoded.split(":");

    if (consumerSecret) {
      const expectedSignature = crypto
        .createHmac("sha256", consumerSecret)
        .update(body, "utf-8")
        .digest("base64");

      if (signature !== expectedSignature) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const payload = JSON.parse(body);
    const storeId = store.id;

    // Handle different webhook topics
    switch (topic) {
      case "product.created":
      case "product.updated": {
        const product = payload as WooProduct;
        const mapped = mapWooProduct(product, storeId);
        await adminSupabase
          .from("products")
          .upsert(mapped, { onConflict: "store_id,external_id" });
        break;
      }

      case "customer.created":
      case "customer.updated": {
        const customer = payload as WooCustomer;
        const mapped = mapWooCustomer(customer, storeId);
        await adminSupabase
          .from("customers")
          .upsert(mapped, { onConflict: "store_id,external_id" });
        break;
      }

      case "order.created":
      case "order.updated": {
        const order = payload as WooOrder;

        // Build customer ID map from existing data
        const customerIdMap = new Map<string, string>();
        if (order.customer_id > 0) {
          const { data: existingCustomer } = await adminSupabase
            .from("customers")
            .select("id, external_id")
            .eq("store_id", storeId)
            .eq("external_id", String(order.customer_id))
            .single();

          if (existingCustomer) {
            customerIdMap.set(
              existingCustomer.external_id,
              existingCustomer.id
            );
          }
        }

        const mappedOrder = mapWooOrder(order, storeId, customerIdMap);
        const { data: insertedOrder } = await adminSupabase
          .from("orders")
          .upsert(mappedOrder, { onConflict: "store_id,external_id" })
          .select("id")
          .single();

        if (insertedOrder && order.line_items?.length) {
          // Build product ID map
          const productIds = order.line_items
            .map((li) => String(li.product_id))
            .filter(Boolean);

          const productIdMap = new Map<string, string>();
          if (productIds.length > 0) {
            const { data: products } = await adminSupabase
              .from("products")
              .select("id, external_id")
              .eq("store_id", storeId)
              .in("external_id", productIds);

            if (products) {
              for (const p of products) {
                productIdMap.set(p.external_id, p.id);
              }
            }
          }

          const items = mapWooLineItems(
            order.line_items,
            insertedOrder.id,
            productIdMap
          );

          await adminSupabase.from("order_items").upsert(items, {
            onConflict: "order_id,external_product_id",
            ignoreDuplicates: true,
          });
        }
        break;
      }

      default:
        // Unhandled topic
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("WooCommerce webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

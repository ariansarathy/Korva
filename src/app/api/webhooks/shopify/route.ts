import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  mapShopifyProduct,
  mapShopifyOrder,
  mapShopifyLineItems,
  mapShopifyCustomer,
} from "@/lib/connectors/shopify-mappers";
import type {
  ShopifyProduct,
  ShopifyOrder,
  ShopifyCustomer,
} from "@/lib/connectors/shopify";

/**
 * POST /api/webhooks/shopify
 * Receives Shopify webhook events for orders, products, and customers.
 * Verifies HMAC signature for authenticity.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const topic = request.headers.get("x-shopify-topic");
    const shop = request.headers.get("x-shopify-shop-domain");
    const hmac = request.headers.get("x-shopify-hmac-sha256");

    if (!topic || !shop || !hmac) {
      return NextResponse.json({ error: "Missing headers" }, { status: 400 });
    }

    // Verify HMAC signature
    const secret = process.env.SHOPIFY_CLIENT_SECRET;
    if (secret) {
      const hash = crypto
        .createHmac("sha256", secret)
        .update(body, "utf8")
        .digest("base64");

      if (hash !== hmac) {
        console.error("Shopify webhook HMAC verification failed");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const adminSupabase = createAdminClient();

    // Find the store by shop domain
    const { data: store } = await adminSupabase
      .from("stores")
      .select("id, user_id")
      .eq("url", shop)
      .single();

    if (!store) {
      console.warn(`Webhook received for unknown shop: ${shop}`);
      return NextResponse.json({ received: true });
    }

    const payload = JSON.parse(body);

    switch (topic) {
      case "products/create":
      case "products/update": {
        const product = payload as ShopifyProduct;
        const mapped = mapShopifyProduct(product, store.id);
        await adminSupabase
          .from("products")
          .upsert(mapped, { onConflict: "store_id,external_id" });
        break;
      }

      case "customers/create":
      case "customers/update": {
        const customer = payload as ShopifyCustomer;
        const mapped = mapShopifyCustomer(customer, store.id);
        await adminSupabase
          .from("customers")
          .upsert(mapped, { onConflict: "store_id,external_id" });
        break;
      }

      case "orders/create":
      case "orders/updated": {
        const order = payload as ShopifyOrder;

        // Get customer ID mapping if customer exists
        const customerIdMap = new Map<string, string>();
        if (order.customer) {
          const { data: dbCustomer } = await adminSupabase
            .from("customers")
            .select("id, external_id")
            .eq("store_id", store.id)
            .eq("external_id", String(order.customer.id))
            .single();
          if (dbCustomer) {
            customerIdMap.set(dbCustomer.external_id, dbCustomer.id);
          }
        }

        const mappedOrder = mapShopifyOrder(order, store.id, customerIdMap);
        const { data: upsertedOrder } = await adminSupabase
          .from("orders")
          .upsert(mappedOrder, { onConflict: "store_id,external_id" })
          .select("id")
          .single();

        // Upsert line items
        if (upsertedOrder && order.line_items.length > 0) {
          // Get product ID mapping
          const productExternalIds = order.line_items
            .filter((li) => li.product_id)
            .map((li) => String(li.product_id));

          const productIdMap = new Map<string, string>();
          if (productExternalIds.length > 0) {
            const { data: products } = await adminSupabase
              .from("products")
              .select("id, external_id")
              .eq("store_id", store.id)
              .in("external_id", productExternalIds);

            for (const p of products ?? []) {
              productIdMap.set(p.external_id, p.id);
            }
          }

          const items = mapShopifyLineItems(
            order.line_items,
            upsertedOrder.id,
            productIdMap
          );

          await adminSupabase.from("order_items").upsert(items, {
            onConflict: "order_id,external_product_id",
            ignoreDuplicates: true,
          });
        }

        // Update customer lifetime value if we have a customer
        if (order.customer) {
          const customerId = customerIdMap.get(String(order.customer.id));
          if (customerId) {
            // Recalculate from all orders
            const { data: customerOrders } = await adminSupabase
              .from("orders")
              .select("total")
              .eq("store_id", store.id)
              .eq("customer_id", customerId)
              .not("status", "in", '("cancelled","refunded")');

            const ltv = (customerOrders ?? []).reduce(
              (sum, o) => sum + Number(o.total),
              0
            );
            const orderCount = customerOrders?.length ?? 0;

            await adminSupabase
              .from("customers")
              .update({
                lifetime_value: ltv,
                order_count: orderCount,
                last_order_date: new Date().toISOString(),
              })
              .eq("id", customerId);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Shopify webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

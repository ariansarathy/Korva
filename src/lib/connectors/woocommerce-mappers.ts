/**
 * Transform WooCommerce API responses into Korva database records.
 * Follows the same pattern as shopify-mappers.ts.
 */

import crypto from "crypto";
import type { WooProduct, WooOrder, WooCustomer, WooLineItem } from "./woocommerce";
import type { OrderStatus, CustomerSegment } from "@/lib/supabase/types";

// ─── Products ────────────────────────────────────────────────────

export function mapWooProduct(product: WooProduct, storeId: string) {
  return {
    store_id: storeId,
    external_id: String(product.id),
    title: product.name,
    description: product.short_description
      ? stripHtml(product.short_description)
      : product.description
        ? stripHtml(product.description)
        : null,
    category: product.categories[0]?.name || null,
    sku: product.sku || null,
    cost_price: null as number | null,
    sell_price: product.price ? parseFloat(product.price) : null,
    compare_at_price: product.regular_price && product.sale_price
      ? parseFloat(product.regular_price)
      : null,
    inventory_qty: product.stock_quantity ?? 0,
    status: mapProductStatus(product.status),
    image_url: product.images[0]?.src || null,
  };
}

function mapProductStatus(status: string): "active" | "draft" | "archived" {
  switch (status) {
    case "publish":
      return "active";
    case "draft":
      return "draft";
    case "private":
    case "trash":
      return "archived";
    default:
      return "active";
  }
}

// ─── Orders ──────────────────────────────────────────────────────

export function mapWooOrder(
  order: WooOrder,
  storeId: string,
  customerIdMap: Map<string, string>
) {
  const customerId =
    order.customer_id > 0
      ? customerIdMap.get(String(order.customer_id)) ?? null
      : null;

  return {
    store_id: storeId,
    external_id: String(order.id),
    customer_id: customerId,
    total: parseFloat(order.total),
    subtotal: parseFloat(order.subtotal),
    discount: parseFloat(order.discount_total),
    shipping: parseFloat(order.shipping_total),
    tax: parseFloat(order.total_tax),
    status: mapOrderStatus(order.status),
    channel: order.payment_method || null,
    source: "woocommerce",
  };
}

function mapOrderStatus(status: string): OrderStatus {
  switch (status) {
    case "completed":
      return "fulfilled";
    case "processing":
    case "on-hold":
      return "paid";
    case "pending":
      return "pending";
    case "cancelled":
    case "failed":
      return "cancelled";
    case "refunded":
      return "refunded";
    default:
      return "pending";
  }
}

export function mapWooLineItems(
  lineItems: WooLineItem[],
  orderId: string,
  productIdMap: Map<string, string>
) {
  return lineItems.map((item) => {
    const productId = item.product_id
      ? productIdMap.get(String(item.product_id)) ?? null
      : null;
    const subtotal = parseFloat(item.subtotal);
    const total = parseFloat(item.total);

    return {
      order_id: orderId,
      product_id: productId,
      external_product_id: item.product_id ? String(item.product_id) : null,
      variant_id: item.variation_id ? String(item.variation_id) : null,
      title: item.name,
      quantity: item.quantity,
      unit_price: item.quantity > 0 ? subtotal / item.quantity : 0,
      discount: subtotal - total,
      total_price: total,
    };
  });
}

// ─── Customers ───────────────────────────────────────────────────

export function mapWooCustomer(customer: WooCustomer, storeId: string) {
  return {
    store_id: storeId,
    external_id: String(customer.id),
    email_hash: customer.email ? hashEmail(customer.email) : null,
    first_name: customer.first_name || null,
    last_name: customer.last_name || null,
    lifetime_value: parseFloat(customer.total_spent),
    order_count: customer.orders_count,
    segment: classifyCustomerSegment(customer),
    city: customer.billing?.city || null,
    country: customer.billing?.country || null,
  };
}

export function classifyCustomerSegment(customer: {
  total_spent: string;
  orders_count: number;
}): CustomerSegment {
  const totalSpent = parseFloat(customer.total_spent);
  const orderCount = customer.orders_count;

  if (totalSpent > 500 || orderCount >= 10) return "vip";
  if (orderCount >= 3) return "active";
  if (orderCount >= 1) return "new";
  return "new";
}

// ─── Helpers ─────────────────────────────────────────────────────

export function hashEmail(email: string): string {
  return crypto
    .createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

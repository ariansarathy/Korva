/**
 * Transform Shopify API responses into Korva database records.
 */

import crypto from "crypto";
import type {
  ShopifyProduct,
  ShopifyOrder,
  ShopifyCustomer,
  ShopifyLineItem,
} from "./shopify";
import type { OrderStatus, CustomerSegment } from "@/lib/supabase/types";

// ─── Products ────────────────────────────────────────────────────

export function mapShopifyProduct(product: ShopifyProduct, storeId: string) {
  const firstVariant = product.variants[0];
  const totalInventory = product.variants.reduce(
    (sum, v) => sum + (v.inventory_quantity || 0),
    0
  );

  return {
    store_id: storeId,
    external_id: String(product.id),
    title: product.title,
    description: product.body_html ? stripHtml(product.body_html) : null,
    category: product.product_type || null,
    sku: firstVariant?.sku || null,
    cost_price: null as number | null, // Shopify doesn't expose cost in REST
    sell_price: firstVariant ? parseFloat(firstVariant.price) : null,
    compare_at_price: firstVariant?.compare_at_price
      ? parseFloat(firstVariant.compare_at_price)
      : null,
    inventory_qty: totalInventory,
    status: mapProductStatus(product.status),
    image_url: product.image?.src || product.images[0]?.src || null,
  };
}

function mapProductStatus(status: string): "active" | "draft" | "archived" {
  switch (status) {
    case "active":
      return "active";
    case "draft":
      return "draft";
    case "archived":
      return "archived";
    default:
      return "active";
  }
}

// ─── Orders ──────────────────────────────────────────────────────

export function mapShopifyOrder(
  order: ShopifyOrder,
  storeId: string,
  customerIdMap: Map<string, string>
) {
  const customerId = order.customer
    ? customerIdMap.get(String(order.customer.id)) ?? null
    : null;

  return {
    store_id: storeId,
    external_id: String(order.id),
    customer_id: customerId,
    total: parseFloat(order.total_price),
    subtotal: parseFloat(order.subtotal_price),
    discount: parseFloat(order.total_discounts),
    shipping: parseFloat(order.total_shipping_price_set?.shop_money?.amount ?? "0"),
    tax: parseFloat(order.total_tax),
    status: mapOrderStatus(order),
    channel: order.source_name || null,
    source: order.source_name || null,
  };
}

function mapOrderStatus(order: ShopifyOrder): OrderStatus {
  if (order.cancelled_at) return "cancelled";
  switch (order.financial_status) {
    case "refunded":
    case "partially_refunded":
      return "refunded";
    case "paid":
      return order.fulfillment_status === "fulfilled" ? "fulfilled" : "paid";
    case "pending":
    case "authorized":
      return "pending";
    default:
      return "pending";
  }
}

export function mapShopifyLineItems(
  lineItems: ShopifyLineItem[],
  orderId: string,
  productIdMap: Map<string, string>
) {
  return lineItems.map((item) => {
    const productId = item.product_id
      ? productIdMap.get(String(item.product_id)) ?? null
      : null;

    return {
      order_id: orderId,
      product_id: productId,
      external_product_id: item.product_id ? String(item.product_id) : null,
      variant_id: item.variant_id ? String(item.variant_id) : null,
      title: item.title,
      quantity: item.quantity,
      unit_price: parseFloat(item.price),
      discount: parseFloat(item.total_discount),
      total_price: item.quantity * parseFloat(item.price) - parseFloat(item.total_discount),
    };
  });
}

// ─── Customers ───────────────────────────────────────────────────

export function mapShopifyCustomer(customer: ShopifyCustomer, storeId: string) {
  return {
    store_id: storeId,
    external_id: String(customer.id),
    email_hash: customer.email ? hashEmail(customer.email) : null,
    first_name: customer.first_name,
    last_name: customer.last_name,
    lifetime_value: parseFloat(customer.total_spent),
    order_count: customer.orders_count,
    segment: classifyCustomerSegment(customer),
    city: customer.default_address?.city ?? null,
    country: customer.default_address?.country ?? null,
  };
}

function classifyCustomerSegment(customer: ShopifyCustomer): CustomerSegment {
  const totalSpent = parseFloat(customer.total_spent);
  const orderCount = customer.orders_count;

  if (totalSpent > 500 || orderCount >= 10) return "vip";
  if (orderCount >= 3) return "active";
  if (orderCount >= 1) return "new";
  return "new";
}

// ─── Helpers ─────────────────────────────────────────────────────

function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
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

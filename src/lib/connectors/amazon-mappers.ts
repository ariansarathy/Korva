/**
 * Map Amazon SP-API responses to Korva database schema.
 */

import type {
  AmazonProduct,
  AmazonOrder,
  AmazonOrderItem,
} from "./amazon";

export function mapAmazonProduct(product: AmazonProduct, storeId: string) {
  const summary = product.summaries?.[0];
  const imageSet = product.images?.[0];
  const mainImage = imageSet?.images?.find((i) => i.variant === "MAIN");

  return {
    store_id: storeId,
    external_id: product.asin,
    title: summary?.itemName ?? `ASIN: ${product.asin}`,
    description: null,
    category: summary?.productType ?? null,
    sku: product.asin,
    cost_price: null,
    sell_price: null,
    compare_at_price: null,
    inventory_qty: 0,
    status: "active" as const,
    image_url: mainImage?.link ?? null,
  };
}

export function mapAmazonOrder(
  order: AmazonOrder,
  storeId: string,
  customerIdMap: Map<string, string>
) {
  const total = parseFloat(order.OrderTotal?.Amount ?? "0");

  // Map Amazon status to our schema
  let status: "pending" | "paid" | "fulfilled" | "cancelled" | "refunded" = "pending";
  switch (order.OrderStatus) {
    case "Shipped":
      status = "fulfilled";
      break;
    case "Unshipped":
    case "PartiallyShipped":
      status = "paid";
      break;
    case "Canceled":
    case "Cancelled":
      status = "cancelled";
      break;
    case "Unfulfillable":
      status = "cancelled";
      break;
    default:
      status = "pending";
  }

  return {
    store_id: storeId,
    external_id: order.AmazonOrderId,
    customer_id: null as string | null,
    total,
    subtotal: total,
    discount: 0,
    shipping: 0,
    tax: 0,
    status,
    channel: "amazon",
    source: "Amazon",
    created_at: order.PurchaseDate,
    updated_at: order.LastUpdateDate,
  };
}

export function mapAmazonLineItems(
  items: AmazonOrderItem[],
  orderId: string,
  productIdMap: Map<string, string>
) {
  return items.map((item) => {
    const unitPrice = parseFloat(item.ItemPrice?.Amount ?? "0") / (item.QuantityOrdered || 1);
    const discount = parseFloat(item.PromotionDiscount?.Amount ?? "0");
    const totalPrice = parseFloat(item.ItemPrice?.Amount ?? "0") - discount;

    return {
      order_id: orderId,
      product_id: productIdMap.get(item.ASIN) ?? null,
      external_product_id: item.ASIN,
      variant_id: null,
      title: item.Title,
      quantity: item.QuantityOrdered,
      unit_price: unitPrice,
      discount,
      total_price: totalPrice,
    };
  });
}

export function mapAmazonCustomer(
  order: AmazonOrder,
  storeId: string
) {
  const buyerEmail = order.BuyerInfo?.BuyerEmail;
  const emailHash = buyerEmail
    ? Buffer.from(buyerEmail).toString("base64").slice(0, 32)
    : null;

  return {
    store_id: storeId,
    external_id: `amazon_buyer_${order.AmazonOrderId}`,
    email_hash: emailHash,
    first_name: null,
    last_name: null,
    lifetime_value: parseFloat(order.OrderTotal?.Amount ?? "0"),
    order_count: 1,
    segment: "new" as const,
    city: order.ShippingAddress?.City ?? null,
    country: order.ShippingAddress?.CountryCode ?? null,
  };
}

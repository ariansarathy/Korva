import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";

/**
 * POST /api/data/export
 * Generates a CSV export of orders, products, and customers.
 * Returns a CSV file as a download.
 */
export async function POST() {
  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!store) {
      return NextResponse.json(
        { error: "No store connected." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch all data in parallel
    const [ordersRes, productsRes, customersRes] = await Promise.all([
      supabase
        .from("orders")
        .select("external_id, total, subtotal, discount, shipping, tax, status, channel, source, created_at")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false })
        .limit(10000),
      supabase
        .from("products")
        .select("external_id, title, category, sku, sell_price, cost_price, inventory_qty, status, created_at")
        .eq("store_id", store.id)
        .order("title", { ascending: true })
        .limit(10000),
      supabase
        .from("customers")
        .select("external_id, first_name, last_name, order_count, lifetime_value, segment, city, country, first_order_date, last_order_date")
        .eq("store_id", store.id)
        .order("lifetime_value", { ascending: false })
        .limit(10000),
    ]);

    // Build CSV sections
    const sections: string[] = [];

    // Orders
    sections.push("=== ORDERS ===");
    sections.push("Order ID,Total,Subtotal,Discount,Shipping,Tax,Status,Channel,Source,Date");
    for (const o of ordersRes.data ?? []) {
      sections.push(
        [
          o.external_id,
          o.total,
          o.subtotal,
          o.discount,
          o.shipping,
          o.tax,
          o.status,
          csvEscape(o.channel ?? ""),
          csvEscape(o.source ?? ""),
          o.created_at,
        ].join(",")
      );
    }

    sections.push("");
    sections.push("=== PRODUCTS ===");
    sections.push("Product ID,Title,Category,SKU,Sell Price,Cost Price,Inventory,Status,Created");
    for (const p of productsRes.data ?? []) {
      sections.push(
        [
          p.external_id,
          csvEscape(p.title),
          csvEscape(p.category ?? ""),
          csvEscape(p.sku ?? ""),
          p.sell_price ?? "",
          p.cost_price ?? "",
          p.inventory_qty,
          p.status,
          p.created_at,
        ].join(",")
      );
    }

    sections.push("");
    sections.push("=== CUSTOMERS ===");
    sections.push("Customer ID,First Name,Last Name,Orders,Lifetime Value,Segment,City,Country,First Order,Last Order");
    for (const c of customersRes.data ?? []) {
      sections.push(
        [
          c.external_id,
          csvEscape(c.first_name ?? ""),
          csvEscape(c.last_name ?? ""),
          c.order_count,
          c.lifetime_value,
          c.segment,
          csvEscape(c.city ?? ""),
          csvEscape(c.country ?? ""),
          c.first_order_date ?? "",
          c.last_order_date ?? "",
        ].join(",")
      );
    }

    const csvContent = sections.join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="korva-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json(
      { error: "Failed to export data." },
      { status: 500 }
    );
  }
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

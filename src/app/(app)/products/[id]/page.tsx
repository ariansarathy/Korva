import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { ProductDetail } from "@/components/products/product-detail";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, store } = await getCurrentUserStore();
  if (!userId || !store) redirect("/login");

  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("store_id", store.id)
    .single();

  if (!product) redirect("/products");

  // Get aggregate sales stats
  const { data: salesData } = await supabase
    .from("order_items")
    .select("quantity, total_price")
    .eq("product_id", id);

  const totalUnitsSold = (salesData ?? []).reduce((s, r) => s + r.quantity, 0);
  const totalRevenue = (salesData ?? []).reduce((s, r) => s + Number(r.total_price), 0);
  const margin =
    product.cost_price && totalUnitsSold > 0
      ? ((totalRevenue - Number(product.cost_price) * totalUnitsSold) / totalRevenue) * 100
      : null;

  return (
    <ProductDetail
      product={product}
      analytics={{
        totalUnitsSold,
        totalRevenue,
        margin: margin ? Math.round(margin * 10) / 10 : null,
      }}
      storeCurrency={store.currency ?? "USD"}
    />
  );
}

import { getCurrentUserStore } from "@/lib/utils/auth";
import { createClient } from "@/lib/supabase/server";
import { ProductTable } from "@/components/products/product-table";
import type { Product } from "@/lib/supabase/types";
import { isDemoMode, DEMO_PRODUCTS } from "@/lib/demo";

export default async function ProductsPage() {
  const { store } = await getCurrentUserStore();

  let products: Product[] = [];

  if (isDemoMode()) {
    products = DEMO_PRODUCTS;
  } else if (store) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", store.id)
        .order("title", { ascending: true })
        .limit(500);

      products = (data ?? []) as Product[];
    } catch {
      // Supabase not configured
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="mt-1 text-sm text-secondary">
            Product performance and inventory health.
            {products.length > 0 && (
              <span className="ml-2 text-muted">
                {products.length} product{products.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
      </div>

      <ProductTable products={products} />
    </div>
  );
}

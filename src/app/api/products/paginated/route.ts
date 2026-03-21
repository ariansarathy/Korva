import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { ProductSearchSchema, searchParamsToObject } from "@/lib/validation/schemas";
import { isDemoMode, DEMO_PRODUCTS } from "@/lib/demo";

/**
 * GET /api/products/paginated?page=1&limit=20&search=&status=
 * Paginated products with optional search and status filter.
 */
export async function GET(request: NextRequest) {
  if (isDemoMode()) {
    const search = request.nextUrl.searchParams.get("search")?.toLowerCase() ?? "";
    const filtered = search
      ? DEMO_PRODUCTS.filter((p) => p.title.toLowerCase().includes(search))
      : DEMO_PRODUCTS;
    return NextResponse.json({ products: filtered, total: filtered.length });
  }

  try {
    const { store } = await getCurrentUserStore();
    if (!store) {
      return NextResponse.json({ error: "No store connected" }, { status: 400 });
    }

    const parsed = ProductSearchSchema.safeParse(
      searchParamsToObject(request.nextUrl.searchParams)
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid parameters" },
        { status: 400 }
      );
    }

    const { page, limit, search, status } = parsed.data;
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .eq("store_id", store.id);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,sku.ilike.%${search}%,category.ilike.%${search}%`
      );
    }

    const { data, count, error } = await query
      .order("title", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      products: data ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

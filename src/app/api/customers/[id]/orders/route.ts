import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { PaginationSchema, searchParamsToObject } from "@/lib/validation/schemas";

/**
 * GET /api/customers/[id]/orders?page=1&limit=10
 * Returns paginated order history for a specific customer.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { store } = await getCurrentUserStore();
    if (!store) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const parsed = PaginationSchema.safeParse(
      searchParamsToObject(request.nextUrl.searchParams)
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid parameters" },
        { status: 400 }
      );
    }

    const { page, limit } = parsed.data;
    const offset = (page - 1) * limit;
    const supabase = await createClient();

    // Verify customer belongs to this store
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("id", id)
      .eq("store_id", store.id)
      .single();

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Fetch orders with items
    const { data: orders, count, error } = await supabase
      .from("orders")
      .select("*, order_items(*)", { count: "exact" })
      .eq("customer_id", id)
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      orders: orders ?? [],
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

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { CustomerSearchSchema, searchParamsToObject } from "@/lib/validation/schemas";
import { isDemoMode } from "@/lib/demo";

/**
 * GET /api/customers?page=1&limit=20&search=&segment=
 * Paginated customers with optional search and segment filter.
 */
export async function GET(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json({ customers: [], total: 0 });
  }

  try {
    const { store } = await getCurrentUserStore();
    if (!store) {
      return NextResponse.json({ error: "No store connected" }, { status: 400 });
    }

    const parsed = CustomerSearchSchema.safeParse(
      searchParamsToObject(request.nextUrl.searchParams)
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid parameters" },
        { status: 400 }
      );
    }

    const { page, limit, search, segment } = parsed.data;
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from("customers")
      .select("*", { count: "exact" })
      .eq("store_id", store.id);

    if (segment && segment !== "all") {
      query = query.eq("segment", segment);
    }

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email_hash.ilike.%${search}%`
      );
    }

    const { data, count, error } = await query
      .order("lifetime_value", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      customers: data ?? [],
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

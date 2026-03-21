import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Compute cohort retention data for a store.
 * Groups customers by their first order month, then tracks repeat purchase rates.
 */
export async function computeCohortRetention(storeId: string): Promise<void> {
  const supabase = createAdminClient();

  // Get all orders with customer IDs, sorted by date
  const { data: orders } = await supabase
    .from("orders")
    .select("customer_id, created_at, total")
    .eq("store_id", storeId)
    .not("customer_id", "is", null)
    .order("created_at", { ascending: true });

  if (!orders || orders.length === 0) return;

  // Group orders by customer
  const customerOrders = new Map<string, Array<{ date: Date; total: number }>>();
  for (const order of orders) {
    if (!order.customer_id) continue;
    const existing = customerOrders.get(order.customer_id) ?? [];
    existing.push({ date: new Date(order.created_at), total: order.total });
    customerOrders.set(order.customer_id, existing);
  }

  // Determine first order month per customer
  const customerCohort = new Map<string, string>(); // customer_id -> YYYY-MM-DD
  for (const [customerId, orderList] of customerOrders) {
    const firstOrder = orderList[0].date;
    const cohortMonth = `${firstOrder.getFullYear()}-${String(firstOrder.getMonth() + 1).padStart(2, "0")}-01`;
    customerCohort.set(customerId, cohortMonth);
  }

  // Compute retention by cohort
  const cohortData = new Map<
    string,
    Map<number, { customers: Set<string>; revenue: number }>
  >();

  for (const [customerId, orderList] of customerOrders) {
    const cohortMonth = customerCohort.get(customerId)!;
    const cohortDate = new Date(cohortMonth);

    if (!cohortData.has(cohortMonth)) {
      cohortData.set(cohortMonth, new Map());
    }
    const cohort = cohortData.get(cohortMonth)!;

    for (const order of orderList) {
      const monthsSinceFirst =
        (order.date.getFullYear() - cohortDate.getFullYear()) * 12 +
        (order.date.getMonth() - cohortDate.getMonth());

      if (!cohort.has(monthsSinceFirst)) {
        cohort.set(monthsSinceFirst, { customers: new Set(), revenue: 0 });
      }
      const bucket = cohort.get(monthsSinceFirst)!;
      bucket.customers.add(customerId);
      bucket.revenue += order.total;
    }
  }

  // Get total customers per cohort (month 0)
  const cohortTotals = new Map<string, number>();
  for (const [cohortMonth, months] of cohortData) {
    const month0 = months.get(0);
    cohortTotals.set(cohortMonth, month0?.customers.size ?? 0);
  }

  // Upsert into cohort_snapshots (using actual table columns)
  const snapshots: Array<{
    store_id: string;
    cohort_month: string;
    months_since_first: number;
    customer_count: number;
    revenue: number;
    retention_rate: number;
  }> = [];

  for (const [cohortMonth, months] of cohortData) {
    const totalCustomers = cohortTotals.get(cohortMonth) ?? 0;
    for (const [monthsSinceFirst, data] of months) {
      const retentionRate =
        totalCustomers > 0
          ? Math.round((data.customers.size / totalCustomers) * 10000) / 100
          : 0;

      snapshots.push({
        store_id: storeId,
        cohort_month: cohortMonth,
        months_since_first: monthsSinceFirst,
        customer_count: totalCustomers,
        revenue: Math.round(data.revenue * 100) / 100,
        retention_rate: retentionRate,
      });
    }
  }

  if (snapshots.length > 0) {
    for (let i = 0; i < snapshots.length; i += 500) {
      const batch = snapshots.slice(i, i + 500);
      await supabase.from("cohort_snapshots").upsert(batch, {
        onConflict: "store_id,cohort_month,months_since_first",
      });
    }
  }
}

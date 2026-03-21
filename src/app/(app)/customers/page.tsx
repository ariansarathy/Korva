import { getCurrentUserStore } from "@/lib/utils/auth";
import { getCustomerSegmentCounts, getTopCustomers } from "@/lib/utils/queries";
import { CustomersView } from "@/components/customers/customers-view";
import { isDemoMode, DEMO_SEGMENTS, DEMO_CUSTOMERS } from "@/lib/demo";

export default async function CustomersPage() {
  const { store } = await getCurrentUserStore();

  let segments = { new: 0, active: 0, at_risk: 0, churned: 0, vip: 0, total: 0 };
  let topCustomers: Awaited<ReturnType<typeof getTopCustomers>> = [];

  if (isDemoMode()) {
    segments = DEMO_SEGMENTS;
    topCustomers = DEMO_CUSTOMERS.map((c) => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      lifetime_value: c.lifetime_value,
      order_count: c.order_count,
      segment: c.segment,
      city: c.city,
      country: c.country,
      last_order_date: c.last_order_date,
    }));
  } else if (store) {
    try {
      [segments, topCustomers] = await Promise.all([
        getCustomerSegmentCounts(store.id),
        getTopCustomers(store.id, 15),
      ]);
    } catch {
      // Supabase not configured
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Customers</h1>
        <p className="mt-1 text-sm text-secondary">
          Customer segments, retention, and lifetime value.
          {segments.total > 0 && (
            <span className="ml-2 text-muted">
              {segments.total} customer{segments.total !== 1 ? "s" : ""}
            </span>
          )}
        </p>
      </div>

      <CustomersView segments={segments} topCustomers={topCustomers} />
    </div>
  );
}

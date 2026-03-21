import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { CustomerDetail } from "@/components/customers/customer-detail";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, store } = await getCurrentUserStore();
  if (!userId || !store) redirect("/login");

  const { id } = await params;
  const supabase = await createClient();

  // Fetch customer with store ownership check
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("store_id", store.id)
    .single();

  if (!customer) redirect("/customers");

  // Fetch recent orders
  const { data: recentOrders } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", id)
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <CustomerDetail
      customer={customer}
      recentOrders={recentOrders ?? []}
      storeCurrency={store.currency ?? "USD"}
    />
  );
}

import { supabase } from "../lib/supabase.js";

export async function getAdminSummary() {
  const [
    products,
    activeProducts,
    customers,
    orders,
    pendingOrders,
    deliveredOrders,
    paidOrders,
    recentOrders,
    lowStock,
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "customer"),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "delivered"),
    supabase.from("orders").select("total_amount").eq("payment_status", "paid"),
    supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("products")
      .select("*")
      .lte("stock_quantity", 5)
      .order("stock_quantity")
      .limit(8),
  ]);
  for (const result of [
    products,
    activeProducts,
    customers,
    orders,
    pendingOrders,
    deliveredOrders,
    paidOrders,
    recentOrders,
    lowStock,
  ])
    if (result.error) throw result.error;
  return {
    totalProducts: products.count ?? 0,
    activeProducts: activeProducts.count ?? 0,
    customers: customers.count ?? 0,
    orders: orders.count ?? 0,
    pendingOrders: pendingOrders.count ?? 0,
    deliveredOrders: deliveredOrders.count ?? 0,
    paidRevenue: (paidOrders.data ?? []).reduce(
      (sum, order) => sum + Number(order.total_amount),
      0,
    ),
    recentOrders: recentOrders.data ?? [],
    lowStock: lowStock.data ?? [],
  };
}

export async function listAllOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*,order_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateOrderStatus(id, status) {
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function listCustomers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,email,phone,created_at")
    .eq("role", "customer")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAllReviews() {
  const { data, error } = await supabase
    .from("product_reviews")
    .select("*,products(name,slug)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function setReviewApproval(id, isApproved) {
  const { error } = await supabase
    .from("product_reviews")
    .update({ is_approved: isApproved })
    .eq("id", id);
  if (error) throw error;
}

export async function updateStoreSettings(settings) {
  const { error } = await supabase
    .from("store_settings")
    .update(settings)
    .eq("id", true);
  if (error) throw error;
}

import { supabase } from "../lib/supabase.js";

export async function loadCart(userId) {
  const { data: cart, error: cartError } = await supabase
    .from("carts")
    .upsert({ user_id: userId }, { onConflict: "user_id" })
    .select()
    .single();
  if (cartError) throw cartError;
  const { data, error } = await supabase
    .from("cart_items")
    .select(
      "id,cart_id,product_id,quantity,created_at,updated_at,products(id,name,slug,price,sale_price,stock_quantity,is_active,main_image_url)",
    )
    .eq("cart_id", cart.id)
    .order("created_at");
  if (error) throw error;
  return { cart, items: data ?? [] };
}

export async function addCartItem(userId, productId, quantity = 1) {
  const { data: cart, error: cartError } = await supabase
    .from("carts")
    .upsert({ user_id: userId }, { onConflict: "user_id" })
    .select()
    .single();
  if (cartError) throw cartError;
  const { data: existing, error: existingError } = await supabase
    .from("cart_items")
    .select("id,quantity")
    .eq("cart_id", cart.id)
    .eq("product_id", productId)
    .maybeSingle();
  if (existingError) throw existingError;
  const operation = existing
    ? supabase
        .from("cart_items")
        .update({ quantity: existing.quantity + quantity })
        .eq("id", existing.id)
    : supabase
        .from("cart_items")
        .insert({ cart_id: cart.id, product_id: productId, quantity });
  const { error } = await operation;
  if (error) throw error;
}

export async function setCartQuantity(itemId, quantity) {
  if (quantity < 1) return removeCartItem(itemId);
  const { error } = await supabase
    .from("cart_items")
    .update({ quantity })
    .eq("id", itemId);
  if (error) throw error;
}

export async function removeCartItem(itemId) {
  const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
  if (error) throw error;
}

export async function listWishlist(userId) {
  const { data, error } = await supabase
    .from("wishlist")
    .select("id,user_id,product_id,created_at,products(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function toggleWishlist(userId, productId, currentlySaved) {
  if (currentlySaved) {
    const { error } = await supabase
      .from("wishlist")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("wishlist")
      .insert({ user_id: userId, product_id: productId });
    if (error) throw error;
  }
}

export async function listAddresses(userId) {
  const { data, error } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveAddress(userId, address, id) {
  if (address.is_default) {
    let clearDefaults = supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("is_default", true);
    if (id) clearDefaults = clearDefaults.neq("id", id);
    const { error: clearError } = await clearDefaults;
    if (clearError) throw clearError;
  }
  const payload = { ...address, user_id: userId };
  const query = id
    ? supabase.from("customer_addresses").update(payload).eq("id", id)
    : supabase.from("customer_addresses").insert(payload);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function deleteAddress(id) {
  const { error } = await supabase
    .from("customer_addresses")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function listOrders(userId) {
  const { data, error } = await supabase
    .from("orders")
    .select("*,order_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function placeOrder({ items, shipping, paymentMethod }) {
  const { data, error } = await supabase.rpc("place_order", {
    p_items: items.map(({ product_id, quantity }) => ({
      product_id,
      quantity,
    })),
    p_shipping_full_name: shipping.full_name,
    p_shipping_phone: shipping.phone,
    p_shipping_address: shipping.address,
    p_shipping_city: shipping.city,
    p_shipping_region: `${shipping.region}, ${shipping.country}`,
    p_payment_method: paymentMethod,
  });
  if (error) throw error;
  return data;
}

export async function submitReview({ userId, productId, rating, review }) {
  const { error } = await supabase
    .from("product_reviews")
    .insert({
      user_id: userId,
      product_id: productId,
      rating,
      review,
      is_approved: false,
    });
  if (error) throw error;
}

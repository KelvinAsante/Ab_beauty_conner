import { supabase } from "../lib/supabase.js";

const GUEST_CART_KEY = "ab-beauty-guest-cart";
const GUEST_WISHLIST_KEY = "ab-beauty-guest-wishlist";
const guestMergePromises = new Map();

function readStoredItems(key) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error(`Unable to read ${key} from local storage.`, error);
    return [];
  }
}

export function readGuestCart() {
  return readStoredItems(GUEST_CART_KEY);
}

export function saveGuestCart(items) {
  window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function readGuestWishlist() {
  return readStoredItems(GUEST_WISHLIST_KEY);
}

export function saveGuestWishlist(items) {
  window.localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(items));
}

async function mergeGuestShoppingDataForUser(userId) {
  const cart = readGuestCart();
  for (const item of cart) {
    await addCartItem(userId, item.product_id, item.quantity);
    saveGuestCart(
      readGuestCart().filter((entry) => entry.product_id !== item.product_id),
    );
  }

  const wishlist = readGuestWishlist();
  const savedItems = await listWishlist(userId);
  const savedIds = new Set(savedItems.map((item) => item.product_id));
  for (const item of wishlist) {
    if (!savedIds.has(item.product_id))
      await toggleWishlist(userId, item.product_id, false);
    saveGuestWishlist(
      readGuestWishlist().filter(
        (entry) => entry.product_id !== item.product_id,
      ),
    );
  }
}

export function mergeGuestShoppingData(userId) {
  const pending = guestMergePromises.get(userId);
  if (pending) return pending;
  const merge = mergeGuestShoppingDataForUser(userId).finally(() =>
    guestMergePromises.delete(userId),
  );
  guestMergePromises.set(userId, merge);
  return merge;
}

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

export async function initializePaystackPayment(shipping) {
  const { data, error } = await supabase.functions.invoke(
    "initialize-paystack",
    {
      body: { shipping },
    },
  );
  if (error) throw error;
  if (!data?.authorization_url)
    throw new Error("Paystack did not return a payment link");
  return data.authorization_url;
}

export async function verifyPaystackPayment(reference) {
  const { data, error } = await supabase.functions.invoke("verify-paystack", {
    body: { reference },
  });
  if (error) throw error;
  if (!data?.success)
    throw new Error(data?.error || "Payment verification failed");
  return data.order;
}

export async function submitReview({ userId, productId, rating, review }) {
  const { error } = await supabase.from("product_reviews").insert({
    user_id: userId,
    product_id: productId,
    rating,
    review,
    is_approved: false,
  });
  if (error) throw error;
}

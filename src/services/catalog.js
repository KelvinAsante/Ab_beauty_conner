import { supabase } from "../lib/supabase.js";

export async function listProducts({
  admin = false,
  categoryId,
  search,
  sort = "newest",
  limit,
  featured,
} = {}) {
  let query = supabase.from("products").select("*, product_images(*)");
  if (!admin) query = query.eq("is_active", true);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (featured) query = query.eq("is_featured", true);
  if (search) {
    const term = search.replace(/[,()\\]/g, " ").trim();
    query = query.or(
      `name.ilike.%${term}%,brand.ilike.%${term}%,description.ilike.%${term}%`,
    );
  }
  query = query.order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getProductBySlug(slug) {
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  if (error) throw error;
  return data;
}

export async function listCategories({ admin = false } = {}) {
  let query = supabase.from("categories").select("*").order("name");
  if (!admin) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getStoreSettings() {
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProductReviews(productId, { admin = false } = {}) {
  let query = supabase
    .from("product_reviews")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (!admin) query = query.eq("is_approved", true);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createProduct(product) {
  const { data, error } = await supabase
    .from("products")
    .insert(product)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id, changes) {
  const { data, error } = await supabase
    .from("products")
    .update(changes)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(id) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function saveCategory(category, id) {
  const query = id
    ? supabase.from("categories").update(category).eq("id", id)
    : supabase.from("categories").insert(category);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function uploadProductImages(productId, files) {
  const uploaded = [];
  try {
    const { data: existingImages, error: existingError } = await supabase
      .from("product_images")
      .select("display_order")
      .eq("product_id", productId);
    if (existingError) throw existingError;
    const nextOrder =
      (existingImages ?? []).reduce(
        (max, image) => Math.max(max, image.display_order),
        -1,
      ) + 1;
    for (const [index, file] of [...files].entries()) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${productId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);
      uploaded.push({
        product_id: productId,
        image_url: data.publicUrl,
        storage_path: path,
        display_order: nextOrder + index,
      });
    }
    if (uploaded.length) {
      const { error } = await supabase.from("product_images").insert(uploaded);
      if (error) throw error;
    }
    return uploaded;
  } catch (error) {
    if (uploaded.length)
      await supabase.storage
        .from("product-images")
        .remove(uploaded.map((image) => image.storage_path));
    throw error;
  }
}

import { supabase } from "../lib/supabase.js";

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return { ...data, profile: await getProfile(data.user.id) };
}

export async function signUp({ fullName, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function updateProfile(userId, changes) {
  const { data, error } = await supabase
    .from("profiles")
    .update(changes)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadProfileAvatar(userId, file) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function deleteProfileAvatar(path) {
  if (!path) return;
  const { error } = await supabase.storage.from("avatars").remove([path]);
  if (error) throw error;
}

export function avatarPathFromUrl(url) {
  if (!url) return null;
  const marker = "/storage/v1/object/public/avatars/";
  const index = url.indexOf(marker);
  return index < 0 ? null : decodeURIComponent(url.slice(index + marker.length));
}

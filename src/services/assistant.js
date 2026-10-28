import { supabase } from "../lib/supabase.js";

export async function askProductAssistant(slug, messages) {
  const { data, error } = await supabase.functions.invoke("product-assistant", {
    body: { slug, messages },
  });
  if (error) throw error;
  if (typeof data?.answer !== "string" || !data.answer.trim()) {
    throw new Error("The product assistant did not return an answer.");
  }
  return data.answer;
}

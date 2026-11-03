import { supabase } from "../lib/supabase.js";

export async function askProductAssistant(slug, messages) {
  const { data, error } = await supabase.functions.invoke("product-assistant", {
    body: { slug, messages },
  });
  if (error) {
    const response = error.context;
    if (response && typeof response.clone === "function") {
      const body = await response
        .clone()
        .json()
        .catch(() => null);
      if (typeof body?.error === "string" && body.error.trim()) {
        throw new Error(body.error);
      }
    }
    throw error;
  }
  if (typeof data?.answer !== "string" || !data.answer.trim()) {
    throw new Error("The product assistant did not return an answer.");
  }
  const sources = Array.isArray(data.sources)
    ? data.sources
        .filter(
          (source) =>
            typeof source?.url === "string" &&
            /^https?:\/\/[^/\s?#]+/i.test(source.url),
        )
        .map((source) => ({
          url: source.url,
          title: typeof source.title === "string" ? source.title : "",
        }))
    : [];
  return { answer: data.answer, sources };
}

export const STORE_CURRENCY = "GHS";

export function formatMoney(value, currency = STORE_CURRENCY) {
  try {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
    }).format(Number(value) || 0);
  } catch {
    return `${currency} ${(Number(value) || 0).toFixed(2)}`;
  }
}

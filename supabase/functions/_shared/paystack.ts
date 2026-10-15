import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const PAYSTACK_API = "https://api.paystack.co";

export async function paystackRequest(
  path: string,
  secret: string,
  init?: RequestInit,
) {
  const response = await fetch(`${PAYSTACK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const result = await response.json();
  if (!response.ok || !result.status) {
    throw new Error(result.message || "Paystack request failed");
  }
  return result.data;
}

export async function verifyPaystackSignature(
  body: string,
  signature: string,
  secret: string,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
  );
  const expected = [...digest]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  if (signature.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return difference === 0;
}

export async function confirmAndCompletePayment(
  admin: SupabaseClient,
  reference: string,
  secret: string,
) {
  const { data: order, error } = await admin
    .from("orders")
    .select(
      "id,order_number,total_amount,payment_status,payment_method,payment_reference",
    )
    .eq("payment_reference", reference)
    .maybeSingle();
  if (error) throw error;
  if (!order || order.payment_method !== "paystack") {
    throw new Error("The order for this payment was not found");
  }

  const transaction = await paystackRequest(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    secret,
  );
  if (
    transaction.status !== "success" ||
    transaction.reference !== reference ||
    transaction.currency !== "GHS" ||
    Number(transaction.amount) !== Math.round(Number(order.total_amount) * 100)
  ) {
    throw new Error("Paystack payment verification did not match the order");
  }

  const { data: completed, error: completionError } = await admin.rpc(
    "complete_paystack_order",
    {
      p_reference: reference,
      p_transaction_id: String(transaction.id),
    },
  );
  if (completionError?.message.includes("Insufficient stock")) {
    await paystackRequest("/refund", secret, {
      method: "POST",
      body: JSON.stringify({ transaction: transaction.id }),
    });
    const { error: failureError } = await admin.rpc("fail_paystack_order", {
      p_reference: reference,
    });
    if (failureError) throw failureError;
    throw new Error(
      "Payment succeeded but the item is no longer available. Paystack has been asked to refund the payment.",
    );
  }
  if (completionError) throw completionError;
  return { ...completed, transaction_id: String(transaction.id) };
}

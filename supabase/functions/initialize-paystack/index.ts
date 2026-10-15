import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { corsHeaders, errorMessage, jsonResponse } from "../_shared/http.ts";
import { paystackRequest } from "../_shared/paystack.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST")
    return jsonResponse({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  const siteUrl = Deno.env.get("SITE_URL")?.replace(/\/$/, "");
  if (
    !authorization ||
    !supabaseUrl ||
    !anonKey ||
    !serviceRoleKey ||
    !secret ||
    !siteUrl
  ) {
    return jsonResponse(
      { error: "Payment service is not fully configured" },
      503,
    );
  }

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = authorization.replace(/^Bearer\s+/i, "");
    const { data: userResult, error: authError } =
      await userClient.auth.getUser(token);
    if (authError || !userResult.user?.email) {
      return jsonResponse({ error: "Sign in again before paying" }, 401);
    }

    const body = await request.json();
    const shipping = body?.shipping || {};
    const reference = `ABP-${crypto.randomUUID().replaceAll("-", "").toUpperCase()}`;
    const { data: order, error: orderError } = await userClient.rpc(
      "create_paystack_order",
      {
        p_reference: reference,
        p_shipping_full_name: String(shipping.full_name || ""),
        p_shipping_phone: String(shipping.phone || ""),
        p_shipping_address: String(shipping.address || ""),
        p_shipping_city: String(shipping.city || ""),
        p_shipping_region: `${String(shipping.region || "")}, ${String(shipping.country || "Ghana")}`,
      },
    );
    if (orderError) throw orderError;

    try {
      const transaction = await paystackRequest(
        "/transaction/initialize",
        secret,
        {
          method: "POST",
          body: JSON.stringify({
            email: userResult.user.email,
            amount: Math.round(Number(order.total_amount) * 100),
            currency: "GHS",
            reference,
            callback_url: `${siteUrl}/payment/return`,
            channels: ["card", "mobile_money"],
            metadata: {
              order_id: order.id,
              order_number: order.order_number,
            },
          }),
        },
      );
      return jsonResponse({ authorization_url: transaction.authorization_url });
    } catch (error) {
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await admin.rpc("fail_paystack_order", { p_reference: reference });
      throw error;
    }
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 400);
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { corsHeaders, errorMessage, jsonResponse } from "../_shared/http.ts";
import {
  confirmAndCompletePayment,
  paystackRequest,
} from "../_shared/paystack.ts";

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
  if (
    !authorization ||
    !supabaseUrl ||
    !anonKey ||
    !serviceRoleKey ||
    !secret
  ) {
    return jsonResponse(
      { error: "Payment service is not fully configured" },
      503,
    );
  }

  try {
    const token = authorization.replace(/^Bearer\s+/i, "");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userResult, error: authError } =
      await userClient.auth.getUser(token);
    if (authError || !userResult.user)
      return jsonResponse({ error: "Sign in to verify this payment" }, 401);

    const { reference } = await request.json();
    if (typeof reference !== "string" || !reference.trim()) {
      return jsonResponse({ error: "Missing Paystack reference" }, 400);
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id,user_id,payment_reference")
      .eq("payment_reference", reference)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order || order.user_id !== userResult.user.id) {
      return jsonResponse(
        { error: "This payment does not belong to your account" },
        403,
      );
    }

    try {
      const completed = await confirmAndCompletePayment(
        admin,
        reference,
        secret,
      );
      return jsonResponse({ success: true, order: completed });
    } catch (error) {
      const transaction = await paystackRequest(
        `/transaction/verify/${encodeURIComponent(reference)}`,
        secret,
      ).catch(() => null);
      if (transaction?.status && transaction.status !== "success") {
        await admin.rpc("fail_paystack_order", { p_reference: reference });
      }
      throw error;
    }
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 400);
  }
});

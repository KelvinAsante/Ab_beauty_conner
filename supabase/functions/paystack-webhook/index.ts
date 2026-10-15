import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { errorMessage, jsonResponse } from "../_shared/http.ts";
import {
  confirmAndCompletePayment,
  verifyPaystackSignature,
} from "../_shared/paystack.ts";

Deno.serve(async (request) => {
  if (request.method !== "POST")
    return jsonResponse({ error: "Method not allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!supabaseUrl || !serviceRoleKey || !secret) {
    return jsonResponse({ error: "Webhook is not configured" }, 503);
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") || "";
  if (!(await verifyPaystackSignature(rawBody, signature, secret))) {
    return jsonResponse({ error: "Invalid webhook signature" }, 401);
  }

  try {
    const event = JSON.parse(rawBody);
    const reference = event?.data?.reference;
    if (
      (event?.event === "charge.success" || event?.event === "charge.failed") &&
      typeof reference === "string"
    ) {
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      if (event.event === "charge.success") {
        await confirmAndCompletePayment(admin, reference, secret);
      } else {
        const { error } = await admin.rpc("fail_paystack_order", {
          p_reference: reference,
        });
        if (error) throw error;
      }
    }
    return jsonResponse({ received: true });
  } catch (error) {
    console.error("Paystack webhook processing failed:", errorMessage(error));
    return jsonResponse({ error: "Webhook processing failed" }, 500);
  }
});

# Paystack setup

The Paystack secret key must stay in Supabase Edge Function secrets. Never add it to the Vite `.env` file or frontend code.

## Deploy

From the repository root, install/use the Supabase CLI, sign in, then link the existing project:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_SUPABASE_PROJECT_REF
npx supabase db push
```

In Paystack, start with a test secret key. Add it and the public site origin to Supabase Function secrets (Supabase Dashboard → Edge Functions → Secrets):

- `PAYSTACK_SECRET_KEY`: Paystack test secret key (later replace with the live key)
- `SITE_URL`: public origin of the site, for example `https://your-store.example`

`SITE_URL` must not include a trailing slash. The payment callback is `${SITE_URL}/payment/return`.

Deploy all three functions:

```powershell
npx supabase functions deploy initialize-paystack
npx supabase functions deploy verify-paystack
npx supabase functions deploy paystack-webhook
```

The webhook function disables JWT verification in `supabase/config.toml`; it authenticates Paystack requests using the HMAC signature header instead.

## Configure the webhook

In the Paystack Dashboard, configure the webhook URL:

```text
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/paystack-webhook
```

Subscribe to transaction success events. The webhook and browser return both verify the transaction against Paystack before the database marks an order paid. Order totals are computed from the customer cart and database prices, not from browser-submitted amounts.

## Test before live mode

1. Keep the Paystack test key in Supabase secrets.
2. Deploy the migration and functions, then select **Pay online with Paystack** at checkout.
3. Test successful and abandoned/failed payments using Paystack test credentials.
4. Confirm successful transactions appear as paid in the customer order history and admin order list. Failed payments should leave the cart available for retry.
5. Only after testing, replace `PAYSTACK_SECRET_KEY` with the live secret and configure the production webhook URL in Paystack.
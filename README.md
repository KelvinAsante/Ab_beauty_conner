# AB Beauty Conner

React/Vite storefront and store-admin workspace backed by the existing Supabase project. Product, category, cart, order, review, profile, and settings data are read from Supabase; the frontend has no mock inventory or localStorage database.

## Supabase connection

1. Create a Supabase project.
2. Copy `.env.example` to `.env` and fill in the project's URL and publishable (or legacy anon) key from **Project Settings > API**.
3. Never put a `service_role` or secret key in a `VITE_` variable or browser code. The publishable/anon key is intended for browser use; RLS is the security boundary.
4. Install dependencies with `npm install`; run the app with `npm run dev`.

The shared client is exported from `src/lib/supabase.js`. Auth session persistence and refresh are enabled by the official Supabase JS client. Tailwind CSS, React Router, and Lucide icons are configured in the existing Vite app.

## Application routes

Public store pages: `/`, `/shop`, `/category/:slug`, `/product/:slug`, `/signin`, `/signup`, `/forgot-password`, and `/reset-password`.

Customer-only pages: `/cart`, `/checkout`, `/account`, `/account/orders`, `/account/addresses`, and `/account/wishlist`.

Admin-only pages: `/admin/dashboard`, `/admin/products`, `/admin/products/new`, `/admin/products/:id/edit`, `/admin/categories`, `/admin/orders`, `/admin/customers`, `/admin/inventory`, `/admin/reviews`, and `/admin/settings`.

Customers and administrators share `/signin`; after authentication the app reads `profiles.role` and routes to the corresponding experience. Route guards improve navigation, while Supabase RLS remains the authorization boundary. Public storefront content comes from active database rows; empty catalog/category states are intentional until an administrator adds and publishes records.

Admin product image uploads use the existing `product-images` bucket and `product_images` table. Product publishing is controlled by `is_active`; no redeployment is needed for database changes to be visible on a new page load. Product delete attempts to remove associated Storage files before deleting the database record.

Checkout calls the existing `place_order` RPC. It does not trust browser-supplied prices/totals and does not mark orders paid. No Paystack/Hubtel integration exists, so online payment options are not presented as operational. The existing `orders` schema has `shipping_region` but no country column; checkout stores the entered region and country together in that field. `store_settings` has contact, currency, and delivery-fee values; low-stock threshold, store announcement, and newsletter configuration are not in the schema and are not represented as editable settings.

## Database migration

Run `supabase/migrations/20261008000000_initial_schema.sql` in the Supabase SQL Editor as the project owner, or apply it with the Supabase CLI (`supabase db push`). It creates profiles, catalog, carts, checkout/orders, addresses, wishlist, reviews, store settings, constraints, indexes, timestamp/auth triggers, RLS policies, and the `product-images` public bucket with admin-only writes.

For customer profile photo uploads, also run `supabase/migrations/20261009000000_user_avatars.sql` in the SQL Editor. It creates a public-read `avatars` bucket; authenticated users can upload, replace, and delete files only inside their own user-ID folder. The header profile menu links to sign-in/sign-up for guests and profile, orders, addresses, wishlist, and sign-out for customers. The account profile form saves the avatar URL to `profiles.avatar_url`.

New Auth users receive a `profiles` row automatically, with the `customer` role. The profile role cannot be changed by a customer through the API: the own-profile RLS check only accepts `customer`, while the admin policy is gated by `is_admin()`.

### Bootstrap the first administrator

There is intentionally no public bootstrap function or hard-coded admin credential. First create the account through Supabase Authentication. Then, in the Supabase Dashboard SQL Editor (privileged project-owner access), assign its role once:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'admin@example.com'
);
```

Verify exactly one row was updated, then sign in as that account and test an admin-only write. After bootstrap, only authenticated users already recognized by `is_admin()` can assign/change roles through the API. Protect project-owner access and enable MFA for administrator accounts.

## Auth usage

Use Supabase Auth directly for signup, login, logout, and password recovery:

- `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`
- `supabase.auth.signInWithPassword({ email, password })`
- `supabase.auth.signOut()`
- `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
- `supabase.auth.getSession()` and `supabase.auth.onAuthStateChange(...)`

Configure allowed redirect URLs and email confirmation/password policies in Supabase **Authentication** settings. The auth trigger creates/syncs the profile email; profile rows reference `auth.users(id)`.

## Storage and catalog

`product-images` is public-read so active product image URLs can be used in the store. Storage object inserts, updates, and deletes require the authenticated admin role. Upload object paths under a product UUID (for example `<product-uuid>/<image-uuid>.webp`), then persist the public URL and path in `product_images`; use `display_order = 0` for the primary image. Keep the product's `main_image_url` in sync. The bucket enforces a 10 MiB maximum and common web image MIME types.

Products start inactive (`is_active = false`); an administrator must explicitly publish them. Categories are database-managed, not hard-coded into React. Order creation must use the `place_order` RPC: it validates active products and stock, snapshots each product name/price, derives totals and delivery fee from store settings, reduces inventory, and clears matching cart items atomically. Do not grant customers direct order/order-item writes. Payment provider integration is not included; payment status remains unpaid until a trusted payment workflow updates it.

Product deletion removes catalog images, cart lines, wishlist entries and reviews; historical order lines remain with a null `product_id` and their saved product name/price. Deactivate products for the usual storefront workflow.

## Types

`src/types/database.ts` contains the requested frontend interfaces and an initial Supabase `Database` type. For exact schema-generated types, install the Supabase CLI and run:

```powershell
$env:SUPABASE_PROJECT_ID = "your-project-ref"
npx supabase gen types typescript --project-id $env:SUPABASE_PROJECT_ID > src/types/database.generated.ts
```

Then import `Database` from the generated file and initialize the client as `createClient<Database>(supabaseUrl, supabaseAnonKey)`. Generated types are ignored by git so they can be refreshed from the deployed schema.

## Backend test checklist

The production build and browser smoke checks pass. The configured project returned HTTP 200 for public active-product, active-category, and store-settings reads. The project currently returns no public catalog rows, so product shopping, checkout, and image upload workflows still need real products and authenticated test sessions.

- Register a customer with full name; confirm Auth user and customer profile appear. Sign in, sign out, and request a password reset.
- As a customer, read/update own profile fields, but attempt `role = 'admin'`; the update must fail or affect zero rows. Attempt product/category writes; they must fail.
- As the bootstrapped admin, create/update/deactivate/delete a product and manage categories, profile roles, store settings, and reviews.
- As a normal customer, create/update/delete only the customer's own cart, addresses, wishlist, and eligible unapproved review. Test duplicate wishlist/review and invalid cart quantity constraints.
- With two customer accounts, attempt to read or modify the other account's cart, order, address, wishlist, profile, and review; all must be blocked.
- As anon, read active products/categories, active product images, approved reviews, and store settings. Confirm inactive products/categories and unapproved reviews are hidden.
- As admin, upload/replace/delete an image in `product-images`. Repeat as a customer; each write must be denied. Confirm public image retrieval works.
- As a customer with a delivered purchase, create one review; confirm unpurchased products and duplicate reviews are rejected. As admin, approve/hide it.
- Call `place_order` as a customer with valid stock; verify totals, delivery fee, order number, item name/price snapshots, stock decrement, and cart cleanup. Try invalid quantities, inactive products, insufficient stock, and another user's data; each must fail safely.
- Inspect `pg_policies` for every public table and `storage.objects`; verify all client-facing tables have RLS enabled. Test with anon/customer/admin JWTs, not a service-role key.

End-to-end Auth, role-specific writes, Storage uploads, cart ownership, checkout, review eligibility, and payment-provider tests require customer/admin sessions and actual catalog data. Use separate accounts, never a service-role key, and verify RLS through browser/API JWT requests rather than relying only on dashboard SQL Editor behavior.
#   A b _ b e a u t y _ c o n n e r  
 
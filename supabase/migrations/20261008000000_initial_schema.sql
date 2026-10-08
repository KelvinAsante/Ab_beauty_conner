-- AB Beauty Conner initial schema. Safe to re-run against this schema.
create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert or update of email on auth.users
  for each row execute function public.handle_auth_user_profile();

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_not_blank check (length(btrim(name)) > 0)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  sale_price numeric(12, 2) check (sale_price is null or (sale_price >= 0 and sale_price <= price)),
  sku text unique,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  category_id uuid references public.categories(id) on delete set null,
  brand text,
  main_image_url text,
  is_featured boolean not null default false,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_name_not_blank check (length(btrim(name)) > 0)
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  storage_path text not null,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  constraint product_images_order_unique unique (product_id, display_order),
  constraint product_images_path_unique unique (storage_path)
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cart_items_product_unique unique (cart_id, product_id)
);

create table if not exists public.store_settings (
  id boolean primary key default true check (id),
  store_name text not null default 'AB Beauty Conner',
  contact_email text,
  phone text,
  address text,
  currency_code text not null default 'USD' check (currency_code ~ '^[A-Z]{3}$'),
  delivery_fee numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  order_number text not null unique default ('AB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  delivery_fee numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  shipping_full_name text not null,
  shipping_phone text not null,
  shipping_address text not null,
  shipping_city text not null,
  shipping_region text not null,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  payment_method text check (payment_method is null or payment_method in ('cash_on_delivery', 'mobile_money', 'card', 'bank_transfer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_matches check (total_amount = subtotal + delivery_fee)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_price numeric(12, 2) not null check (product_price >= 0),
  quantity integer not null check (quantity > 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  created_at timestamptz not null default now(),
  constraint order_items_subtotal_matches check (subtotal = product_price * quantity)
);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  phone text not null,
  address text not null,
  city text not null,
  region text not null,
  country text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customer_addresses_one_default_per_user
  on public.customer_addresses(user_id) where is_default;

create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint wishlist_product_unique unique (user_id, product_id)
);

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review text,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_reviews_one_per_customer unique (product_id, user_id)
);

create index if not exists products_active_category_idx on public.products(category_id, created_at desc) where is_active;
create index if not exists products_active_featured_idx on public.products(created_at desc) where is_active and is_featured;
create index if not exists product_images_product_order_idx on public.product_images(product_id, display_order);
create index if not exists cart_items_product_idx on public.cart_items(product_id);
create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists addresses_user_created_idx on public.customer_addresses(user_id, created_at desc);
create index if not exists wishlist_user_created_idx on public.wishlist(user_id, created_at desc);
create index if not exists reviews_product_approved_idx on public.product_reviews(product_id, created_at desc) where is_approved;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'categories', 'products', 'carts', 'cart_items',
    'store_settings', 'orders', 'customer_addresses', 'product_reviews'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name);
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.store_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.wishlist enable row level security;
alter table public.product_reviews enable row level security;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "profiles update own without role escalation" on public.profiles;
create policy "profiles update own without role escalation" on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and (role = 'customer' or (select public.is_admin())));
drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "public read active categories" on public.categories;
create policy "public read active categories" on public.categories for select to anon, authenticated
  using (is_active or (select public.is_admin()));
drop policy if exists "admins manage categories" on public.categories;
create policy "admins manage categories" on public.categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "public read active products" on public.products;
create policy "public read active products" on public.products for select to anon, authenticated
  using (is_active or (select public.is_admin()));
drop policy if exists "admins manage products" on public.products;
create policy "admins manage products" on public.products for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "public read images for active products" on public.product_images;
create policy "public read images for active products" on public.product_images for select to anon, authenticated
  using (
    exists (select 1 from public.products p where p.id = product_id and p.is_active)
    or (select public.is_admin())
  );
drop policy if exists "admins manage product images" on public.product_images;
create policy "admins manage product images" on public.product_images for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "customers manage own carts" on public.carts;
create policy "customers manage own carts" on public.carts for all to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "customers manage items in own carts" on public.cart_items;
create policy "customers manage items in own carts" on public.cart_items for all to authenticated
  using (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid()))
    or (select public.is_admin())
  )
  with check (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid()))
    or (select public.is_admin())
  );

drop policy if exists "public read store settings" on public.store_settings;
create policy "public read store settings" on public.store_settings for select to anon, authenticated using (true);
drop policy if exists "admins manage store settings" on public.store_settings;
create policy "admins manage store settings" on public.store_settings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "customers read own orders" on public.orders;
create policy "customers read own orders" on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "admins manage orders" on public.orders;
create policy "admins manage orders" on public.orders for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "customers read own order items" on public.order_items;
create policy "customers read own order items" on public.order_items for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
    or (select public.is_admin())
  );
drop policy if exists "admins manage order items" on public.order_items;
create policy "admins manage order items" on public.order_items for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "customers manage own addresses" on public.customer_addresses;
create policy "customers manage own addresses" on public.customer_addresses for all to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "customers manage own wishlist" on public.wishlist;
create policy "customers manage own wishlist" on public.wishlist for all to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "public read approved reviews" on public.product_reviews;
create policy "public read approved reviews" on public.product_reviews for select to anon, authenticated
  using (
    (is_approved and exists (select 1 from public.products p where p.id = product_id and p.is_active))
    or user_id = (select auth.uid())
    or (select public.is_admin())
  );
drop policy if exists "customers review delivered purchases" on public.product_reviews;
create policy "customers review delivered purchases" on public.product_reviews for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not is_approved
    and exists (
      select 1 from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = product_reviews.product_id
        and o.user_id = (select auth.uid())
        and o.status = 'delivered'
    )
  );
drop policy if exists "customers edit own unapproved reviews" on public.product_reviews;
create policy "customers edit own unapproved reviews" on public.product_reviews for update to authenticated
  using (user_id = (select auth.uid()) and not is_approved)
  with check (
    user_id = (select auth.uid())
    and not is_approved
    and exists (
      select 1 from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = product_reviews.product_id
        and o.user_id = (select auth.uid())
        and o.status = 'delivered'
    )
  );
drop policy if exists "customers delete own unapproved reviews" on public.product_reviews;
create policy "customers delete own unapproved reviews" on public.product_reviews for delete to authenticated
  using (user_id = (select auth.uid()) and not is_approved);
drop policy if exists "admins manage reviews" on public.product_reviews;
create policy "admins manage reviews" on public.product_reviews for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace function public.place_order(
  p_items jsonb,
  p_shipping_full_name text,
  p_shipping_phone text,
  p_shipping_address text,
  p_shipping_city text,
  p_shipping_region text,
  p_payment_method text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_item jsonb;
  v_product public.products%rowtype;
  v_product_id uuid;
  v_quantity integer;
  v_unit_price numeric(12, 2);
  v_subtotal numeric(12, 2) := 0;
  v_delivery_fee numeric(12, 2);
  v_item_count integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required to place an order';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one order item is required';
  end if;
  if nullif(btrim(p_shipping_full_name), '') is null
    or nullif(btrim(p_shipping_phone), '') is null
    or nullif(btrim(p_shipping_address), '') is null
    or nullif(btrim(p_shipping_city), '') is null
    or nullif(btrim(p_shipping_region), '') is null then
    raise exception 'All shipping fields are required';
  end if;

  select delivery_fee into strict v_delivery_fee from public.store_settings where id = true;
  insert into public.orders (
    id, user_id, subtotal, delivery_fee, total_amount,
    shipping_full_name, shipping_phone, shipping_address, shipping_city, shipping_region,
    payment_method
  ) values (
    v_order_id, (select auth.uid()), 0, v_delivery_fee, v_delivery_fee,
    btrim(p_shipping_full_name), btrim(p_shipping_phone), btrim(p_shipping_address),
    btrim(p_shipping_city), btrim(p_shipping_region), p_payment_method
  );

  for v_item in select value from jsonb_array_elements(p_items) as items(value) loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Order quantities must be greater than zero';
    end if;

    select * into v_product
    from public.products
    where id = v_product_id and is_active
    for update;
    if not found then
      raise exception 'A product is unavailable';
    end if;
    if v_product.stock_quantity < v_quantity then
      raise exception 'Insufficient stock for product %', v_product.name;
    end if;

    v_unit_price := coalesce(v_product.sale_price, v_product.price);
    update public.products set stock_quantity = stock_quantity - v_quantity where id = v_product.id;
    insert into public.order_items (order_id, product_id, product_name, product_price, quantity, subtotal)
    values (v_order_id, v_product.id, v_product.name, v_unit_price, v_quantity, v_unit_price * v_quantity);
    v_subtotal := v_subtotal + v_unit_price * v_quantity;
    v_item_count := v_item_count + 1;
  end loop;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as requested(value)
    group by requested.value ->> 'product_id'
    having count(*) > 1
  ) then
    raise exception 'An order may only contain each product once';
  end if;

  update public.orders
  set subtotal = v_subtotal, total_amount = v_subtotal + v_delivery_fee
  where id = v_order_id;

  delete from public.cart_items ci
  using public.carts c
  where ci.cart_id = c.id
    and c.user_id = (select auth.uid())
    and ci.product_id in (
      select (requested.value ->> 'product_id')::uuid
      from jsonb_array_elements(p_items) as requested(value)
    );

  return v_order_id;
end;
$$;

revoke all on function public.place_order(jsonb, text, text, text, text, text, text) from public;
grant execute on function public.place_order(jsonb, text, text, text, text, text, text) to authenticated;

grant select on public.categories, public.products, public.product_images, public.store_settings, public.product_reviews to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.carts, public.cart_items,
  public.customer_addresses, public.wishlist, public.product_reviews, public.categories,
  public.products, public.product_images, public.orders, public.order_items, public.store_settings
  to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read product image objects" on storage.objects;
create policy "public read product image objects" on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');
drop policy if exists "admins upload product image objects" on storage.objects;
create policy "admins upload product image objects" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));
drop policy if exists "admins update product image objects" on storage.objects;
create policy "admins update product image objects" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));
drop policy if exists "admins delete product image objects" on storage.objects;
create policy "admins delete product image objects" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
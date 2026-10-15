alter table public.orders
  add column if not exists payment_reference text unique,
  add column if not exists payment_transaction_id text unique;

alter table public.orders
  drop constraint if exists orders_payment_method_check;

alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method is null or payment_method in (
    'cash_on_delivery', 'mobile_money', 'card', 'bank_transfer', 'paystack'
  ));

create or replace function public.create_paystack_order(
  p_reference text,
  p_shipping_full_name text,
  p_shipping_phone text,
  p_shipping_address text,
  p_shipping_city text,
  p_shipping_region text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_cart_id uuid;
  v_order_id uuid := gen_random_uuid();
  v_order_number text;
  v_delivery_fee numeric(12, 2);
  v_subtotal numeric(12, 2) := 0;
  v_item record;
  v_product public.products%rowtype;
  v_unit_price numeric(12, 2);
begin
  if v_user_id is null then
    raise exception 'Authentication is required to create an order';
  end if;
  if nullif(btrim(p_reference), '') is null
    or nullif(btrim(p_shipping_full_name), '') is null
    or nullif(btrim(p_shipping_phone), '') is null
    or nullif(btrim(p_shipping_address), '') is null
    or nullif(btrim(p_shipping_city), '') is null
    or nullif(btrim(p_shipping_region), '') is null then
    raise exception 'All payment and shipping fields are required';
  end if;

  select id into v_cart_id
  from public.carts
  where user_id = v_user_id
  for update;
  if v_cart_id is null then
    raise exception 'Your cart is empty';
  end if;

  select delivery_fee into strict v_delivery_fee
  from public.store_settings
  where id = true;

  insert into public.orders (
    id, user_id, subtotal, delivery_fee, total_amount,
    shipping_full_name, shipping_phone, shipping_address, shipping_city,
    shipping_region, payment_method, payment_status, payment_reference
  ) values (
    v_order_id, v_user_id, 0, v_delivery_fee, v_delivery_fee,
    btrim(p_shipping_full_name), btrim(p_shipping_phone),
    btrim(p_shipping_address), btrim(p_shipping_city),
    btrim(p_shipping_region), 'paystack', 'pending', btrim(p_reference)
  ) returning order_number into v_order_number;

  for v_item in
    select ci.product_id, ci.quantity
    from public.cart_items ci
    where ci.cart_id = v_cart_id
    order by ci.created_at
  loop
    select * into v_product
    from public.products
    where id = v_item.product_id and is_active
    for update;
    if not found then
      raise exception 'A product in your cart is unavailable';
    end if;
    if v_item.quantity < 1 or v_product.stock_quantity < v_item.quantity then
      raise exception 'Insufficient stock for product %', v_product.name;
    end if;

    v_unit_price := case
      when v_product.sale_price is not null and v_product.sale_price < v_product.price
        then v_product.sale_price
      else v_product.price
    end;
    insert into public.order_items (
      order_id, product_id, product_name, product_price, quantity, subtotal
    ) values (
      v_order_id, v_product.id, v_product.name, v_unit_price, v_item.quantity,
      v_unit_price * v_item.quantity
    );
    v_subtotal := v_subtotal + v_unit_price * v_item.quantity;
  end loop;

  if v_subtotal <= 0 then
    raise exception 'Your cart is empty';
  end if;

  update public.orders
  set subtotal = v_subtotal, total_amount = v_subtotal + v_delivery_fee
  where id = v_order_id;

  return jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'total_amount', v_subtotal + v_delivery_fee
  );
end;
$$;

create or replace function public.complete_paystack_order(
  p_reference text,
  p_transaction_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  select * into v_order
  from public.orders
  where payment_reference = p_reference
  for update;
  if not found then
    raise exception 'Payment order was not found';
  end if;
  if v_order.payment_status = 'paid' then
    if v_order.payment_transaction_id is distinct from p_transaction_id then
      raise exception 'Payment reference is already linked to a different transaction';
    end if;
    return jsonb_build_object('id', v_order.id, 'order_number', v_order.order_number);
  end if;
  if v_order.payment_status <> 'pending' or v_order.payment_method <> 'paystack' then
    raise exception 'Payment order is no longer pending';
  end if;

  for v_item in
    select product_id, quantity
    from public.order_items
    where order_id = v_order.id and product_id is not null
  loop
    update public.products
    set stock_quantity = stock_quantity - v_item.quantity
    where id = v_item.product_id and stock_quantity >= v_item.quantity;
    if not found then
      raise exception 'Insufficient stock to complete this paid order';
    end if;
  end loop;

  update public.orders
  set payment_status = 'paid',
      payment_transaction_id = p_transaction_id,
      updated_at = now()
  where id = v_order.id;

  delete from public.cart_items ci
  using public.carts c
  where ci.cart_id = c.id
    and c.user_id = v_order.user_id
    and ci.product_id in (
      select oi.product_id
      from public.order_items oi
      where oi.order_id = v_order.id and oi.product_id is not null
    );

  return jsonb_build_object('id', v_order.id, 'order_number', v_order.order_number);
end;
$$;

create or replace function public.fail_paystack_order(p_reference text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.orders
  set payment_status = 'failed', updated_at = now()
  where payment_reference = p_reference
    and payment_method = 'paystack'
    and payment_status = 'pending';
$$;

revoke all on function public.create_paystack_order(text, text, text, text, text, text) from public, anon;
grant execute on function public.create_paystack_order(text, text, text, text, text, text) to authenticated;

revoke all on function public.complete_paystack_order(text, text) from public, anon, authenticated;
grant execute on function public.complete_paystack_order(text, text) to service_role;

revoke all on function public.fail_paystack_order(text) from public, anon, authenticated;
grant execute on function public.fail_paystack_order(text) to service_role;
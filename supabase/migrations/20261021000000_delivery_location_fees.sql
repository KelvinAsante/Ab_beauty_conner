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

  v_delivery_fee := case lower(btrim(p_shipping_city))
    when 'accra' then 40
    when 'tema (1–25)' then 50
    when 'kumasi' then 50
    when 'sunyani' then 60
    when 'tamale' then 70
    else null
  end;
  if v_delivery_fee is null then
    raise exception 'Choose a supported delivery location';
  end if;

  select id into v_cart_id
  from public.carts
  where user_id = v_user_id
  for update;
  if v_cart_id is null then
    raise exception 'Your cart is empty';
  end if;

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

revoke all on function public.create_paystack_order(text, text, text, text, text, text) from public, anon;
grant execute on function public.create_paystack_order(text, text, text, text, text, text) to authenticated;

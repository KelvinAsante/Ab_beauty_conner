-- Use Ghana cedis for existing store settings that still have the original USD default.
alter table public.store_settings
  alter column currency_code set default 'GHS';

update public.store_settings
set currency_code = 'GHS'
where id = true
  and currency_code = 'USD';
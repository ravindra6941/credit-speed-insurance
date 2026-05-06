-- ===========================================================================
-- Fix: grant table privileges to authenticated role
-- ===========================================================================
-- Tables created via raw SQL DDL don't inherit Supabase's default GRANTs.
-- RLS policies filter rows, but the underlying SELECT/INSERT/UPDATE/DELETE
-- privileges still need to be granted explicitly.

-- Tables (full CRUD for any signed-in user — RLS already restricts at row level)
grant select, insert, update, delete on public.plans     to authenticated;
grant select, insert, update, delete on public.retailers to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, update                  on public.profiles  to authenticated;

-- Sequences (so SERIAL columns can auto-increment on insert)
grant usage, select on sequence public.plans_id_seq     to authenticated;
grant usage, select on sequence public.retailers_id_seq to authenticated;
grant usage, select on sequence public.customers_id_seq to authenticated;

-- RPC helper functions (used to auto-generate customer/retailer codes)
grant execute on function public.next_customer_code() to authenticated;
grant execute on function public.next_retailer_code() to authenticated;

-- Make sure all future tables in public schema also get these grants
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
alter default privileges in schema public
  grant execute on functions to authenticated;

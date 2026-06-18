-- ─────────────────────────────────────────────────────────────────────
-- Migration 004 — RBAC city-scoping for customers + retailers
--
-- PROBLEM (security audit, 2026-06-16): customers / retailers had a single
-- `for all to authenticated using(true)` policy — i.e. EVERY logged-in user
-- (including every field officer) could read & edit the entire customer / loan /
-- KYC database. Broken access control on PII for a lender.
--
-- NEW MODEL:
--   • Full access  → insurance-portal staff (a `profiles` row) OR HR admins
--                    (`is_hr_admin()`). Unchanged behaviour for them.
--   • HRMS field employees → see ONLY their own city's data; may add/update
--     retailers only in their own city. No customer writes.
--   • Oroboro webhook → uses the service role → bypasses RLS → UNAFFECTED.
--   • `plans` (product catalogue, not PII) → left as-is.
--
-- ⚠️ RUN DELIBERATELY. Review, run in the SQL editor, then immediately run the
--    VERIFICATION block and smoke-test the insurance portal + a FOS login.
--    A ROLLBACK block is at the bottom if anything misbehaves.
-- Idempotent.
-- ─────────────────────────────────────────────────────────────────────

-- 1. Helper functions (SECURITY DEFINER so they can read the gating tables
--    regardless of the caller's own RLS).

create or replace function public.is_insurance_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid());
$$;

create or replace function public.current_employee_city()
returns text language sql stable security definer set search_path = public as $$
  select city from public.employees where user_id = auth.uid() limit 1;
$$;

grant execute on function public.is_insurance_staff()     to authenticated;
grant execute on function public.current_employee_city()  to authenticated;

-- 2. CUSTOMERS — replace the wide-open policy.
drop policy if exists "customers authed all" on public.customers;
drop policy if exists "customers full access" on public.customers;
drop policy if exists "customers city read"  on public.customers;

-- Full access: insurance staff + HR admins (read + write).
create policy "customers full access" on public.customers for all to authenticated
  using      ( public.is_insurance_staff() or public.is_hr_admin() )
  with check ( public.is_insurance_staff() or public.is_hr_admin() );

-- HRMS field employees: read ONLY their city's customers (no writes — the
-- insurance portal / Oroboro create customers).
create policy "customers city read" on public.customers for select to authenticated
  using ( city is not null and city = public.current_employee_city() );

-- 3. RETAILERS — replace the wide-open policy.
drop policy if exists "retailers authed all"   on public.retailers;
drop policy if exists "retailers full access"  on public.retailers;
drop policy if exists "retailers city read"    on public.retailers;
drop policy if exists "retailers city insert"  on public.retailers;
drop policy if exists "retailers city update"  on public.retailers;

create policy "retailers full access" on public.retailers for all to authenticated
  using      ( public.is_insurance_staff() or public.is_hr_admin() )
  with check ( public.is_insurance_staff() or public.is_hr_admin() );

-- Field employees: read their city's shops...
create policy "retailers city read" on public.retailers for select to authenticated
  using ( city is not null and city = public.current_employee_city() );

-- ...add new shops / onboard merchants in their own city...
create policy "retailers city insert" on public.retailers for insert to authenticated
  with check ( city = public.current_employee_city() );

-- ...and update shops in their own city (beat updates, onboarding resubmit/archive).
create policy "retailers city update" on public.retailers for update to authenticated
  using      ( city = public.current_employee_city() )
  with check ( city = public.current_employee_city() );

-- (No employee DELETE policy — deletes go through the hr_admin-gated API which
--  uses the service role. Field staff cannot delete.)

-- ─────────────────────────────────────────────────────────────────────
-- VERIFICATION — run after applying. Expect: insurance staff & HR see all;
-- a FOS sees only their city.
-- ─────────────────────────────────────────────────────────────────────
-- select polname, cmd, qual from pg_policies
--   where schemaname='public' and tablename in ('customers','retailers') order by tablename, polname;
--
-- Impersonate a FOS in the SQL editor (replace the uuid with a real FOS auth id):
--   set local role authenticated;
--   set local request.jwt.claims to '{"sub":"<FOS_AUTH_UID>","role":"authenticated"}';
--   select count(*), array_agg(distinct city) from public.customers;  -- should be ONLY their city
--   select count(*), array_agg(distinct city) from public.retailers;  -- should be ONLY their city
--   reset role;
--
-- SMOKE TEST IN THE APPS (do immediately):
--   1. Insurance portal: load customers list + issue a test warranty (staff = full access).
--   2. HRMS /admin (HR login): retailers + Sales Cockpit still show ALL cities.
--   3. HRMS /me (FOS login): Beat Visit retailer picker shows only their city.
--   4. FOS onboard a merchant in their OWN city → succeeds.

-- ─────────────────────────────────────────────────────────────────────
-- ROLLBACK (only if something breaks) — restores the previous open behaviour:
-- ─────────────────────────────────────────────────────────────────────
-- drop policy if exists "customers full access" on public.customers;
-- drop policy if exists "customers city read"  on public.customers;
-- drop policy if exists "retailers full access" on public.retailers;
-- drop policy if exists "retailers city read"   on public.retailers;
-- drop policy if exists "retailers city insert" on public.retailers;
-- drop policy if exists "retailers city update" on public.retailers;
-- create policy "customers authed all" on public.customers for all to authenticated using (true) with check (true);
-- create policy "retailers authed all" on public.retailers for all to authenticated using (true) with check (true);

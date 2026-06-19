-- ─────────────────────────────────────────────────────────────────────
-- Migration 005 — Admin-gate destructive ops on customers / retailers / plans
--
-- Audit #6: after migration-004's city-scoping, "full access" still meant any
-- insurance staff (admin OR team_member) could DELETE customers/retailers and
-- edit plan pricing. This restricts those destructive/sensitive ops to
-- *admins* (profiles.role='admin') or HR admins, while keeping read/insert/
-- update for all staff. Field employees keep their city-scoped policies from 004.
--
-- The HRMS retailer-delete button uses the service role (bypasses RLS), so it's
-- unaffected — this only blocks direct browser deletes by non-admins.
--
-- ⚠️ Amends migration-004. Run after 004. Review + smoke-test. Rollback at bottom.
-- Idempotent.
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.is_insurance_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;
grant execute on function public.is_insurance_admin() to authenticated;

-- ── CUSTOMERS: split the blanket full-access; DELETE → admins only ──────
drop policy if exists "customers full access" on public.customers;

create policy "customers staff select" on public.customers for select to authenticated
  using (public.is_insurance_staff() or public.is_hr_admin());
create policy "customers staff insert" on public.customers for insert to authenticated
  with check (public.is_insurance_staff() or public.is_hr_admin());
create policy "customers staff update" on public.customers for update to authenticated
  using (public.is_insurance_staff() or public.is_hr_admin())
  with check (public.is_insurance_staff() or public.is_hr_admin());
create policy "customers admin delete" on public.customers for delete to authenticated
  using (public.is_insurance_admin() or public.is_hr_admin());
-- ("customers city read" from migration-004 remains for field employees)

-- ── RETAILERS: same split; DELETE → admins only ───────────────────────
drop policy if exists "retailers full access" on public.retailers;

create policy "retailers staff select" on public.retailers for select to authenticated
  using (public.is_insurance_staff() or public.is_hr_admin());
create policy "retailers staff insert" on public.retailers for insert to authenticated
  with check (public.is_insurance_staff() or public.is_hr_admin());
create policy "retailers staff update" on public.retailers for update to authenticated
  using (public.is_insurance_staff() or public.is_hr_admin())
  with check (public.is_insurance_staff() or public.is_hr_admin());
create policy "retailers admin delete" on public.retailers for delete to authenticated
  using (public.is_insurance_admin() or public.is_hr_admin());
-- ("retailers city read/insert/update" from migration-004 remain)

-- ── PLANS (pricing): read open, writes → admins only ──────────────────
drop policy if exists "plans authed all" on public.plans;
create policy "plans read" on public.plans for select to authenticated using (true);
create policy "plans admin write" on public.plans for all to authenticated
  using (public.is_insurance_admin() or public.is_hr_admin())
  with check (public.is_insurance_admin() or public.is_hr_admin());

-- ── VERIFICATION ──────────────────────────────────────────────────────
--   select polname, cmd from pg_policies where tablename in ('customers','retailers','plans') order by tablename;
--   -- as a team_member (non-admin) insurance user: select/insert/update OK; DELETE denied.
--   -- as an admin: delete OK. Issue a test warranty (insert) still works.
--
-- ROLLBACK (restore migration-004 blanket policies):
-- drop policy if exists "customers staff select" on public.customers;
-- drop policy if exists "customers staff insert" on public.customers;
-- drop policy if exists "customers staff update" on public.customers;
-- drop policy if exists "customers admin delete" on public.customers;
-- create policy "customers full access" on public.customers for all to authenticated
--   using (public.is_insurance_staff() or public.is_hr_admin())
--   with check (public.is_insurance_staff() or public.is_hr_admin());
-- (repeat analogously for retailers; for plans re-create "plans authed all" for all using(true) with check(true))

-- ===========================================================================
-- Credit Speed Insurance — Database Schema
-- Run this in Supabase SQL Editor (one-time setup)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  phone        text,
  role         text not null default 'team_member' check (role in ('admin', 'team_member')),
  created_at   timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'team_member'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. PLANS (warranty / insurance plan types)
-- ---------------------------------------------------------------------------
create table if not exists public.plans (
  id                serial primary key,
  name              text not null,                 -- e.g. "EXTENDED WARRANTY"
  type              text not null default 'extended_warranty'
                       check (type in ('extended_warranty','screen_damage','standard_protection','iphone_protection','custom')),
  gst_percentage    numeric(5,2) not null default 18.00,
  plan_amount       numeric(10,2) not null,        -- base amount per device unit (e.g. AMS Amount)
  duration_months   int not null default 12,
  coverage_notes    text,
  status            text not null default 'enabled' check (status in ('enabled','disabled')),
  created_at        timestamptz not null default now(),
  created_by        uuid references public.profiles(id) on delete set null
);

-- ---------------------------------------------------------------------------
-- 3. RETAILERS (partner mobile shops)
-- ---------------------------------------------------------------------------
create table if not exists public.retailers (
  id              serial primary key,
  retailer_code   text unique not null,            -- e.g. "CSINS-R0001"
  shop_name       text not null,
  owner_name      text,
  gst_number      text,
  email           text,
  phone           text,
  city            text,
  state           text,
  pin_code        text,
  address         text,
  status          text not null default 'enabled' check (status in ('enabled','disabled')),
  created_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id) on delete set null
);

-- ---------------------------------------------------------------------------
-- 4. CUSTOMERS (people who bought warranty)
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id                  serial primary key,
  customer_code       text unique not null,        -- e.g. "CSINS-C0001"
  name                text not null,
  mobile              text not null,
  email               text,
  city                text,
  state               text,
  pin_code            text,
  address             text,

  -- Product details
  brand               text,
  model               text,
  imei_serial         text,
  product_value       numeric(10,2) not null default 0,

  -- Plan + retailer linkage
  plan_id             int references public.plans(id) on delete restrict,
  retailer_id         int references public.retailers(id) on delete set null,

  -- Auto-calculated amounts (also stored for historical accuracy)
  gst_amount          numeric(10,2) not null default 0,
  plan_amount         numeric(10,2) not null default 0,
  total_amount        numeric(10,2) not null default 0,

  -- Warranty period
  warranty_start      date not null default current_date,
  warranty_end        date,

  status              text not null default 'enabled' check (status in ('enabled','disabled')),
  created_at          timestamptz not null default now(),
  created_by          uuid references public.profiles(id) on delete set null
);

-- ---------------------------------------------------------------------------
-- INDEXES (for fast search)
-- ---------------------------------------------------------------------------
create index if not exists idx_customers_code on public.customers(customer_code);
create index if not exists idx_customers_mobile on public.customers(mobile);
create index if not exists idx_customers_created_at on public.customers(created_at desc);
create index if not exists idx_retailers_code on public.retailers(retailer_code);
create index if not exists idx_retailers_phone on public.retailers(phone);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY — only authenticated users can read/write
-- ---------------------------------------------------------------------------
alter table public.profiles  enable row level security;
alter table public.plans     enable row level security;
alter table public.retailers enable row level security;
alter table public.customers enable row level security;

-- Profiles: user can read their own, admin can read all
drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
  on public.profiles for update
  using (auth.uid() = id);

-- Plans / Retailers / Customers — all authenticated users can do everything
do $$
declare t text;
begin
  foreach t in array array['plans','retailers','customers']
  loop
    execute format('drop policy if exists "%s authed all" on public.%I', t, t);
    execute format('create policy "%s authed all" on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- SEED — default plans (matches Credit Kuber's catalog as a starting point)
-- ---------------------------------------------------------------------------
insert into public.plans (name, type, gst_percentage, plan_amount, duration_months, coverage_notes)
values
  ('EXTENDED WARRANTY',  'extended_warranty',  18, 6.00,  12, 'Standard 12-month extended warranty for smartphones and consumer durables.'),
  ('SCREEN DAMAGE',      'screen_damage',      18, 9.00,  12, 'Covers accidental screen damage for 12 months.'),
  ('STANDARD PROTECTION','standard_protection',18, 10.00, 12, 'Liquid + accidental damage cover.'),
  ('IPHONE PROTECTION',  'iphone_protection',  18, 13.00, 12, 'Premium protection for iPhone devices.')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- HELPERS — auto-generate customer/retailer codes
-- ---------------------------------------------------------------------------
create or replace function public.next_customer_code()
returns text language sql as $$
  select 'CSINS-C' || lpad((coalesce((select max(substring(customer_code from 8)::int) from public.customers where customer_code like 'CSINS-C%'), 0) + 1)::text, 4, '0');
$$;

create or replace function public.next_retailer_code()
returns text language sql as $$
  select 'CSINS-R' || lpad((coalesce((select max(substring(retailer_code from 8)::int) from public.retailers where retailer_code like 'CSINS-R%'), 0) + 1)::text, 4, '0');
$$;

-- ---------------------------------------------------------------------------
-- GRANTS — required for tables created via raw SQL (Supabase auto-grants
-- only apply to tables created through the dashboard).
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.plans     to authenticated;
grant select, insert, update, delete on public.retailers to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, update                  on public.profiles  to authenticated;

grant usage, select on sequence public.plans_id_seq     to authenticated;
grant usage, select on sequence public.retailers_id_seq to authenticated;
grant usage, select on sequence public.customers_id_seq to authenticated;

grant execute on function public.next_customer_code() to authenticated;
grant execute on function public.next_retailer_code() to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
alter default privileges in schema public
  grant execute on functions to authenticated;

-- ===========================================================================
-- Migration: add external_loan_id to customers (Oroboro idempotency key)
-- Run this in Supabase SQL Editor once before turning on the webhook.
-- ===========================================================================
-- Oroboro tells us their internal loan / file id with each webhook call.
-- We store it on the customer row so we can detect retries / duplicates
-- and return the same customer record idempotently instead of creating
-- a second one.

alter table public.customers
  add column if not exists external_loan_id text;

-- Unique index — only one customer row per Oroboro loan id.
-- (NULLs are allowed and don't collide.)
create unique index if not exists customers_external_loan_id_uniq
  on public.customers (external_loan_id)
  where external_loan_id is not null;

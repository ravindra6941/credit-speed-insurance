-- ===========================================================================
-- Migration: add IMEI 2 column to customers
-- Run this in Supabase SQL Editor (one-time)
-- ===========================================================================
-- Adds a second IMEI/Serial column for dual-SIM smartphones, where IMEI 1
-- and IMEI 2 are both stamped on the device. Existing rows get NULL by
-- default — they're back-fillable later if needed.

alter table public.customers
  add column if not exists imei2_serial text;

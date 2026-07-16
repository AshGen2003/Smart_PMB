-- Run this once, before Django's `migrate` creates its own versions of these
-- tables. Safe: only seed/reference data exists so far, no real signups.

drop table if exists public.notifications cascade;
drop table if exists public.price_records cascade;
drop table if exists public.payments cascade;
drop table if exists public.harvests cascade;
drop table if exists public.paddy_types cascade;
drop table if exists public.farmers cascade;
drop table if exists public.districts cascade;
drop table if exists public.provinces cascade;
drop table if exists public.users cascade;

drop function if exists public.current_user_role();

drop type if exists public.payment_method;
drop type if exists public.payment_status;
drop type if exists public.harvest_status;
drop type if exists public.farmer_status;
drop type if exists public.user_role;

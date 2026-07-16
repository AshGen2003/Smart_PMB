-- =====================================================================
-- Smart PMB — Farmer onboarding schema
-- Run this whole script once in the Supabase SQL Editor.
-- Assumes public.users(id uuid, role public.user_role, ...) already exists.
-- =====================================================================

-- =====================
-- ENUMS
-- =====================
create type public.farmer_status as enum ('active', 'inactive', 'suspended');
create type public.harvest_status as enum ('pending', 'verified', 'collected', 'rejected');
create type public.payment_status as enum ('pending', 'completed', 'failed');
create type public.payment_method as enum ('bank_transfer', 'cash', 'cheque');

-- =====================
-- PROVINCES / DISTRICTS (reference data, Sri Lanka)
-- =====================
create table public.provinces (
    province_id   serial       primary key,
    name          varchar(50)  not null unique
);

create table public.districts (
    district_id   serial       primary key,
    name          varchar(50)  not null,
    province_id   int          not null references public.provinces(province_id),
    unique (name, province_id)
);

insert into public.provinces (name) values
    ('Western'), ('Central'), ('Southern'), ('Northern'), ('Eastern'),
    ('North Western'), ('North Central'), ('Uva'), ('Sabaragamuwa');

insert into public.districts (name, province_id)
select d.name, p.province_id
from (values
    ('Colombo', 'Western'), ('Gampaha', 'Western'), ('Kalutara', 'Western'),
    ('Kandy', 'Central'), ('Matale', 'Central'), ('Nuwara Eliya', 'Central'),
    ('Galle', 'Southern'), ('Matara', 'Southern'), ('Hambantota', 'Southern'),
    ('Jaffna', 'Northern'), ('Kilinochchi', 'Northern'), ('Mannar', 'Northern'),
    ('Vavuniya', 'Northern'), ('Mullaitivu', 'Northern'),
    ('Ampara', 'Eastern'), ('Batticaloa', 'Eastern'), ('Trincomalee', 'Eastern'),
    ('Kurunegala', 'North Western'), ('Puttalam', 'North Western'),
    ('Anuradhapura', 'North Central'), ('Polonnaruwa', 'North Central'),
    ('Badulla', 'Uva'), ('Monaragala', 'Uva'),
    ('Ratnapura', 'Sabaragamuwa'), ('Kegalle', 'Sabaragamuwa')
) as d(name, province_name)
join public.provinces p on p.name = d.province_name;

-- =====================
-- FARMER TABLE
-- (user_id adapted to uuid -> public.users(id), since users is tied to Supabase Auth)
-- =====================
create table public.farmers (
    farmer_id           serial          primary key,
    user_id             uuid            not null unique references public.users(id) on delete cascade,
    registration_no     varchar(50)     not null unique,
    name                varchar(100)    not null,
    nic                 varchar(20)     not null unique,
    location            varchar(255),
    district_id         int             references public.districts(district_id),
    province_id         int             references public.provinces(province_id),
    land_size           decimal(10,2),
    contact_number      varchar(20),
    bank_account        varchar(50),
    bank_name           varchar(100),
    registered_date     date            not null default current_date,
    status              farmer_status   not null default 'active'
);

-- =====================
-- PADDY TYPE TABLE
-- =====================
create table public.paddy_types (
    paddy_type_id       serial          primary key,
    type_name           varchar(100)    not null unique,
    variety             varchar(100),
    description         text,
    guaranteed_price    decimal(10,2)   not null,
    is_active           boolean         not null default true
);

-- =====================
-- HARVEST TABLE
-- =====================
create table public.harvests (
    harvest_id          serial          primary key,
    farmer_id           int             not null references public.farmers(farmer_id) on delete cascade,
    paddy_type_id       int             references public.paddy_types(paddy_type_id),
    quantity_kg         decimal(10,2)   not null,
    harvest_date        date            not null default current_date,
    status              harvest_status  not null default 'pending'
);

-- =====================
-- PAYMENT TABLE
-- =====================
create table public.payments (
    payment_id          serial          primary key,
    harvest_id          int             not null references public.harvests(harvest_id),
    farmer_id           int             not null references public.farmers(farmer_id),
    amount              decimal(10,2)   not null,
    status              payment_status  not null default 'pending',
    payment_date        date,
    method              payment_method  not null default 'bank_transfer'
);

-- =====================
-- PRICE RECORD TABLE
-- =====================
create table public.price_records (
    price_id            serial          primary key,
    paddy_type_id       int             references public.paddy_types(paddy_type_id),
    guaranteed_price    decimal(10,2)   not null,
    effective_date      date            not null default current_date
);

-- =====================
-- NOTIFICATION TABLE
-- =====================
create table public.notifications (
    notification_id     serial          primary key,
    farmer_id           int             not null references public.farmers(farmer_id) on delete cascade,
    message              text            not null,
    sent_at             timestamp       not null default current_timestamp,
    is_read              boolean         not null default false
);

-- =====================================================================
-- RLS
-- =====================================================================

-- Helper: caller's role, without recursive RLS on public.users
create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- FARMERS
alter table public.farmers enable row level security;

create policy "farmers_select_own" on public.farmers
for select using (user_id = auth.uid());

create policy "farmers_select_staff" on public.farmers
for select using (public.current_user_role() in ('admin', 'moderator', 'pmb_officer'));

create policy "farmers_insert_own" on public.farmers
for insert with check (user_id = auth.uid());

create policy "farmers_update_own" on public.farmers
for update using (user_id = auth.uid());

-- HARVESTS
alter table public.harvests enable row level security;

create policy "harvests_select_own" on public.harvests
for select using (
    farmer_id in (select farmer_id from public.farmers where user_id = auth.uid())
);

create policy "harvests_select_staff" on public.harvests
for select using (public.current_user_role() in ('admin', 'moderator', 'pmb_officer'));

-- PAYMENTS
alter table public.payments enable row level security;

create policy "payments_select_own" on public.payments
for select using (
    farmer_id in (select farmer_id from public.farmers where user_id = auth.uid())
);

create policy "payments_select_staff" on public.payments
for select using (public.current_user_role() in ('admin', 'moderator', 'pmb_officer'));

-- NOTIFICATIONS
alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
for select using (
    farmer_id in (select farmer_id from public.farmers where user_id = auth.uid())
);

create policy "notifications_update_own" on public.notifications
for update using (
    farmer_id in (select farmer_id from public.farmers where user_id = auth.uid())
) with check (
    farmer_id in (select farmer_id from public.farmers where user_id = auth.uid())
);

create policy "notifications_select_staff" on public.notifications
for select using (public.current_user_role() in ('admin', 'moderator', 'pmb_officer'));

-- REFERENCE DATA — readable by any signed-in user, writes left to service role
alter table public.provinces enable row level security;
alter table public.districts enable row level security;
alter table public.paddy_types enable row level security;
alter table public.price_records enable row level security;

-- provinces/districts are readable even signed-out, since the farmer
-- signup form's district picker renders before an account exists
create policy "provinces_select_public" on public.provinces for select using (true);
create policy "districts_select_public" on public.districts for select using (true);

create policy "paddy_types_select_authenticated" on public.paddy_types for select to authenticated using (true);
create policy "price_records_select_authenticated" on public.price_records for select to authenticated using (true);

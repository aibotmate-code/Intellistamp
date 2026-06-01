-- IntelliStamp Database Schema
-- Run this entire script in: Supabase Dashboard → SQL Editor → New Query

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- BUSINESSES
create table if not exists businesses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  emoji text not null default '🏪',
  category text not null,
  stamps_required integer not null default 8,
  reward text not null,
  staff_pin text not null,
  gmb_link text,
  dynamic_qr_enabled boolean not null default true,
  staff_pin_enabled boolean not null default false,
  whatsapp_enabled boolean not null default false,
  plan text not null default 'free',
  owner_phone text,
  created_at timestamptz not null default now()
);

-- CUSTOMERS
create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  phone text unique not null,
  name text,
  birthday_month text,
  birthday_day integer,
  whatsapp_optin boolean not null default true,
  created_at timestamptz not null default now()
);

-- BUSINESS_CUSTOMERS (junction)
create table if not exists business_customers (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  review_claimed boolean not null default false,
  cards_redeemed integer not null default 0,
  enrolled_at timestamptz not null default now(),
  unique(business_id, customer_id)
);

-- STAMPS
create table if not exists stamps (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  type text not null default 'regular',
  stamped_at timestamptz not null default now()
);

create index if not exists stamps_customer_business_idx on stamps(customer_id, business_id);
create index if not exists stamps_stamped_at_idx on stamps(stamped_at desc);

-- CAMPAIGNS
create table if not exists campaigns (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  message text not null,
  audience text not null default 'all',
  sent_at timestamptz not null default now(),
  total_sent integer not null default 0,
  delivered integer not null default 0
);

-- OTP STORE
create table if not exists otp_store (
  id uuid primary key default uuid_generate_v4(),
  phone text not null,
  otp text not null,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  used boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table businesses enable row level security;
alter table customers enable row level security;
alter table stamps enable row level security;
alter table business_customers enable row level security;
alter table campaigns enable row level security;
alter table otp_store enable row level security;

-- RLS Policies (allow all for now)
do $$ begin
  if not exists (select 1 from pg_policies where tablename='businesses' and policyname='Allow all') then
    create policy "Allow all" on businesses for all using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='customers' and policyname='Allow all') then
    create policy "Allow all" on customers for all using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='stamps' and policyname='Allow all') then
    create policy "Allow all" on stamps for all using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='business_customers' and policyname='Allow all') then
    create policy "Allow all" on business_customers for all using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='campaigns' and policyname='Allow all') then
    create policy "Allow all" on campaigns for all using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='otp_store' and policyname='Allow all') then
    create policy "Allow all" on otp_store for all using (true);
  end if;
end $$;

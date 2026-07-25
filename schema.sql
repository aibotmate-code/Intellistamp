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
  slug text not null default '' unique,
  conflict_priority text not null default 'stamp',
  owner_id uuid references auth.users(id),
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
  customer_token uuid not null default uuid_generate_v4() unique,
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
  stamped_at timestamptz not null default now(),
  stamp_token text
);

create index if not exists businesses_owner_idx on businesses(owner_id);
create index if not exists stamps_customer_business_idx on stamps(customer_id, business_id);
create index if not exists stamps_stamped_at_idx on stamps(stamped_at desc);
-- Partial unique index: same customer cannot use the same QR token twice (replay protection)
create unique index if not exists stamps_token_dedup_idx
  on stamps(business_id, customer_id, stamp_token)
  where stamp_token is not null;

-- Migration for existing deployments (idempotent):
alter table stamps add column if not exists stamp_token text;
create unique index if not exists stamps_token_dedup_idx
  on stamps(business_id, customer_id, stamp_token)
  where stamp_token is not null;

-- MILESTONES
create table if not exists milestones (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  visit_number integer not null,
  badge text not null,
  reward text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists milestones_business_id_idx on milestones(business_id);

-- MILESTONE_CLAIMS
create table if not exists milestone_claims (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  milestone_id uuid not null references milestones(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  unique(customer_id, milestone_id)
);

create index if not exists milestone_claims_customer_milestone_idx on milestone_claims(customer_id, milestone_id);

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

-- BUSINESS BRANDING
create table if not exists business_branding (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references businesses(id) on delete cascade,
  logo_path text,
  primary_color text not null default '#D4AF37',
  primary_dark_color text not null default '#D4AF37',
  primary_light_color text not null default '#D4AF37',
  secondary_color text,
  accent_color text,
  background_color text,
  surface_color text,
  text_on_primary text not null default '#000000',
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
alter table milestones enable row level security;
alter table milestone_claims enable row level security;
alter table business_branding enable row level security;

-- Table-level grants — required even with RLS policies
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;

-- RLS Policies — service role key bypasses these; anon key blocked by default
do $$ begin
  -- Businesses: owner-only access via anon key (service role always bypasses)
  if exists (select 1 from pg_policies where tablename='businesses' and policyname='Allow all') then
    drop policy "Allow all" on businesses;
  end if;
  if not exists (select 1 from pg_policies where tablename='businesses' and policyname='Owner access only') then
    create policy "Owner access only" on businesses for all using (owner_id = auth.uid());
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
  if not exists (select 1 from pg_policies where tablename='milestones' and policyname='Allow all') then
    create policy "Allow all" on milestones for all using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='milestone_claims' and policyname='Allow all') then
    create policy "Allow all" on milestone_claims for all using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='business_branding' and policyname='Allow public read access') then
    create policy "Allow public read access" on business_branding for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='business_branding' and policyname='Allow owner all access') then
    create policy "Allow owner all access" on business_branding for all using (
      exists (select 1 from businesses where id = business_branding.business_id and owner_id = auth.uid())
    );
  end if;
end $$;

grant all on public.business_branding to anon, authenticated, service_role;

-- STORAGE: branding bucket (public, 2 MB limit, images only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Allow public bucket read') then
    create policy "Allow public bucket read" on storage.objects for select using (bucket_id = 'branding');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Allow service role bucket write') then
    create policy "Allow service role bucket write" on storage.objects for insert with check (bucket_id = 'branding');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Allow service role bucket delete') then
    create policy "Allow service role bucket delete" on storage.objects for delete using (bucket_id = 'branding');
  end if;
end $$;

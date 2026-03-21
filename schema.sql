create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  house_id text not null,
  name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  house_id text not null,
  tenant_id uuid references public.tenants(id) on delete set null,
  tenant_name text not null,
  email text,
  phone text,
  slot_date date not null,
  slot_label text not null,
  channel text not null check (channel in ('email', 'sms')),
  note text,
  status text not null default 'booked' check (status in ('booked', 'done')),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create unique index if not exists bookings_house_slot_unique
  on public.bookings (house_id, slot_date, slot_label);

alter table public.tenants enable row level security;
alter table public.bookings enable row level security;

create policy "public read tenants" on public.tenants for select using (true);
create policy "public insert tenants" on public.tenants for insert with check (true);
create policy "public delete tenants" on public.tenants for delete using (true);

create policy "public read bookings" on public.bookings for select using (true);
create policy "public insert bookings" on public.bookings for insert with check (true);
create policy "public delete bookings" on public.bookings for delete using (true);

-- Updates are handled server-side in the Next.js API route using the service role key.

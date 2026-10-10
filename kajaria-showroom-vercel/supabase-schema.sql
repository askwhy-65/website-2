-- Run this SQL once in Supabase Dashboard -> SQL Editor.
-- Enquiries are private; the website serverless functions use the service-role key.

create extension if not exists pgcrypto;

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  email text not null default '',
  interest text not null default '',
  message text not null,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'closed'))
);

create index if not exists enquiries_created_at_idx
  on public.enquiries (created_at desc);

alter table public.enquiries enable row level security;

-- Do not create public/anon policies for this table.
-- Keep SUPABASE_SERVICE_ROLE_KEY in Vercel server-side environment variables only.

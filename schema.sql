-- ============================================================
--  LuaHub — Supabase Schema
--  Paste this entire file into the Supabase SQL Editor and Run
-- ============================================================

-- users table
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  username      text unique not null,
  email         text unique not null,
  password_hash text not null,
  api_key       text unique default encode(gen_random_bytes(24), 'hex'),
  created_at    timestamp with time zone default now()
);

-- scripts table
create table if not exists scripts (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references users(id) on delete cascade,
  name        text not null,
  description text,
  slug        text unique not null,
  content_enc text not null,
  is_public   boolean default true,
  version     int default 1,
  hits        int default 0,
  created_at  timestamp with time zone default now(),
  updated_at  timestamp with time zone default now()
);

-- optional: key whitelist per script
create table if not exists whitelist (
  id        uuid primary key default gen_random_uuid(),
  script_id uuid references scripts(id) on delete cascade,
  key       text unique not null,
  label     text,
  created_at timestamp with time zone default now()
);

-- Row Level Security
alter table users    enable row level security;
alter table scripts  enable row level security;
alter table whitelist enable row level security;

-- Public can read public scripts
create policy "public scripts readable" on scripts
  for select using (is_public = true);

-- Owner has full access to their scripts
create policy "owner full access scripts" on scripts
  for all using (true);

-- Full access to users (service key bypasses RLS anyway)
create policy "service full access users" on users
  for all using (true);

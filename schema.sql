create extension if not exists pgcrypto;
create table users(
  id uuid primary key default gen_random_uuid(),
  username text unique not null check (username ~ '^[a-z0-9_]{3,24}$'),
  pw_hash text not null,
  recovery_hash text unique not null,
  created_at timestamptz default now());
create table sessions(
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null);
create table files(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null, mime text not null, size bigint default 0,
  object_key text unique not null,
  status text not null default 'pending',
  created_at timestamptz default now());
create index on files(user_id, created_at desc);
create table rate(key text primary key, n int not null, ts timestamptz not null);

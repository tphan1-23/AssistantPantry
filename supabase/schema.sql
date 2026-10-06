-- PantryAssistant Supabase schema.
--
-- Run this once in your Supabase project's SQL Editor (Dashboard -> SQL
-- Editor -> New query -> paste -> Run). Safe to re-run: everything is
-- IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.
--
-- Each row is scoped to the signed-in user via Row Level Security - every
-- policy below checks auth.uid() = user_id, and user_id defaults to
-- auth.uid() on insert, so the app never has to pass it explicitly.

create table if not exists pantry_items (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  quantity integer not null default 1,
  unit text not null default 'item',
  date_added_timestamp bigint not null,
  expiry_timestamp bigint not null,
  is_consumed boolean not null default false,
  removed_at_timestamp bigint,
  removed_reason text
);

create table if not exists favorite_recipes (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  urgent_ingredients_used jsonb not null,
  additional_ingredients jsonb not null,
  instructions jsonb not null,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

alter table pantry_items enable row level security;
alter table favorite_recipes enable row level security;

drop policy if exists "pantry_items: owner full access" on pantry_items;
create policy "pantry_items: owner full access" on pantry_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "favorite_recipes: owner full access" on favorite_recipes;
create policy "favorite_recipes: owner full access" on favorite_recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Postgres has no "column = column + ?" shorthand through PostgREST's
-- .update(), so incrementQuantity (merging a duplicate scan into an
-- existing item's count) goes through this instead. SECURITY INVOKER (the
-- default) keeps it subject to the same RLS policy as any other update.
create or replace function increment_item_quantity(p_id bigint, p_amount integer)
returns void
language sql
as $$
  update pantry_items set quantity = quantity + p_amount where id = p_id;
$$;

-- Profile photos. Username/avatar_url themselves live in each user's own
-- auth.users.user_metadata (set via supabase.auth.updateUser), not a
-- separate table - there's nothing relational about them that would need
-- one. This bucket just holds the actual uploaded image files, one per
-- user at "<user_id>/avatar.jpg", public so avatar_url can be a plain URL.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars: public read" on storage.objects;
create policy "avatars: public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars: owner write" on storage.objects;
create policy "avatars: owner write" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars: owner update" on storage.objects;
create policy "avatars: owner update" on storage.objects
  for update using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars: owner delete" on storage.objects;
create policy "avatars: owner delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

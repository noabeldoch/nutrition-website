-- Production schema for Supabase/PostgreSQL
create extension if not exists pgcrypto;

create table if not exists foods (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_id text,
  name_he text not null,
  name_en text,
  kcal_per_100g numeric not null default 0,
  protein_per_100g numeric not null default 0,
  carbs_per_100g numeric not null default 0,
  fat_per_100g numeric not null default 0,
  fiber_per_100g numeric,
  sugar_per_100g numeric,
  saturated_fat_per_100g numeric,
  sodium_mg_per_100g numeric,
  raw_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source, source_id)
);

create index if not exists foods_name_he_idx on foods using gin (to_tsvector('simple', name_he));

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  final_weight_g numeric not null check (final_weight_g > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  food_id uuid references foods(id),
  nested_recipe_id uuid references recipes(id),
  quantity_g numeric not null check (quantity_g > 0),
  check ((food_id is not null) <> (nested_recipe_id is not null))
);

create index if not exists recipe_ingredients_recipe_idx on recipe_ingredients(recipe_id);

create table if not exists diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  eaten_at timestamptz not null default now(),
  food_id uuid references foods(id),
  recipe_id uuid references recipes(id),
  quantity_g numeric not null check (quantity_g > 0),
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  fiber_g numeric,
  created_at timestamptz not null default now(),
  check ((food_id is not null) <> (recipe_id is not null))
);

create index if not exists diary_entries_user_date_idx on diary_entries(user_id, eaten_at desc);

create table if not exists weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null default now(),
  weight_kg numeric not null check (weight_kg > 0)
);

alter table foods enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table diary_entries enable row level security;
alter table weight_entries enable row level security;

create policy "foods are readable" on foods for select to authenticated using (true);
create policy "users manage own recipes" on recipes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage ingredients of own recipes" on recipe_ingredients for all to authenticated using (exists (select 1 from recipes r where r.id=recipe_id and r.user_id=auth.uid())) with check (exists (select 1 from recipes r where r.id=recipe_id and r.user_id=auth.uid()));
create policy "users manage own diary" on diary_entries for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own weight" on weight_entries for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

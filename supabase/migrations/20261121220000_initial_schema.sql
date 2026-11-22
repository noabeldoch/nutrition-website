-- Initial schema for the Nutrition Coach PWA.
-- Safe to apply more than once. Anonymous Supabase users are represented by
-- rows in auth.users and receive the authenticated database role.

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'openfoodfacts',
  source_id text,
  name_he text not null,
  name_en text,
  kcal_per_100g numeric(10, 3) not null default 0,
  protein_per_100g numeric(10, 3) not null default 0,
  carbs_per_100g numeric(10, 3) not null default 0,
  fat_per_100g numeric(10, 3) not null default 0,
  fiber_per_100g numeric(10, 3),
  sugar_per_100g numeric(10, 3),
  raw_data jsonb,
  updated_at timestamptz not null default now(),
  constraint foods_source_source_id_key unique (source, source_id)
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  final_weight_g numeric(10, 2) not null check (final_weight_g > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  food_id uuid not null references public.foods(id),
  quantity_g numeric(10, 2) not null check (quantity_g > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  eaten_at timestamptz not null,
  food_id uuid references public.foods(id),
  recipe_id uuid references public.recipes(id) on delete set null,
  quantity_g numeric(10, 2) not null check (quantity_g > 0),
  calories numeric(10, 3) not null default 0,
  protein_g numeric(10, 3) not null default 0,
  carbs_g numeric(10, 3) not null default 0,
  fat_g numeric(10, 3) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null,
  weight_kg numeric(6, 2) not null check (weight_kg > 0),
  created_at timestamptz not null default now()
);

create index if not exists recipes_user_created_idx
  on public.recipes (user_id, created_at desc);
create index if not exists diary_entries_user_eaten_idx
  on public.diary_entries (user_id, eaten_at desc);
create index if not exists weight_entries_user_measured_idx
  on public.weight_entries (user_id, measured_at desc);
create index if not exists recipe_ingredients_recipe_idx
  on public.recipe_ingredients (recipe_id);

alter table public.foods enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.diary_entries enable row level security;
alter table public.weight_entries enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update on public.foods to authenticated;
grant select, insert, update, delete on public.recipes to authenticated;
grant select, insert, update, delete on public.recipe_ingredients to authenticated;
grant select, insert, update, delete on public.diary_entries to authenticated;
grant select, insert, update, delete on public.weight_entries to authenticated;

drop policy if exists "Authenticated users can read foods" on public.foods;
create policy "Authenticated users can read foods"
  on public.foods for select to authenticated using (true);
drop policy if exists "Authenticated users can add foods" on public.foods;
create policy "Authenticated users can add foods"
  on public.foods for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update foods" on public.foods;
create policy "Authenticated users can update foods"
  on public.foods for update to authenticated using (true) with check (true);

drop policy if exists "Users manage their own recipes" on public.recipes;
create policy "Users manage their own recipes"
  on public.recipes for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users manage ingredients of their recipes" on public.recipe_ingredients;
create policy "Users manage ingredients of their recipes"
  on public.recipe_ingredients for all to authenticated
  using (exists (
    select 1 from public.recipes r
    where r.id = recipe_ingredients.recipe_id
      and r.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.recipes r
    where r.id = recipe_ingredients.recipe_id
      and r.user_id = (select auth.uid())
  ));

drop policy if exists "Users manage their own diary entries" on public.diary_entries;
create policy "Users manage their own diary entries"
  on public.diary_entries for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users manage their own weight entries" on public.weight_entries;
create policy "Users manage their own weight entries"
  on public.weight_entries for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

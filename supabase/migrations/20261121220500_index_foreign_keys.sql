create index if not exists diary_entries_food_id_idx on public.diary_entries(food_id);
create index if not exists diary_entries_recipe_id_idx on public.diary_entries(recipe_id);
create index if not exists recipe_ingredients_food_id_idx on public.recipe_ingredients(food_id);
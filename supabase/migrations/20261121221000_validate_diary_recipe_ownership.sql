drop policy if exists "Users manage their own diary entries" on public.diary_entries;
create policy "Users manage their own diary entries"
on public.diary_entries for all to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and (
    recipe_id is null
    or exists (
      select 1 from public.recipes r
      where r.id = diary_entries.recipe_id
        and r.user_id = (select auth.uid())
    )
  )
);
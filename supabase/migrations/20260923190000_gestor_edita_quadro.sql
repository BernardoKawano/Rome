-- O gestor edita o quadro do talento (arrastar, alterar e excluir cartões).

drop policy if exists boards_insert on public.boards;
drop policy if exists boards_update on public.boards;

create policy boards_insert on public.boards
  for insert to authenticated
  with check (talent_id = (select auth.uid()) or private.is_gestor());

create policy boards_update on public.boards
  for update to authenticated
  using (talent_id = (select auth.uid()) or private.is_gestor())
  with check (talent_id = (select auth.uid()) or private.is_gestor());

-- Quadro compartilhado: talento vê só o próprio; gestor vê todos.
-- O papel fica em public.profiles. Não usar user_metadata no JWT para autorizar.

create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null,
  role text not null check (role in ('gestor', 'talento')),
  company text,
  created_at timestamptz not null default now()
);

create table public.boards (
  talent_id uuid primary key references public.profiles (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  talent_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_role text not null check (author_role in ('gestor', 'talento')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  talent_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  starts_at timestamptz not null,
  link text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.weekly_reports (
  talent_id uuid not null references public.profiles (id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  narrative text not null default '',
  snapshot jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (talent_id, period_start, period_end)
);

create index messages_talent_created_idx on public.messages (talent_id, created_at);
create index meetings_talent_starts_idx on public.meetings (talent_id, starts_at);

alter table public.profiles enable row level security;
alter table public.boards enable row level security;
alter table public.messages enable row level security;
alter table public.meetings enable row level security;
alter table public.weekly_reports enable row level security;

create or replace function private.is_gestor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'gestor'
  );
$$;

revoke all on function private.is_gestor() from public, anon, authenticated;
grant execute on function private.is_gestor() to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, role, company)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, 'talento'), '@', 1)),
    'talento',
    nullif(new.raw_user_meta_data ->> 'company', '')
  );
  insert into public.boards (talent_id, state)
  values (
    new.id,
    '{"version":2,"columns":{"todo":[],"doing":[],"done":[]},"cards":{},"completedLog":[]}'::jsonb
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

revoke all on public.profiles, public.boards, public.messages, public.meetings, public.weekly_reports from anon, public;

grant select on public.profiles to authenticated;
grant select, insert, update on public.boards to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert, delete on public.meetings to authenticated;
grant select, insert, update on public.weekly_reports to authenticated;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.is_gestor());

create policy boards_select on public.boards
  for select to authenticated
  using (talent_id = (select auth.uid()) or private.is_gestor());

create policy boards_insert on public.boards
  for insert to authenticated
  with check (talent_id = (select auth.uid()) or private.is_gestor());

create policy boards_update on public.boards
  for update to authenticated
  using (talent_id = (select auth.uid()) or private.is_gestor())
  with check (talent_id = (select auth.uid()) or private.is_gestor());

create policy messages_select on public.messages
  for select to authenticated
  using (talent_id = (select auth.uid()) or private.is_gestor());

create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      (talent_id = (select auth.uid()) and author_role = 'talento')
      or (private.is_gestor() and author_role = 'gestor')
    )
  );

create policy meetings_select on public.meetings
  for select to authenticated
  using (talent_id = (select auth.uid()) or private.is_gestor());

create policy meetings_insert on public.meetings
  for insert to authenticated
  with check (private.is_gestor());

create policy meetings_delete on public.meetings
  for delete to authenticated
  using (private.is_gestor());

create policy reports_select on public.weekly_reports
  for select to authenticated
  using (talent_id = (select auth.uid()) or private.is_gestor());

create policy reports_insert on public.weekly_reports
  for insert to authenticated
  with check (talent_id = (select auth.uid()));

create policy reports_update on public.weekly_reports
  for update to authenticated
  using (talent_id = (select auth.uid()))
  with check (talent_id = (select auth.uid()));

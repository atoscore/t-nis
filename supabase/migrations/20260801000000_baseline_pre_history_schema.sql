-- Baseline de documentação: captura objetos que já existiam em produção
-- (ajuwcbaqophgyyqpldbc) antes do início do histórico de migrations deste
-- repo, e que nunca foram versionados. Não é uma mudança funcional — todo
-- objeto aqui já existe no banco real; esta migration só o registra no
-- histórico local, na forma como existia ANTES das migrations seguintes
-- (20260802000001 em diante) o alterarem incrementalmente.
--
-- Método: `supabase db pull` não funciona neste repo (o histórico local já
-- começa com ALTER TABLE sobre tabelas que ele mesmo nunca criou, então o
-- shadow database usado pelo diff nunca sobe). Em vez disso, foi feito
-- `supabase db dump --linked --schema public` (dump mecânico via pg_dump,
-- sem shadow database) e cada objeto do dump foi conferido contra
-- supabase/migrations/*.sql: o que já tinha CREATE/ALTER rastreado foi
-- descartado daqui; o que nunca apareceu em nenhuma migration virou este
-- arquivo. Colunas/constraints adicionadas depois por migration já
-- rastreada (ex.: matches.started_at, players.elo_rating,
-- stat_events.serve_number, profiles.is_private,
-- player_editors.status = 'pending') foram deliberadamente OMITIDAS daqui
-- para que essas migrations posteriores continuem se aplicando por cima
-- sem colidir.
--
-- Tabelas cobertas: profiles, players, communities, community_members,
-- matches, sets, stat_events, player_editors.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  name text not null,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id),
  unique (user_id)
);

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (community_id, user_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  player_id uuid not null references public.players(id) on delete cascade,
  opponent_name text,
  match_date date not null,
  location text,
  best_of smallint not null default 3 check (best_of in (3, 5)),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_at timestamptz default now(),
  final_set_match_tiebreak boolean not null default false,
  no_ad boolean not null default false,
  match_tiebreak_points_to smallint not null default 10 check (match_tiebreak_points_to > 0)
);

create table public.sets (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  set_number smallint not null,
  player_games smallint not null default 0,
  opponent_games smallint not null default 0,
  tiebreak_player_points smallint,
  tiebreak_opponent_points smallint,
  winner text check (winner in ('player', 'opponent')),
  unique (match_id, set_number)
);

create table public.stat_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  set_number smallint not null,
  game_number smallint not null,
  point_number smallint not null,
  server text not null check (server in ('player', 'opponent')),
  stroke text check (stroke in ('saque', 'forehand', 'backhand', 'voleio', 'smash')),
  outcome text not null check (outcome in ('ace', 'dupla_falta', 'winner', 'erro_nao_forcado', 'erro_forcado', 'ponto_ganho', 'ponto_perdido')),
  is_break_point boolean not null default false,
  break_point_won boolean,
  created_at timestamptz default now()
);

-- status = 'active'/'revoked' apenas: 'pending' foi adicionado depois por
-- 20260807000002_allow_player_editor_access_requests.sql, que também
-- adiciona a policy de insert de pedido próprio.
create table public.player_editors (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  editor_id uuid not null references auth.users(id),
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (player_id, editor_id)
);

-- Funções auxiliares SECURITY DEFINER usadas pelas policies abaixo (mesmo
-- padrão de follow_status_allowed/post_visible_to, já rastreados).
create or replace function public.is_player_owner(p_player_id uuid, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from players
    where id = p_player_id and user_id = p_uid
  );
$$;

revoke execute on function public.is_player_owner(uuid, uuid) from public;
grant execute on function public.is_player_owner(uuid, uuid) to anon, authenticated, service_role;

create or replace function public.is_active_player_editor(p_player_id uuid, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from player_editors
    where player_id = p_player_id and editor_id = p_uid and status = 'active'
  );
$$;

revoke execute on function public.is_active_player_editor(uuid, uuid) from public;
grant execute on function public.is_active_player_editor(uuid, uuid) to anon, authenticated, service_role;

create or replace function public.is_community_creator(p_community_id uuid, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from communities
    where id = p_community_id and created_by = p_uid
  );
$$;

revoke execute on function public.is_community_creator(uuid, uuid) from public;
grant execute on function public.is_community_creator(uuid, uuid) to anon, authenticated, service_role;

create or replace function public.is_accepted_community_member(p_community_id uuid, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from community_members
    where community_id = p_community_id and user_id = p_uid and status = 'accepted'
  );
$$;

revoke execute on function public.is_accepted_community_member(uuid, uuid) from public;
grant execute on function public.is_accepted_community_member(uuid, uuid) to anon, authenticated, service_role;

-- Cria a linha de profiles automaticamente no signup (trigger em
-- auth.users, fora do schema public).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Rede de segurança: garante RLS ligado em qualquer tabela nova criada em
-- public, mesmo que a migration que a criou esqueça o `enable row level
-- security` explícito. Roda em todo CREATE TABLE do schema (event trigger,
-- nível banco — não aparece em dump escopado por schema).
create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table','partitioned table')
  loop
     if cmd.schema_name is not null and cmd.schema_name in ('public') and cmd.schema_name not in ('pg_catalog','information_schema') and cmd.schema_name not like 'pg_toast%' and cmd.schema_name not like 'pg_temp%' then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
     else
        raise log 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     end if;
  end loop;
end;
$$;

create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();

alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.matches enable row level security;
alter table public.sets enable row level security;
alter table public.stat_events enable row level security;
alter table public.player_editors enable row level security;

create policy profiles_select_any_authenticated on public.profiles
  for select
  to authenticated
  using (true);

create policy profiles_update_own on public.profiles
  for update
  using (id = auth.uid());

create policy players_insert_owner on public.players
  for insert
  with check (owner_id = auth.uid());

create policy players_select_owner_or_editor_or_self on public.players
  for select
  using (owner_id = auth.uid() or user_id = auth.uid() or public.is_active_player_editor(id, auth.uid()));

create policy players_update_owner_or_self on public.players
  for update
  using (owner_id = auth.uid() or user_id = auth.uid());

create policy players_delete_owner on public.players
  for delete
  using (owner_id = auth.uid());

create policy communities_insert_own on public.communities
  for insert
  with check (created_by = auth.uid());

create policy communities_select_all_authenticated on public.communities
  for select
  to authenticated
  using (true);

create policy members_insert_self_request_or_creator_invite on public.community_members
  for insert
  with check (
    (user_id = auth.uid() and invited_by is null)
    or (invited_by = auth.uid() and public.is_community_creator(community_id, auth.uid()))
  );

create policy members_select_self_or_creator on public.community_members
  for select
  using (user_id = auth.uid() or public.is_community_creator(community_id, auth.uid()));

create policy members_update_creator_approves on public.community_members
  for update
  using (public.is_community_creator(community_id, auth.uid()));

create policy matches_insert_owner_authorized on public.matches
  for insert
  with check (
    owner_id = auth.uid()
    and (public.is_player_owner(player_id, auth.uid()) or public.is_active_player_editor(player_id, auth.uid()))
  );

create policy matches_select_owner_or_editor_or_player on public.matches
  for select
  using (
    owner_id = auth.uid()
    or public.is_active_player_editor(player_id, auth.uid())
    or public.is_player_owner(player_id, auth.uid())
  );

create policy matches_update_owner_or_editor on public.matches
  for update
  using (owner_id = auth.uid() or public.is_active_player_editor(player_id, auth.uid()));

create policy matches_delete_owner_only on public.matches
  for delete
  using (owner_id = auth.uid());

create policy sets_select_owner_or_editor_or_player on public.sets
  for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = sets.match_id
        and (
          m.owner_id = auth.uid()
          or exists (
            select 1 from public.player_editors pe
            where pe.player_id = m.player_id and pe.editor_id = auth.uid() and pe.status = 'active'
          )
          or exists (
            select 1 from public.players p
            where p.id = m.player_id and p.user_id = auth.uid()
          )
        )
    )
  );

create policy sets_insert_owner_or_editor on public.sets
  for insert
  with check (
    exists (
      select 1 from public.matches m
      where m.id = sets.match_id
        and (
          m.owner_id = auth.uid()
          or exists (
            select 1 from public.player_editors pe
            where pe.player_id = m.player_id and pe.editor_id = auth.uid() and pe.status = 'active'
          )
        )
    )
  );

create policy sets_update_owner_or_editor on public.sets
  for update
  using (
    exists (
      select 1 from public.matches m
      where m.id = sets.match_id
        and (
          m.owner_id = auth.uid()
          or exists (
            select 1 from public.player_editors pe
            where pe.player_id = m.player_id and pe.editor_id = auth.uid() and pe.status = 'active'
          )
        )
    )
  );

create policy stat_events_select_owner_or_editor_or_player on public.stat_events
  for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = stat_events.match_id
        and (
          m.owner_id = auth.uid()
          or exists (
            select 1 from public.player_editors pe
            where pe.player_id = m.player_id and pe.editor_id = auth.uid() and pe.status = 'active'
          )
          or exists (
            select 1 from public.players p
            where p.id = m.player_id and p.user_id = auth.uid()
          )
        )
    )
  );

create policy stat_events_insert_owner_or_editor on public.stat_events
  for insert
  with check (
    exists (
      select 1 from public.matches m
      where m.id = stat_events.match_id
        and (
          m.owner_id = auth.uid()
          or exists (
            select 1 from public.player_editors pe
            where pe.player_id = m.player_id and pe.editor_id = auth.uid() and pe.status = 'active'
          )
        )
    )
  );

create policy player_editors_select_involved on public.player_editors
  for select
  using (editor_id = auth.uid() or public.is_player_owner(player_id, auth.uid()));

create policy player_editors_insert_by_player_owner on public.player_editors
  for insert
  with check (public.is_player_owner(player_id, auth.uid()) and granted_by = auth.uid());

create policy player_editors_update_revoke_by_player_owner on public.player_editors
  for update
  using (public.is_player_owner(player_id, auth.uid()));

-- Matchmaking geolocalizado: localização (PostGIS), nível, horário
-- disponível e notificação quando alguém pede pra jogar.
create extension if not exists postgis;

-- Um perfil de matchmaking por conta. location fica de fora de qualquer
-- select direto de outra conta (RLS abaixo só libera a própria linha) — a
-- busca geoespacial roda via find_nearby_matches (SECURITY DEFINER), que
-- devolve distância, não a coordenada crua de terceiros.
create table public.matchmaking_profiles (
  account_id uuid primary key references auth.users(id),
  location geography(point, 4326) not null,
  search_radius_km numeric(6, 2) not null default 10 check (search_radius_km > 0),
  skill_level text not null check (
    skill_level in ('iniciante', 'intermediario', 'avancado', 'profissional')
  ),
  -- 0 = domingo .. 6 = sábado (convenção extract(dow from ...) do Postgres).
  available_days smallint[] not null default '{}' check (available_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  available_start_time time null,
  available_end_time time null check (
    available_end_time is null or available_start_time is null or available_end_time > available_start_time
  ),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create index matchmaking_profiles_location_idx
  on public.matchmaking_profiles using gist (location);

alter table public.matchmaking_profiles enable row level security;

create policy matchmaking_profiles_select_own on public.matchmaking_profiles
  for select
  using (account_id = auth.uid());

create policy matchmaking_profiles_insert_self on public.matchmaking_profiles
  for insert
  with check (account_id = auth.uid());

create policy matchmaking_profiles_update_self on public.matchmaking_profiles
  for update
  using (account_id = auth.uid())
  with check (account_id = auth.uid());

create policy matchmaking_profiles_delete_self on public.matchmaking_profiles
  for delete
  using (account_id = auth.uid());

create or replace function public.matchmaking_profiles_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger matchmaking_profiles_touch_updated_at
  before update on public.matchmaking_profiles
  for each row
  execute function public.matchmaking_profiles_set_updated_at();

-- Notificação: nasce quando alguém pede pra jogar com um candidato
-- encontrado na busca (request_match, abaixo). Não é chat — só o registro
-- do pedido, pra aparecer na caixa de notificações do destinatário.
create table public.matchmaking_notifications (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id),
  requested_by uuid not null references auth.users(id),
  status text not null default 'unread' check (status in ('unread', 'read', 'dismissed')),
  created_at timestamptz not null default now()
);

create index matchmaking_notifications_account_id_idx
  on public.matchmaking_notifications (account_id, created_at desc);

alter table public.matchmaking_notifications enable row level security;

-- Destinatário lê e gerencia (marcar lida/dispensar) as próprias
-- notificações. Sem policy de insert pra client: só nasce via
-- request_match (SECURITY DEFINER), que valida o pedido antes de gravar.
create policy matchmaking_notifications_select_own on public.matchmaking_notifications
  for select
  using (account_id = auth.uid());

create policy matchmaking_notifications_update_own on public.matchmaking_notifications
  for update
  using (account_id = auth.uid())
  with check (account_id = auth.uid());

-- Busca de candidatos: raio mútuo (dentro do limite de quem busca E de quem
-- é encontrado — ninguém aparece pra alguém fora do próprio raio que
-- aceitaria viajar), mesmo skill_level (sem faixa adjacente por ora — não
-- documentado, não inventar) e, quando os dois têm horário informado,
-- alguma sobreposição de dia da semana e de janela de horário. Devolve só
-- account_id/distância/nível — não a coordenada exata do candidato.
create or replace function public.find_nearby_matches(p_max_results integer default 20)
returns table (
    account_id uuid,
    display_name text,
    distance_km numeric,
    skill_level text
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  with me as (
    select * from public.matchmaking_profiles where account_id = auth.uid() and is_active
  )
  select
    mp.account_id,
    p.display_name,
    round((ST_Distance(mp.location, me.location) / 1000)::numeric, 1) as distance_km,
    mp.skill_level
  from public.matchmaking_profiles as mp
  join me on true
  join public.profiles as p on p.id = mp.account_id
  where mp.account_id <> me.account_id
    and mp.is_active
    and mp.skill_level = me.skill_level
    and ST_DWithin(mp.location, me.location, least(mp.search_radius_km, me.search_radius_km) * 1000)
    and (
      cardinality(me.available_days) = 0
      or cardinality(mp.available_days) = 0
      or mp.available_days && me.available_days
    )
    and (
      me.available_start_time is null or mp.available_start_time is null
      or (mp.available_start_time < me.available_end_time and mp.available_end_time > me.available_start_time)
    )
  order by distance_km asc
  limit p_max_results;
$$;

-- Pedido explícito do usuário sobre um candidato encontrado na busca acima
-- (não é automático). Confirma que o alvo tem perfil de matchmaking ativo
-- antes de gravar a notificação.
create or replace function public.request_match(p_target_account_id uuid)
returns public.matchmaking_notifications
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_notification public.matchmaking_notifications;
begin
  if p_target_account_id = auth.uid() then
    raise exception 'cannot request a match with yourself';
  end if;

  if not exists (
    select 1 from public.matchmaking_profiles
    where account_id = p_target_account_id and is_active
  ) then
    raise exception 'target has no active matchmaking profile';
  end if;

  insert into public.matchmaking_notifications (account_id, requested_by)
  values (p_target_account_id, auth.uid())
  returning * into v_notification;

  return v_notification;
end;
$$;

-- Sistema de badges (conquistas). Catálogo genérico + linha por conta que
-- ganhou, ligada à partida que disparou o badge — mesmo padrão de
-- account_id resolvido via players.user_id usado em ranking_for_accounts
-- (20260804000001_generalize_community_ranking.sql).
--
-- Regra de negócio implementada aqui: só 'pneu' e 'comeback' (apuradas por
-- gatilho na conclusão da partida). 'iron_man' já tem o dado que precisa
-- (matches.started_at/ended_at, de 20260802000001) mas a regra de duração
-- (o que conta como "maratona") não foi definida ainda — cadastrada só como
-- linha de catálogo aqui, sem função de apuração. Não inventar o limiar.
create table public.badges (
  code text primary key,
  name text not null,
  description text not null
);

insert into public.badges (code, name, description) values
  ('pneu', 'Pneu', 'Fechou um set 6-0 na partida.'),
  ('comeback', 'Comeback', 'Venceu a partida depois de estar atrás no placar de sets em algum momento.'),
  ('iron_man', 'Iron Man', 'Partida maratona (regra de duração ainda não definida — sem apuração automática por enquanto).');

create table public.account_badges (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id),
  badge_code text not null references public.badges(code),
  match_id uuid not null references public.matches(id),
  earned_at timestamptz not null default now(),
  unique (account_id, badge_code, match_id)
);

create index account_badges_account_id_idx on public.account_badges (account_id);

alter table public.account_badges enable row level security;

-- Mesma regra de visibilidade do feed social (post_visible_to, de
-- 20260802000004_add_posts_feed.sql): dono, ou perfil público, ou follow
-- aceito. Badge é conquista pra mostrar no perfil, não dado privado, mas
-- segue a mesma política de quem pode ver o quê já estabelecida no app.
create policy account_badges_select_visible on public.account_badges
  for select
  using (public.post_visible_to(account_id, auth.uid()));

-- Apuração roda só pelo gatilho abaixo (SECURITY DEFINER: precisa gravar
-- badge na conta do adversário quando ela não é quem está fazendo a
-- chamada). Sem policy de insert/update/delete pra client: ninguém insere
-- badge via PostgREST diretamente.

-- Resolve a conta "dona" de um lado da partida: o player vinculado
-- (players.user_id) quando existe; para o lado player_id (o lado
-- autotrackeado), cai pro owner_id da partida quando esse player ainda não
-- tem user_id vinculado. Para opponent_player_id sem vínculo (nome livre,
-- sem players.user_id), não existe conta pra premiar — retorna null.
create or replace function public.match_side_account_id(p_match_id uuid, p_side text)
returns uuid
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select case p_side
    when 'player' then coalesce(
      (select pl.user_id from public.matches m join public.players pl on pl.id = m.player_id where m.id = p_match_id),
      (select m.owner_id from public.matches m where m.id = p_match_id)
    )
    when 'opponent' then (
      select pl.user_id from public.matches m
      join public.players pl on pl.id = m.opponent_player_id
      where m.id = p_match_id
    )
  end;
$$;

-- Uso interno do gatilho abaixo: revela account_id de quem joga uma
-- partida, sem checagem de permissão nenhuma — não deve virar RPC pública
-- (mesmo motivo/mesma técnica de ranking_for_accounts).
revoke execute on function public.match_side_account_id(uuid, text) from public, anon, authenticated;

-- Dispara na conclusão da partida (status -> 'completed'). Idempotente por
-- natureza (WHEN só deixa passar a transição pra 'completed' uma vez, e o
-- insert tem ON CONFLICT DO NOTHING como reforço) e recalcula do zero a
-- partir de sets, nunca incrementa contador às cegas — mesma filosofia de
-- atomicidade documentada em docs/registro-partida.md.
create or replace function public.award_match_badges()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_player_account uuid := public.match_side_account_id(new.id, 'player');
  v_opponent_account uuid := public.match_side_account_id(new.id, 'opponent');
  v_cum_player integer;
  v_cum_opponent integer;
  v_last_set_number integer;
  v_winner_side text;
  v_winner_account uuid;
  v_is_comeback boolean;
begin
  -- Pneu: qualquer set 6-0 na partida, pra cada lado que o fechou assim.
  if v_player_account is not null and exists (
    select 1 from public.sets
    where match_id = new.id and player_games = 6 and opponent_games = 0
  ) then
    insert into public.account_badges (account_id, badge_code, match_id)
    values (v_player_account, 'pneu', new.id)
    on conflict do nothing;
  end if;

  if v_opponent_account is not null and exists (
    select 1 from public.sets
    where match_id = new.id and opponent_games = 6 and player_games = 0
  ) then
    insert into public.account_badges (account_id, badge_code, match_id)
    values (v_opponent_account, 'pneu', new.id)
    on conflict do nothing;
  end if;

  -- Comeback: vencedor da partida (mais sets com winner='player'/'opponent',
  -- mesma regra de get_head_to_head/ranking_for_accounts) que em algum
  -- set anterior ao último esteve atrás na contagem acumulada de sets.
  select
    count(*) filter (where winner = 'player'),
    count(*) filter (where winner = 'opponent'),
    max(set_number)
  into v_cum_player, v_cum_opponent, v_last_set_number
  from public.sets
  where match_id = new.id;

  v_winner_side := case when v_cum_player > v_cum_opponent then 'player' else 'opponent' end;
  v_winner_account := case v_winner_side
    when 'player' then v_player_account
    else v_opponent_account
  end;

  select exists (
    select 1
    from (
      select
        set_number,
        count(*) filter (where winner = 'player') over (order by set_number) as cum_player,
        count(*) filter (where winner = 'opponent') over (order by set_number) as cum_opponent
      from public.sets
      where match_id = new.id
    ) as running
    where set_number < v_last_set_number
      and (
        (v_winner_side = 'player' and running.cum_opponent > running.cum_player)
        or (v_winner_side = 'opponent' and running.cum_player > running.cum_opponent)
      )
  ) into v_is_comeback;

  if v_is_comeback and v_winner_account is not null then
    insert into public.account_badges (account_id, badge_code, match_id)
    values (v_winner_account, 'comeback', new.id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger matches_award_badges
  after update of status on public.matches
  for each row
  when (new.status = 'completed' and old.status is distinct from 'completed')
  execute function public.award_match_badges();

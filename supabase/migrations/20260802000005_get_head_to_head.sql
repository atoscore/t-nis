-- get_head_to_head existe em produção (ver Args/Returns já tipados em
-- src/types/supabase.ts), mas o CREATE FUNCTION nunca foi versionado neste
-- repo. Trazida pra baixo de controle de versão junto com o restante do
-- baseline pré-histórico (20260801000000_baseline_pre_history_schema.sql),
-- mas separada dele porque depende de matches.opponent_player_id, coluna
-- que só existe a partir de 20260802000002_add_elo_and_classe.sql — não
-- pode vir antes dela sem quebrar um replay do zero.
create or replace function public.get_head_to_head(player_a uuid, player_b uuid)
returns table (
  match_id uuid,
  match_date date,
  placar text,
  vencedor_player_id uuid
)
language sql
stable
set search_path to 'public'
as $$
    select
        m.id as match_id,
        m.match_date,
        (
            select string_agg(
                s.player_games || '–' || s.opponent_games
                || case
                    when s.tiebreak_player_points is not null
                        or s.tiebreak_opponent_points is not null
                    then ' (' || coalesce(s.tiebreak_player_points, 0)
                        || '–' || coalesce(s.tiebreak_opponent_points, 0) || ')'
                    else ''
                end,
                ', ' order by s.set_number
            )
            from public.sets as s
            where s.match_id = m.id
        ) as placar,
        case
            when (
                select count(*) from public.sets as s
                where s.match_id = m.id and s.winner = 'player'
            ) > (
                select count(*) from public.sets as s
                where s.match_id = m.id and s.winner = 'opponent'
            )
            then m.player_id
            else m.opponent_player_id
        end as vencedor_player_id
    from public.matches as m
    where m.status = 'completed'
      and (
          (m.player_id = player_a and m.opponent_player_id = player_b)
          or (m.player_id = player_b and m.opponent_player_id = player_a)
      )
    order by m.match_date desc;
$$;

comment on function public.get_head_to_head(uuid, uuid) is
  'Partidas concluídas entre dois players vinculados (nas duas direções titular/adversário), com placar por set e o player_id vencedor. security invoker: respeita a RLS de matches/sets do chamador.';

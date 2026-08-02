/*
 * Head-to-head entre dois jogadores cadastrados: partidas concluídas em que
 * um foi o titular (matches.player_id) e o outro o adversário vinculado
 * (matches.opponent_player_id), cobrindo as duas direções possíveis.
 *
 * security invoker (sem SECURITY DEFINER, que é o default): a RLS de
 * matches/sets continua valendo para quem chama a função, então só
 * aparecem partidas do próprio owner_id — sem isso, vazaria partida de
 * outro dono. Diferente de get_community_ranking, que precisa de
 * SECURITY DEFINER + checagem manual de membership porque agrega partidas
 * de várias contas da comunidade, atravessando a RLS por design.
 *
 * Vencedor: mesma regra usada em get_community_ranking e no relatório
 * (MatchReport.tsx) — mais sets com sets.winner = 'player' do que
 * sets.winner = 'opponent' (contagem de sets, não de games).
 *
 * Placar: mesmo formato de MatchReport.tsx/formatTiebreak — "games–games"
 * por set, com "(tiebreak–tiebreak)" quando a linha do set tem pontos de
 * tiebreak (inclui o set decisivo em match tiebreak, guardado como 1-0 nas
 * colunas de games com a pontuação real nas colunas de tiebreak).
 */
create or replace function public.get_head_to_head(player_a uuid, player_b uuid)
returns table (
    match_id uuid,
    match_date date,
    placar text,
    vencedor_player_id uuid
)
language sql
security invoker
stable
set search_path = 'public'
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

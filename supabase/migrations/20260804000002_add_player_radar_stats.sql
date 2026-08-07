/*
 * Perfil de atributos do radar chart (Saque, Devolução, Forehand, Backhand,
 * Físico, Mental) para um player, agregando as partidas concluídas em que
 * ele é o titular (matches.player_id = p_player_id).
 *
 * Todos os atributos ficam no intervalo de 0 a 1 (mesma convenção de
 * match_stats_summary, ver sql/match_stats_summary.md). NULL quando não há
 * denominador (sem dado suficiente para aquele atributo).
 *
 * Saque e Devolução reaproveitam a mesma lógica de agregação de
 * match_stats_summary (point_rollup por
 * match_id/set_number/game_number/point_number/server), agora somada aos
 * dados de serve_number (20260804000001_add_serve_number.sql):
 *   - Saque = 50% pontos ganhos sacando + 30% % de primeiro saque + 20% taxa
 *     de ace. O termo de % de primeiro saque usa serve_number quando
 *     disponível; para pontos antigos sem serve_number, cai na mesma
 *     aproximação de sql/match_stats_summary.sql (stroke = 'saque' e sem
 *     dupla_falta).
 *   - Devolução = 70% pontos ganhos recebendo + 30% conversão de break
 *     point a favor (quando houve oportunidade; senão usa o próprio % de
 *     pontos ganhos recebendo).
 * Forehand/Backhand = winners do stroke / (winners + erros não forçados +
 * erros forçados) do mesmo stroke — quanto mais um golpe termina em winner
 * em vez de erro, maior o score.
 *
 * Físico e Mental são inferidos, não autoavaliados:
 *   - Físico: 1 menos a queda no % de pontos ganhos da primeira para a
 *     segunda metade dos pontos de cada partida (ntile(2), ordenado por
 *     set_number/game_number/point_number). Sem queda, ou com melhora,
 *     Físico = 1.
 *   - Mental: % de pontos de pressão (break points, tanto sacando quanto
 *     recebendo) ganhos pelo player.
 *
 * security invoker: respeita a RLS de matches/sets/stat_events do
 * chamador, mesma técnica de get_head_to_head — só agrega partidas
 * visíveis para quem chama.
 */
create or replace function public.get_player_radar_stats(p_player_id uuid)
returns table (
    saque numeric,
    devolucao numeric,
    forehand numeric,
    backhand numeric,
    fisico numeric,
    mental numeric
)
language sql
security invoker
stable
set search_path = 'public'
as $$
  with player_matches as (
      select m.id as match_id
      from public.matches as m
      where m.player_id = p_player_id
        and m.status = 'completed'
  ),
  point_rollup as (
      select
          se.match_id,
          se.set_number,
          se.game_number,
          se.point_number,
          se.server,
          bool_or(se.stroke = 'saque' and se.outcome <> 'dupla_falta')
              as has_first_serve_proxy_event,
          bool_or(se.serve_number = 2) as used_second_serve,
          bool_or(se.serve_number is not null) as has_serve_number,
          bool_or(se.is_break_point is true) as is_break_point,
          bool_or(se.break_point_won is true) as break_point_won,
          bool_or(
              (se.server = 'player' and se.outcome = 'ace')
              or (se.server = 'opponent' and se.outcome = 'dupla_falta')
              or se.outcome in ('winner', 'ponto_ganho')
          ) as player_won_point
      from public.stat_events as se
      where se.match_id in (select match_id from player_matches)
      group by se.match_id, se.set_number, se.game_number, se.point_number, se.server
  ),
  point_halves as (
      select
          pr.*,
          ntile(2) over (
              partition by pr.match_id
              order by pr.set_number, pr.game_number, pr.point_number
          ) as half
      from point_rollup as pr
  ),
  point_totals as (
      select
          count(*) filter (where server = 'player') as service_points,
          count(*) filter (where server = 'player' and player_won_point)
              as service_points_won,
          count(*) filter (
              where server = 'player' and has_serve_number and not used_second_serve
          ) as first_serve_points,
          count(*) filter (where server = 'player' and has_serve_number)
              as service_points_with_serve_number,
          count(*) filter (where server = 'player' and has_first_serve_proxy_event)
              as first_serve_proxy_points,
          count(*) filter (where server = 'opponent') as return_points,
          count(*) filter (where server = 'opponent' and player_won_point)
              as return_points_won,
          count(*) filter (where server = 'player' and is_break_point)
              as break_points_enfrentados,
          count(*) filter (
              where server = 'player' and is_break_point and break_point_won
          ) as break_points_convertidos,
          count(*) filter (where server = 'opponent' and is_break_point)
              as break_points_a_favor,
          count(*) filter (
              where server = 'opponent' and is_break_point and break_point_won
          ) as break_points_convertidos_a_favor,
          count(*) filter (where half = 1 and player_won_point) as first_half_points_won,
          count(*) filter (where half = 1) as first_half_points,
          count(*) filter (where half = 2 and player_won_point) as second_half_points_won,
          count(*) filter (where half = 2) as second_half_points
      from point_halves
  ),
  event_totals as (
      select
          count(*) filter (where se.server = 'player' and se.outcome = 'ace') as aces,
          count(*) filter (where se.outcome = 'winner' and se.stroke = 'forehand')
              as winners_forehand,
          count(*) filter (where se.outcome = 'winner' and se.stroke = 'backhand')
              as winners_backhand,
          count(*) filter (where se.outcome = 'erro_nao_forcado' and se.stroke = 'forehand')
              as erros_nf_forehand,
          count(*) filter (where se.outcome = 'erro_forcado' and se.stroke = 'forehand')
              as erros_f_forehand,
          count(*) filter (where se.outcome = 'erro_nao_forcado' and se.stroke = 'backhand')
              as erros_nf_backhand,
          count(*) filter (where se.outcome = 'erro_forcado' and se.stroke = 'backhand')
              as erros_f_backhand
      from public.stat_events as se
      where se.match_id in (select match_id from player_matches)
  )
  select
      case when pt.service_points = 0 then null else
          least(1, greatest(0,
              0.5 * (pt.service_points_won::numeric / pt.service_points)
              + 0.3 * coalesce(
                  pt.first_serve_points::numeric
                      / nullif(pt.service_points_with_serve_number, 0),
                  pt.first_serve_proxy_points::numeric
                      / nullif(pt.service_points, 0)
                )
              + 0.2 * least(1, et.aces::numeric / pt.service_points)
          ))
      end as saque,
      case when pt.return_points = 0 then null else
          least(1, greatest(0,
              0.7 * (pt.return_points_won::numeric / pt.return_points)
              + 0.3 * coalesce(
                  pt.break_points_convertidos_a_favor::numeric
                      / nullif(pt.break_points_a_favor, 0),
                  pt.return_points_won::numeric / pt.return_points
                )
          ))
      end as devolucao,
      case when (et.winners_forehand + et.erros_nf_forehand + et.erros_f_forehand) = 0
          then null
          else et.winners_forehand::numeric
              / (et.winners_forehand + et.erros_nf_forehand + et.erros_f_forehand)
      end as forehand,
      case when (et.winners_backhand + et.erros_nf_backhand + et.erros_f_backhand) = 0
          then null
          else et.winners_backhand::numeric
              / (et.winners_backhand + et.erros_nf_backhand + et.erros_f_backhand)
      end as backhand,
      case when pt.first_half_points = 0 or pt.second_half_points = 0 then null else
          least(1, greatest(0,
              1 - greatest(0,
                  (pt.first_half_points_won::numeric / pt.first_half_points)
                  - (pt.second_half_points_won::numeric / pt.second_half_points)
              )
          ))
      end as fisico,
      case when (pt.break_points_enfrentados + pt.break_points_a_favor) = 0 then null else
          (
              (
                  pt.break_points_enfrentados - pt.break_points_convertidos
                  + pt.break_points_convertidos_a_favor
              )::numeric
              / (pt.break_points_enfrentados + pt.break_points_a_favor)
          )
      end as mental
  from point_totals as pt
  cross join event_totals as et;
$$;

comment on function public.get_player_radar_stats(uuid) is
    'Atributos do radar chart (saque, devolucao, forehand, backhand, fisico, mental) de um player, agregados sobre suas partidas concluídas. Escala 0 a 1, NULL sem dado suficiente. security invoker: respeita a RLS do chamador.';

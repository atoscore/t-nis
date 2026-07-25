/*
 * Resumo agregado de estatísticas por partida.
 *
 * Esta implementação é uma view, e não uma função, para:
 *   1. preservar automaticamente o tipo real de matches.id/match_id;
 *   2. permitir filtros normais, por exemplo:
 *        SELECT * FROM public.match_stats_summary WHERE match_id = ...;
 *   3. retornar também partidas que ainda não possuem stat_events.
 *
 * As proporções são retornadas no intervalo de 0 a 1.
 * Consulte match_stats_summary.md para as premissas e limitações.
 */
CREATE OR REPLACE VIEW public.match_stats_summary AS
WITH event_totals AS (
    SELECT
        se.match_id,
        count(*) FILTER (
            WHERE se.server = 'player'
              AND se.outcome = 'ace'
        )::bigint AS aces,
        count(*) FILTER (
            WHERE se.server = 'player'
              AND se.outcome = 'dupla_falta'
        )::bigint AS duplas_faltas,
        count(*) FILTER (
            WHERE se.outcome = 'winner'
        )::bigint AS winners_total,
        count(*) FILTER (
            WHERE se.outcome = 'winner'
              AND se.stroke = 'forehand'
        )::bigint AS winners_forehand,
        count(*) FILTER (
            WHERE se.outcome = 'winner'
              AND se.stroke = 'backhand'
        )::bigint AS winners_backhand,
        count(*) FILTER (
            WHERE se.outcome = 'winner'
              AND se.stroke = 'voleio'
        )::bigint AS winners_voleio,
        count(*) FILTER (
            WHERE se.outcome = 'winner'
              AND se.stroke = 'smash'
        )::bigint AS winners_smash,
        count(*) FILTER (
            WHERE se.outcome = 'erro_nao_forcado'
        )::bigint AS erros_nao_forcados_total,
        count(*) FILTER (
            WHERE se.outcome = 'erro_nao_forcado'
              AND se.stroke = 'forehand'
        )::bigint AS erros_nao_forcados_forehand,
        count(*) FILTER (
            WHERE se.outcome = 'erro_nao_forcado'
              AND se.stroke = 'backhand'
        )::bigint AS erros_nao_forcados_backhand,
        count(*) FILTER (
            WHERE se.outcome = 'erro_nao_forcado'
              AND se.stroke = 'voleio'
        )::bigint AS erros_nao_forcados_voleio,
        count(*) FILTER (
            WHERE se.outcome = 'erro_nao_forcado'
              AND se.stroke = 'smash'
        )::bigint AS erros_nao_forcados_smash,
        count(*) FILTER (
            WHERE se.outcome = 'erro_forcado'
        )::bigint AS erros_forcados_total,
        count(*) FILTER (
            WHERE se.outcome = 'erro_forcado'
              AND se.stroke = 'forehand'
        )::bigint AS erros_forcados_forehand,
        count(*) FILTER (
            WHERE se.outcome = 'erro_forcado'
              AND se.stroke = 'backhand'
        )::bigint AS erros_forcados_backhand,
        count(*) FILTER (
            WHERE se.outcome = 'erro_forcado'
              AND se.stroke = 'voleio'
        )::bigint AS erros_forcados_voleio,
        count(*) FILTER (
            WHERE se.outcome = 'erro_forcado'
              AND se.stroke = 'smash'
        )::bigint AS erros_forcados_smash
    FROM public.stat_events AS se
    GROUP BY se.match_id
),
point_rollup AS (
    /*
     * Um ponto é identificado por
     * (match_id, set_number, game_number, point_number, server).
     * O agrupamento evita contar uma vez por golpe os flags que pertencem
     * ao ponto inteiro, especialmente is_break_point.
     */
    SELECT
        se.match_id,
        se.set_number,
        se.game_number,
        se.point_number,
        se.server,
        bool_or(se.stroke = 'saque') AS has_serve_event,
        bool_or(se.outcome = 'dupla_falta') AS has_double_fault,
        bool_or(se.is_break_point IS TRUE) AS is_break_point,
        bool_or(se.break_point_won IS TRUE) AS break_point_won,
        bool_or(
            (
                se.server = 'player'
                AND se.outcome = 'ace'
            )
            OR
            (
                se.server = 'opponent'
                AND se.outcome = 'dupla_falta'
            )
            OR se.outcome IN ('winner', 'ponto_ganho')
        ) AS player_won_point
    FROM public.stat_events AS se
    GROUP BY
        se.match_id,
        se.set_number,
        se.game_number,
        se.point_number,
        se.server
),
point_totals AS (
    SELECT
        pr.match_id,
        count(*)::bigint AS pontos_totais_jogados,
        count(*) FILTER (
            WHERE pr.player_won_point
        )::bigint AS pontos_totais_ganhos,
        count(*) FILTER (
            WHERE pr.server = 'player'
        )::bigint AS service_points,
        count(*) FILTER (
            WHERE pr.server = 'player'
              AND pr.has_serve_event
              AND NOT pr.has_double_fault
        )::bigint AS first_serve_in_proxy,
        count(*) FILTER (
            WHERE pr.server = 'player'
              AND pr.is_break_point
        )::bigint AS break_points_enfrentados,
        count(*) FILTER (
            WHERE pr.server = 'player'
              AND pr.is_break_point
              AND pr.break_point_won
        )::bigint AS break_points_convertidos,
        count(*) FILTER (
            WHERE pr.server = 'opponent'
              AND pr.is_break_point
        )::bigint AS break_points_a_favor,
        count(*) FILTER (
            WHERE pr.server = 'opponent'
              AND pr.is_break_point
              AND pr.break_point_won
        )::bigint AS break_points_convertidos_a_favor
    FROM point_rollup AS pr
    GROUP BY pr.match_id
)
SELECT
    m.id AS match_id,
    coalesce(et.aces, 0::bigint) AS aces,
    coalesce(et.duplas_faltas, 0::bigint) AS duplas_faltas,
    (
        pt.first_serve_in_proxy::numeric
        / nullif(pt.service_points, 0)
    ) AS pct_primeiro_saque,
    /*
     * O schema não distingue a tentativa de saque. Retornar NULL evita
     * classificar como primeiro saque todo ponto que não foi dupla falta
     * e evita classificar dupla falta como um "segundo saque disputado".
     */
    NULL::numeric AS pct_pontos_ganhos_primeiro_saque,
    NULL::numeric AS pct_pontos_ganhos_segundo_saque,
    coalesce(et.winners_total, 0::bigint) AS winners_total,
    coalesce(et.winners_forehand, 0::bigint) AS winners_forehand,
    coalesce(et.winners_backhand, 0::bigint) AS winners_backhand,
    coalesce(et.winners_voleio, 0::bigint) AS winners_voleio,
    coalesce(et.winners_smash, 0::bigint) AS winners_smash,
    coalesce(et.erros_nao_forcados_total, 0::bigint)
        AS erros_nao_forcados_total,
    coalesce(et.erros_nao_forcados_forehand, 0::bigint)
        AS erros_nao_forcados_forehand,
    coalesce(et.erros_nao_forcados_backhand, 0::bigint)
        AS erros_nao_forcados_backhand,
    coalesce(et.erros_nao_forcados_voleio, 0::bigint)
        AS erros_nao_forcados_voleio,
    coalesce(et.erros_nao_forcados_smash, 0::bigint)
        AS erros_nao_forcados_smash,
    coalesce(pt.break_points_enfrentados, 0::bigint)
        AS break_points_enfrentados,
    coalesce(pt.break_points_convertidos, 0::bigint)
        AS break_points_convertidos,
    coalesce(pt.break_points_a_favor, 0::bigint)
        AS break_points_a_favor,
    coalesce(pt.break_points_convertidos_a_favor, 0::bigint)
        AS break_points_convertidos_a_favor,
    coalesce(et.erros_forcados_total, 0::bigint)
        AS erros_forcados_total,
    coalesce(et.erros_forcados_forehand, 0::bigint)
        AS erros_forcados_forehand,
    coalesce(et.erros_forcados_backhand, 0::bigint)
        AS erros_forcados_backhand,
    coalesce(et.erros_forcados_voleio, 0::bigint)
        AS erros_forcados_voleio,
    coalesce(et.erros_forcados_smash, 0::bigint)
        AS erros_forcados_smash,
    coalesce(pt.pontos_totais_jogados, 0::bigint)
        AS pontos_totais_jogados,
    coalesce(pt.pontos_totais_ganhos, 0::bigint)
        AS pontos_totais_ganhos,
    (
        pt.pontos_totais_ganhos::numeric
        / nullif(pt.pontos_totais_jogados, 0)
    ) AS pct_pontos_ganhos
FROM public.matches AS m
LEFT JOIN event_totals AS et
    ON et.match_id = m.id
LEFT JOIN point_totals AS pt
    ON pt.match_id = m.id;

COMMENT ON VIEW public.match_stats_summary IS
    'Estatísticas agregadas por match_id; proporções ficam entre 0 e 1.';

COMMENT ON COLUMN public.match_stats_summary.pct_primeiro_saque IS
    'Proxy: pontos servidos pelo player com stroke=saque e sem dupla_falta, dividido por todos os pontos servidos pelo player.';

COMMENT ON COLUMN public.match_stats_summary.pct_pontos_ganhos_primeiro_saque IS
    'Sempre NULL: stat_events não identifica a tentativa de saque.';

COMMENT ON COLUMN public.match_stats_summary.pct_pontos_ganhos_segundo_saque IS
    'Sempre NULL: stat_events não identifica a tentativa de saque.';

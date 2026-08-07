/*
 * Recalcula pct_primeiro_saque usando serve_number
 * (20260804000001_add_serve_number.sql) em vez da aproximação anterior
 * (stroke = 'saque' e sem dupla_falta), e adiciona pct_segundo_saque.
 *
 * CREATE OR REPLACE VIEW não permite remover, renomear ou reordenar colunas
 * existentes — só pode alterar a expressão de uma coluna já existente (caso
 * de pct_primeiro_saque) e acrescentar colunas novas ao final da lista (caso
 * de pct_segundo_saque). Por isso o restante da view é idêntico a
 * sql/match_stats_summary.sql; apenas point_totals e as duas colunas de %
 * de saque mudam.
 *
 * pct_primeiro_saque e pct_segundo_saque só contam pontos sacados pelo
 * player cujo evento de saque tem serve_number preenchido. Partidas
 * registradas antes desta coluna existir (ou eventos sem serve_number por
 * qualquer motivo) ficam fora do denominador — devolver NULL nesse caso é
 * mais correto do que reaproveitar a aproximação antiga, que não
 * distinguia 1º e 2º saque.
 *
 * pct_pontos_ganhos_primeiro_saque e pct_pontos_ganhos_segundo_saque
 * continuam sempre NULL: calculá-las a partir de serve_number está fora do
 * escopo desta migration.
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
        bool_or(se.outcome = 'dupla_falta') AS has_double_fault,
        bool_or(se.serve_number = 2) AS used_second_serve,
        bool_or(se.serve_number IS NOT NULL) AS has_serve_number,
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
              AND pr.has_serve_number
        )::bigint AS service_points_with_serve_number,
        count(*) FILTER (
            WHERE pr.server = 'player'
              AND pr.has_serve_number
              AND NOT pr.used_second_serve
        )::bigint AS first_serve_points,
        count(*) FILTER (
            WHERE pr.server = 'player'
              AND pr.has_serve_number
              AND pr.used_second_serve
        )::bigint AS second_serve_points,
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
        pt.first_serve_points::numeric
        / nullif(pt.service_points_with_serve_number, 0)
    ) AS pct_primeiro_saque,
    /*
     * O schema não distingue a tentativa de saque para eventos gravados
     * antes de serve_number existir (20260804000001_add_serve_number.sql).
     * Calcular pct_pontos_ganhos_primeiro_saque/segundo_saque a partir de
     * serve_number fica fora do escopo desta migration.
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
    ) AS pct_pontos_ganhos,
    (
        pt.second_serve_points::numeric
        / nullif(pt.service_points_with_serve_number, 0)
    ) AS pct_segundo_saque
FROM public.matches AS m
LEFT JOIN event_totals AS et
    ON et.match_id = m.id
LEFT JOIN point_totals AS pt
    ON pt.match_id = m.id;

COMMENT ON VIEW public.match_stats_summary IS
    'Estatísticas agregadas por match_id; proporções ficam entre 0 e 1.';

COMMENT ON COLUMN public.match_stats_summary.pct_primeiro_saque IS
    'Pontos sacados pelo player cujo evento de saque tem serve_number = 1, dividido pelos pontos sacados pelo player com serve_number preenchido. NULL para partidas sem serve_number registrado.';

COMMENT ON COLUMN public.match_stats_summary.pct_segundo_saque IS
    'Pontos sacados pelo player cujo evento de saque tem serve_number = 2, dividido pelos pontos sacados pelo player com serve_number preenchido. NULL para partidas sem serve_number registrado.';

COMMENT ON COLUMN public.match_stats_summary.pct_pontos_ganhos_primeiro_saque IS
    'Sempre NULL: fora do escopo da introdução de serve_number.';

COMMENT ON COLUMN public.match_stats_summary.pct_pontos_ganhos_segundo_saque IS
    'Sempre NULL: fora do escopo da introdução de serve_number.';

-- Número da tentativa de saque (1º ou 2º) para o evento de stroke = 'saque'
-- em stat_events. Sem isso, o schema não distinguia se um ponto foi
-- disputado no primeiro ou no segundo saque (ver sql/match_stats_summary.md,
-- seção "Pendência de dados") — pct_primeiro_saque era só uma aproximação e
-- pct_pontos_ganhos_primeiro_saque/segundo_saque ficavam sempre NULL.
--
-- Nullable porque eventos antigos não têm essa informação e continuam
-- válidos; e porque só faz sentido em eventos de saque (stroke = 'saque'),
-- nunca nos demais.
alter table public.stat_events
  add column serve_number smallint null
    constraint stat_events_serve_number_valid check (serve_number in (1, 2))
    constraint stat_events_serve_number_requires_saque
      check (serve_number is null or stroke = 'saque');

# Edge Function `insights`

## O que faz

Recebe `match_id` (query param) e devolve um resumo de insights daquela
partida, combinando o que já existe hoje no banco (via
`functions/_shared/matchMetrics.ts`, compartilhado com
`functions/generate-match-insight`):

- `public.match_stats_summary` (view) — estatísticas agregadas da partida.
- `public.get_head_to_head` (RPC) — histórico entre os dois jogadores, quando
  o adversário também é um player cadastrado (`matches.opponent_player_id`
  não nulo).
- `public.get_player_radar_stats` (RPC) — atributos do radar chart (saque,
  devolução, forehand, backhand, físico, mental) do player titular da
  partida, com prefixo `radar_` nas chaves de `metrics`.
- `public.match_insights` (tabela) — o texto de análise gerado por IA para
  essa partida, se já existir (`ai_insight`); `null` quando ainda não foi
  gerado (partida não concluída, ou o job assíncrono ainda não rodou — não é
  erro, é estado esperado).

```
GET /functions/v1/insights?match_id=<uuid>
Authorization: Bearer <jwt do usuário>
```

```json
{
  "match_id": "...",
  "generated_at": "2026-08-08T12:00:00.000Z",
  "metrics": {
    "aces": 3,
    "duplas_faltas": 1,
    "pct_primeiro_saque": 0.62,
    "winners_total": 12,
    "...": "demais colunas de match_stats_summary",
    "head_to_head_partidas": 5,
    "head_to_head_vitorias": 3,
    "head_to_head_derrotas": 2,
    "head_to_head_pct_vitorias": 0.6,
    "radar_saque": 0.71,
    "radar_devolucao": 0.55,
    "radar_forehand": 0.68,
    "radar_backhand": 0.42,
    "radar_fisico": 0.6,
    "radar_mental": 0.5
  },
  "ai_insight": "No saque, você converteu bem os pontos no primeiro serviço... (ou null, se ainda não gerado)"
}
```

## Por que `metrics` é um objeto chave-valor extensível

O contrato da função não declara campos fixos para `metrics`: as chaves vêm
de um `select('*')` sobre `match_stats_summary`, mais `head_to_head_*` e
`radar_*` adicionadas por `buildMatchMetrics`. Isso é proposital:

- Colunas novas na view aparecem automaticamente em `metrics`, sem alterar
  este arquivo.
- Uma RPC nova pode ser plugada em `matchMetrics.ts`, adicionando novas
  chaves com um prefixo próprio, do mesmo jeito que `head_to_head_*` e
  `radar_*` foram adicionadas.
- Quem já consome o endpoint hoje (chaves atuais de `match_stats_summary`)
  não quebra: nenhuma chave existente muda de nome ou de tipo só porque uma
  fonte nova entrou.

Se um dia o consumidor precisar de um contrato mais rígido (tipos por
chave, chaves obrigatórias), isso deve virar uma decisão explícita — não o
comportamento padrão deste endpoint.

## `ai_insight`: de onde vem

Gerado pela function `generate-match-insight`, acionada automaticamente por
um trigger no banco (`matches_trigger_ai_insight`, em
`20260808000001_add_match_ai_insights.sql`) quando uma partida passa para
`status = 'completed'`. Esse trigger roda via `pg_net` (assíncrono — não
bloqueia o `UPDATE` que fechou a partida) e chama `generate-match-insight`
com service role, que busca as mesmas métricas deste endpoint, gera o texto
via LLM e grava em `public.match_insights`.

Esta function (`insights`) só lê `match_insights` — nunca gera o texto. Se a
linha ainda não existir (job não rodou, ou os segredos do Vault que a
trigger function usa ainda não foram configurados), `ai_insight` vem `null`.

## RLS

O client usa o JWT de quem chamou (header `Authorization`), não a service
role. `get_head_to_head` e `get_player_radar_stats` são `security invoker` (a
policy de `match_insights` também segue a mesma visibilidade de `matches`),
então a RLS de matches/sets/stat_events/match_insights continua valendo: a
função só enxerga partidas que o próprio usuário já enxergaria via client
direto.

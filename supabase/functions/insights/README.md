# Edge Function `insights`

## O que faz

Recebe `match_id` (query param) e devolve um resumo de insights daquela
partida, combinando o que já existe hoje no banco:

- `public.match_stats_summary` (view) — estatísticas agregadas da partida.
- `public.get_head_to_head` (RPC) — histórico entre os dois jogadores, quando
  o adversário também é um player cadastrado (`matches.opponent_player_id`
  não nulo).

```
GET /functions/v1/insights?match_id=<uuid>
Authorization: Bearer <jwt do usuário>
```

```json
{
  "match_id": "...",
  "generated_at": "2026-08-07T12:00:00.000Z",
  "metrics": {
    "aces": 3,
    "duplas_faltas": 1,
    "pct_primeiro_saque": 0.62,
    "winners_total": 12,
    "...": "demais colunas de match_stats_summary",
    "head_to_head_partidas": 5,
    "head_to_head_vitorias": 3,
    "head_to_head_derrotas": 2,
    "head_to_head_pct_vitorias": 0.6
  }
}
```

## Por que `metrics` é um objeto chave-valor extensível

O contrato da função não declara campos fixos para `metrics`: as chaves vêm
de um `select('*')` sobre `match_stats_summary`, copiadas 1:1 para o
payload. Isso é proposital — a branch `backend/saque-radar` (radar chart de
atributos: Saque, Devolução, Forehand, Backhand, Físico, Mental) ainda não
foi mergeada nesta branch. Quando mergear, ela deve adicionar colunas à view
(ex.: `pct_segundo_saque`) e/ou uma nova RPC (`get_player_radar_stats`).

Com `metrics` extensível, isso significa:

- Colunas novas na view aparecem automaticamente em `metrics`, sem alterar
  este arquivo.
- Uma RPC nova (como `get_player_radar_stats`) pode ser plugada aqui
  depois, adicionando novas chaves (ex.: prefixo `radar_`) do mesmo jeito
  que `head_to_head_*` foi adicionado.
- Quem já consome o endpoint hoje (chaves atuais de `match_stats_summary`)
  não quebra: nenhuma chave existente muda de nome ou de tipo só porque uma
  fonte nova entrou.

Se um dia o consumidor precisar de um contrato mais rígido (tipos por
chave, chaves obrigatórias), isso deve virar uma decisão explícita — não o
comportamento padrão deste endpoint.

## RLS

O client usa o JWT de quem chamou (header `Authorization`), não a service
role. `get_head_to_head` é `security invoker`, então a RLS de
matches/sets continua valendo: a função só enxerga partidas que o próprio
usuário já enxergaria via client direto.

## Pendência de dados herdada

`match_stats_summary` ainda não distingue primeiro/segundo saque nesta
branch (ver `sql/match_stats_summary.md`), então `pct_pontos_ganhos_primeiro_saque`
e `pct_pontos_ganhos_segundo_saque` chegam como `null` em `metrics`. Isso
deve resolver sozinho quando `backend/saque-radar` mergear e a view for
atualizada.

# `match_stats_summary`

## Escolha da view

`match_stats_summary` é uma view agrupada por `match_id`. A view foi escolhida
porque o tipo de `matches.id` não foi informado: ela herda esse tipo diretamente
e não exige assumir uma assinatura `uuid`, `bigint` ou outra. Além disso, a
consulta continua simples:

```sql
SELECT *
FROM public.match_stats_summary
WHERE match_id = :match_id;
```

A view parte de `matches`, portanto uma partida sem eventos também aparece. Seus
contadores são `0` e suas proporções são `NULL`.

## Premissas dos cálculos

- `aces` conta eventos com `server = 'player'` e `outcome = 'ace'`.
- `duplas_faltas` conta eventos com `server = 'player'` e `outcome =
  'dupla_falta'`.
- `winners_total` conta todos os eventos com `outcome = 'winner'`. Os campos
  `winners_forehand`, `winners_backhand`, `winners_voleio` e `winners_smash`
  aplicam também o filtro correspondente em `stroke`. Esses contadores não
  filtram por `server`, pois `winner` é sempre ponto do player. O total pode ser
  maior que a soma desses quatro campos caso existam winners de outros strokes.
- `erros_nao_forcados_total` e seus campos por stroke seguem a mesma regra,
  usando `outcome = 'erro_nao_forcado'` sem filtrar por `server`, pois esse
  outcome é sempre ponto do opponent.
- `erros_forcados_total` conta eventos com `outcome = 'erro_forcado'`,
  independentemente de `server`, pois esse outcome é sempre ponto do opponent.
  Os campos `erros_forcados_forehand`, `erros_forcados_backhand`,
  `erros_forcados_voleio` e `erros_forcados_smash` aplicam também o filtro
  correspondente em `stroke`. Assim como nos demais totais por stroke, o total
  pode ser maior que a soma desses quatro campos caso existam erros forçados de
  outros strokes.
- Um ponto é identificado pela combinação
  `(match_id, set_number, game_number, point_number, server)`. Pressupõe-se que
  esses campos identifiquem um ponto de forma única e consistente. Isso permite
  deduplicar `is_break_point` quando um rally possui mais de um evento.
- `pontos_totais_jogados` conta todos os pontos distintos identificados pela
  combinação acima, independentemente de quem sacou.
- `pontos_totais_ganhos` considera um ponto ganho pelo jogador analisado quando
  pelo menos um evento desse ponto satisfaz uma das seguintes condições:
  - `server = 'player'` e `outcome = 'ace'`, pois ace é ponto de quem sacou;
  - `server = 'opponent'` e `outcome = 'dupla_falta'`, pois dupla falta é ponto
    de quem recebeu;
  - `outcome IN ('winner', 'ponto_ganho')`, independentemente de `server`, pois
    esses outcomes são sempre pontos do player.

  `erro_nao_forcado`, `erro_forcado` e `ponto_perdido` são sempre pontos do
  opponent e nunca entram em `pontos_totais_ganhos`, independentemente de
  `server`. Um ponto sem nenhum evento que satisfaça uma das três condições
  permanece em `pontos_totais_jogados`, mas não entra em
  `pontos_totais_ganhos`.
- `pct_pontos_ganhos` é `pontos_totais_ganhos` dividido por
  `pontos_totais_jogados`, no intervalo de `0` a `1`. Quando não há pontos
  jogados, retorna `NULL`.
- `break_point_won = NULL` é tratado como falso. Se diferentes eventos do mesmo
  ponto tiverem valores diferentes, basta um `true` para o ponto ser considerado
  convertido.
- Os quatro campos de break point seguem literalmente a classificação de
  `server` conforme a convenção do tênis:
  - `break_points_enfrentados` e `break_points_convertidos`: `server =
    'player'`, pois o jogador analisado está sacando e defende seu serviço;
  - `break_points_a_favor` e `break_points_convertidos_a_favor`: `server =
    'opponent'`, pois o jogador analisado recebe e ameaça quebrar o serviço
    adversário.

  A view não reinterpreta o significado de `break_point_won`: assume que `true`
  já significa "convertido" segundo a origem dos dados.
- `pct_primeiro_saque` e `pct_segundo_saque` usam a coluna `serve_number` de
  `stat_events` (`1` ou `2`, preenchida no evento com `stroke = 'saque'` —
  ver `supabase/migrations/20260804000001_add_serve_number.sql`). O
  denominador de ambas é o número de pontos distintos com `server =
  'player'` cujo evento de saque tem `serve_number` preenchido.
  `pct_primeiro_saque` conta os pontos com `serve_number = 1`;
  `pct_segundo_saque`, os pontos com `serve_number = 2`. Pontos sem
  `serve_number` (eventos gravados antes dessa coluna existir) ficam fora do
  numerador e do denominador das duas.
- A ordem dos eventos não é inferida por `id`. O schema não declara que `id`
  seja cronológico.

## Pendência de dados

`serve_number` identifica a tentativa de saque (primeira ou segunda) a
partir de `supabase/migrations/20260804000001_add_serve_number.sql`, mas só
para eventos gravados depois dessa migration. Partidas antigas não têm esse
dado e não entram no cálculo de `pct_primeiro_saque`/`pct_segundo_saque`.

Calcular `pct_pontos_ganhos_primeiro_saque` e `pct_pontos_ganhos_segundo_saque`
a partir de `serve_number` é possível, mas ficou fora do escopo da migration
que introduziu essa coluna. Por isso essas duas colunas continuam retornando
`NULL` de forma intencional.

## Tipo e escala dos resultados

- Contadores: `bigint`.
- Proporções: `numeric`, no intervalo de `0` a `1`.
- Uma proporção sem denominador válido retorna `NULL`.

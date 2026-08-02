# Camada de aplicação — registro de partida em andamento

Módulos criados (nenhuma estrutura de banco foi criada ou alterada; tudo opera
via cliente Supabase contra o schema existente):

- `src/lib/supabaseClient.ts` — cliente único, configurado por `SUPABASE_URL` e
  `SUPABASE_ANON_KEY` (veja `.env.example`).
- `src/types/supabase.ts` — tipos gerados via `supabase gen types typescript`
  a partir do schema real (fonte única de verdade para tabelas/views/funções).
- `src/types/domain.ts` — literais de domínio que o banco não expõe como tipo
  (colunas de texto livre como `matches.status`, `sets.winner`).
- `src/services/scoring.ts` — regras puras de pontuação (sem I/O), cobertas por
  `tests/scoring.test.ts`.
- `src/services/matchService.ts` — API da camada de aplicação.
- `src/services/playerService.ts` — listagem/criação em `players` (premissa:
  tabela existente com `id`, `owner_id`, `name`).
- UI (Vite + React): `index.html`, `src/main.tsx`, `src/App.tsx`,
  `src/pages/NewMatch.tsx` (configuração da partida) e
  `src/pages/LiveMatch.tsx` (registro em tempo real; ao encerrar, renderiza
  `src/components/MatchReport.tsx`, mantido por outro módulo).
- Comunidades: `src/services/communityService.ts` +
  `src/pages/CommunityList|NewCommunity|JoinCommunity|CommunityDetail|InviteToCommunity.tsx`.
  Convite do criador entra direto como `accepted` (não há aceite pelo
  convidado — UPDATE é só do criador); pedido espontâneo entra `pending` até o
  criador responder. Ranking via RPC `get_community_ranking` (erro `P0001` é
  tratado como "precisa ser membro"). O convite pede o UUID da conta colado
  manualmente — bloqueio conhecido: não existe busca de usuário por nome/email.
- Autenticação (Supabase Auth, email/senha): `src/pages/Login.tsx` e
  `src/pages/SignUp.tsx` (cadastro próprio; senha mínima de 6 caracteres).
  `App.tsx` restaura a sessão com `auth.getSession()`, reage a
  `auth.onAuthStateChange` e só renderiza NewMatch/LiveMatch com sessão
  válida; o cabeçalho persistente traz o email logado e o botão "Sair"
  (`auth.signOut()`). Se o projeto exigir confirmação de email, o signup
  mostra "verifique seu email" (a resposta vem sem sessão); caso contrário
  entra direto. Nenhuma policy de RLS foi alterada — o isolamento por
  `owner_id = auth.uid()` continua como está, sem tabela de perfil.

## API

### `startMatch(playerId, opponentName, bestOf, location?, rules?)`

Cria a partida com `status = 'in_progress'` e o set 1 com placar 0-0.
`owner_id` vem da sessão autenticada (`supabase.auth.getUser()`); sem login a
função falha. `match_date` recebe a data corrente. `bestOf` aceita apenas 3
ou 5.

`rules` (opcional) grava as regras configuráveis da partida nas colunas de
`matches`: `noAd` → `no_ad`, `finalSetMatchTiebreak` →
`final_set_match_tiebreak` e `matchTiebreakPointsTo` →
`match_tiebreak_points_to` (inteiro >= 2). Campos omitidos não são enviados,
valendo o default de cada coluna no banco.

### `registerPoint(matchId, eventData)`

`eventData` traz somente os dados do ponto: `server`, `stroke` e `outcome`.
O serviço deriva `set_number`, `game_number` e `point_number` do estado atual
no banco, calcula `is_break_point`/`break_point_won` automaticamente (ver
convenções), insere a linha em `stat_events` e aplica a progressão:

1. recompõe o game vigente a partir da sequência de eventos daquele
   `game_number` (0-15-30-40, deuce/vantagem a partir de 40-40; tiebreak até 7
   com 2 de vantagem);
2. game fechado incrementa `player_games`/`opponent_games` no set vigente;
3. set fechado (6 games com 2 de diferença, 7-5, ou 7-6 via tiebreak) grava
   `sets.winner` e, se a partida continua, cria a linha do set seguinte;
4. atingido o necessário pelo `best_of` (2 de 3 ou 3 de 5), grava
   `matches.status = 'completed'`.

O retorno informa `pointWinner`, `gameCompleted`/`gameWinner`,
`setCompleted`/`setWinner`, `matchCompleted` e o `state` atualizado.

### `getMatchState(matchId)`

Estado para exibição em tempo real: placar de todos os sets (incluindo
parciais de tiebreak), contagem de sets vencidos, games do set vigente e
pontos do game vigente já formatados (`0/15/30/40/Ad`; numérico no tiebreak).
Em partida concluída, `currentSet` e `currentGame` são `null`.

Estatísticas agregadas não são calculadas aqui — permanecem na view
`match_stats_summary`.

## Convenções e premissas

- **Vencedor do ponto** (`computePointWinner` em `scoring.ts`): o schema não
  declara de quem é a ação descrita em `outcome`. Convenção adotada, alinhada
  à leitura de `match_stats_summary` (golpes são ações do player):
  - `ace` → ponto do sacador (`server`);
  - `dupla_falta` → ponto de quem recebe;
  - `winner`, `ponto_ganho` → ponto do player;
  - `erro_nao_forcado`, `erro_forcado`, `ponto_perdido` → ponto do opponent.

  Se o app registrar com outra semântica, basta ajustar essa função.
- **Um evento por ponto**: `registerPoint` grava apenas o evento decisivo do
  ponto. A identidade do ponto segue a mesma chave usada pela view:
  `(match_id, set_number, game_number, point_number, server)`.
- **Numeração**: `game_number` é sequencial dentro do set
  (`player_games + opponent_games + 1`; o tiebreak é o game 13) e
  `point_number` é sequencial dentro do game.
- **No-ad** (`matches.no_ad`, `null` vale como `false`): com `true`, todo game
  comum perde o estado de vantagem — em 40-40 o próximo ponto fecha o game
  direto. `gameDisplay` nunca mostra `Ad` nesse modo. Tiebreaks não são
  afetados. Com `false`, deuce/vantagem como sempre.
- **Tiebreak**: em 6-6, até 7 pontos com 2 de vantagem. A parcial é mantida em
  `tiebreak_player_points`/`tiebreak_opponent_points` a cada ponto (útil para
  telas em tempo real); o set fecha em 7-6.
- **Set decisivo / match tiebreak**: quando
  `matches.final_set_match_tiebreak = true` (`null` vale como `false`), o set
  decisivo — `set_number` igual a `best_of`, alcançado apenas em 1-1 ou 2-2 —
  é jogado inteiro como um único tiebreak, sem games (`game_number = 1`,
  único game do set). O alvo de pontos vem de
  `matches.match_tiebreak_points_to` (com 2 de vantagem); `null` usa 10, e um
  valor não inteiro ou < 2 é rejeitado no momento de aplicar a regra.
  Representação nas colunas existentes de `sets`: o vencedor fica com 1-0 em
  `player_games`/`opponent_games` e a pontuação real (ex.: 10-8) em
  `tiebreak_player_points`/`tiebreak_opponent_points` — a convenção usual de
  súmula, "1-0 (10-8)", coerente com o set comum, onde as colunas `tiebreak_*`
  já guardam pontos de tiebreak. A parcial também é atualizada a cada ponto.
  Em `getMatchState`, esses sets vêm com `isMatchTiebreak: true` (no array
  `sets`, em `currentSet` e em `currentGame`): a UI deve exibir o placar de
  pontos do tiebreak, não o de games. Com a flag `false`, nada muda no
  comportamento anterior.
- **Regras no estado**: `getMatchState` lê as três colunas da partida (nunca
  assume o padrão) e devolve os valores efetivos em `state.rules`
  (`noAd`, `finalSetMatchTiebreak`, `matchTiebreakPointsTo`).
- **`is_break_point`/`break_point_won`**: calculados automaticamente em
  `registerPoint` (a UI não os informa). `isBreakPoint` em `scoring.ts` marca
  o ponto quando, pelo placar anterior a ele, quem recebia o saque fecharia o
  game ao vencê-lo — segundo o alvo/margem do modo, o que cobre o no-ad
  (40-40 decisivo). Só existe em game comum; tiebreak e match tiebreak nunca
  são break point. `break_point_won` fica `true`/`false` quando o ponto era
  break point (convertido = quem recebia venceu) e `null` nos demais.
- **Ids**: tipados como `string` (uuid), conforme gerado em
  `src/types/supabase.ts` a partir do schema real.

## Atomicidade

`supabase-js` não expõe transações, então cada passo é uma escrita
independente. Mitigações adotadas:

- toda escrita grava valores **recalculados** do estado lido (nada é
  incrementado às cegas);
- se uma execução anterior caiu entre inserir o ponto que fechou um game e
  atualizar `sets`/`matches`, o próximo `registerPoint` detecta o game já
  concluído em `stat_events` e reaplica a conclusão pendente antes de
  registrar o novo ponto (idem para set fechado sem o set seguinte criado).

O fluxo pressupõe **um único registrador por partida** (o dispositivo que
acompanha o jogo). Escrita concorrente na mesma partida pode duplicar
`point_number`; se isso virar requisito, o caminho correto é mover a
progressão para uma função RPC no banco.

## Pendências

Nenhuma bloqueante — o schema listado é suficiente para os fluxos pedidos.
Ficam sinalizadas, sem improvisação de colunas:

1. a semântica exata de `outcome` (ver convenção acima) não é definida pelo
   schema; confirmar com o app antes do go-live;
2. `matches` não tem coluna de término/duração; o encerramento é apenas a
   troca de `status`.

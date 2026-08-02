/*
 * Literais de domínio que o banco não expõe como tipo: as colunas
 * correspondentes (matches.status, sets.winner, stat_events.server/outcome,
 * community_members.status, player_editors.status) são texto livre no schema
 * real, então `supabase gen types` as gera como `string`. Estes tipos captam
 * o conjunto de valores que a aplicação de fato grava/espera — não são
 * gerados e não têm outra fonte de verdade além deste arquivo.
 */

export type Side = 'player' | 'opponent';

export type MatchStatus = 'in_progress' | 'completed';

export type Stroke = 'saque' | 'forehand' | 'backhand' | 'voleio' | 'smash';

export type Outcome =
  | 'ace'
  | 'dupla_falta'
  | 'winner'
  | 'erro_nao_forcado'
  | 'erro_forcado'
  | 'ponto_ganho'
  | 'ponto_perdido';

export type MemberStatus = 'pending' | 'accepted' | 'rejected';

export type PlayerEditorStatus = 'active' | 'revoked';

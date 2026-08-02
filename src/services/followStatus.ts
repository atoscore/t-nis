/*
 * Regra pura de decisão do status inicial de um follow, sem acesso a banco
 * (mesmo padrão de scoring.ts/elo.ts): separada de followService.ts pra não
 * arrastar a inicialização do cliente Supabase em quem só quer testar a
 * regra em si.
 */

export type FollowStatus = 'pending' | 'accepted';

/* Público entra direto como 'accepted'; privado fica 'pending' até o followee responder. */
export function decideFollowStatus(isPrivate: boolean): FollowStatus {
  return isPrivate ? 'pending' : 'accepted';
}

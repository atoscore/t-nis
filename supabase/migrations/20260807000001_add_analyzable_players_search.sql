-- Busca de jogadores "analisáveis": suporta a futura tela de busca da Nova
-- Partida, permitindo escolher um jogador registrado de outra conta como
-- alvo de análise (não confundir com convite de partida — matchmaking já
-- tem seu próprio fluxo em find_nearby_matches/request_match).
--
-- Um jogador registrado (user_id not null) aparece pra quem busca se: o
-- perfil dele é público, OU quem busca já tem acesso de anotador aceito
-- (is_active_player_editor, mesma função usada nas policies de players),
-- OU é o próprio jogador do usuário autenticado. Retorna só id/name/
-- elo_rating — sem owner_id/user_id, pra não expor a qual conta cada
-- jogador está vinculado.
create or replace function public.get_analyzable_players(p_search text default '')
returns table (
  id uuid,
  name text,
  elo_rating integer
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select p.id, p.name, p.elo_rating
  from public.players p
  where p.user_id is not null
    and p.name ilike '%' || coalesce(p_search, '') || '%'
    and (
      p.user_id = auth.uid()
      or public.is_active_player_editor(p.id, auth.uid())
      or exists (
        select 1 from public.profiles pr
        where pr.id = p.user_id and pr.is_private = false
      )
    )
  order by p.name
  limit 50;
$$;

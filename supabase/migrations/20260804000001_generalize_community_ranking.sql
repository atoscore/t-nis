-- get_community_ranking existe em produção (ver Args/Returns já tipados em
-- src/types/supabase.ts e o uso em src/services/communityService.ts), mas o
-- CREATE FUNCTION nunca foi versionado neste repo — só get_head_to_head.sql
-- documenta, em comentário, a convenção que ela segue. Esta migration:
--
--   1. traz get_community_ranking pra baixo de controle de versão,
--      reconstruída com base nessa convenção documentada (SECURITY DEFINER +
--      checagem manual de membership, cruzando a RLS por design; vencedor =
--      mais sets com sets.winner = 'player'/'opponent', mesma regra de
--      get_head_to_head e do MatchReport.tsx);
--   2. extrai o cálculo em si pra uma função interna reaproveitável,
--      ranking_for_accounts(uuid[]), que recebe só a lista de contas do
--      grupo — hoje o grupo vem de community_members, mas qualquer outro
--      agrupamento de contas (ex.: um "clube" formal, se um dia existir uma
--      tabela própria pra isso) pode chamar a mesma função sem duplicar a
--      lógica de apuração.
--
-- Assunção nova (não documentada antes, precisa de confirmação se divergir
-- do comportamento real em produção): uma partida só entra na apuração de
-- uma conta do grupo se ambos os lados (matches.player_id e
-- matches.opponent_player_id) resolverem, via players.user_id, a contas que
-- também pertencem ao mesmo grupo — ranking "interno", não todo o histórico
-- de cada conta.
create or replace function public.ranking_for_accounts(p_account_ids uuid[])
returns table (
    account_id uuid,
    display_name text,
    partidas integer,
    vitorias integer,
    derrotas integer,
    pct_vitorias numeric
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
    with linked_players as (
        select pl.id as player_id, pl.user_id as account_id
        from public.players as pl
        where pl.user_id = any(p_account_ids)
    ),
    group_matches as (
        select
            lp1.account_id as player_account_id,
            lp2.account_id as opponent_account_id,
            (
                select count(*) from public.sets as s
                where s.match_id = m.id and s.winner = 'player'
            ) as player_sets,
            (
                select count(*) from public.sets as s
                where s.match_id = m.id and s.winner = 'opponent'
            ) as opponent_sets
        from public.matches as m
        join linked_players as lp1 on lp1.player_id = m.player_id
        join linked_players as lp2 on lp2.player_id = m.opponent_player_id
        where m.status = 'completed'
    ),
    results as (
        select
            player_account_id as account_id,
            (player_sets > opponent_sets) as won
        from group_matches
        union all
        select
            opponent_account_id as account_id,
            (opponent_sets > player_sets) as won
        from group_matches
    )
    select
        acc.account_id,
        p.display_name,
        coalesce(count(r.account_id), 0)::integer as partidas,
        coalesce(sum(r.won::integer), 0)::integer as vitorias,
        coalesce(sum((not r.won)::integer), 0)::integer as derrotas,
        case
            when count(r.account_id) > 0
                then round(sum(r.won::integer)::numeric / count(r.account_id) * 100, 1)
            else 0
        end as pct_vitorias
    from unnest(p_account_ids) as acc(account_id)
    join public.profiles as p on p.id = acc.account_id
    left join results as r on r.account_id = acc.account_id
    group by acc.account_id, p.display_name
    order by vitorias desc, partidas desc, p.display_name asc;
$$;

comment on function public.ranking_for_accounts(uuid[]) is
    'Apuração de ranking (partidas/vitórias/derrotas/% vitórias) restrita às partidas entre contas do próprio grupo informado. Uso interno: chamada só por wrappers como get_community_ranking, que resolvem o grupo e checam a permissão de quem pede antes de chamar.';

-- Função interna: não deve ser exposta como RPC direta (chamador poderia
-- passar qualquer lista de contas sem nenhuma checagem de permissão). Os
-- schemas do Supabase concedem EXECUTE a anon/authenticated por padrão em
-- toda função nova de public — revoga explicitamente aqui.
revoke execute on function public.ranking_for_accounts(uuid[]) from public, anon, authenticated;

create or replace function public.get_community_ranking(p_community_id uuid)
returns table (
    account_id uuid,
    display_name text,
    partidas integer,
    vitorias integer,
    derrotas integer,
    pct_vitorias numeric
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
    if not public.is_accepted_community_member(p_community_id, auth.uid()) then
        raise exception 'not a member of this community';
    end if;

    return query
    select *
    from public.ranking_for_accounts(
        (
            select coalesce(array_agg(cm.user_id), array[]::uuid[])
            from public.community_members as cm
            where cm.community_id = p_community_id
              and cm.status = 'accepted'
        )
    );
end;
$$;

comment on function public.get_community_ranking(uuid) is
    'Ranking interno de uma community: só membros accepted entram na apuração e só quem é membro accepted pode chamar (senão levanta P0001, tratado em communityService.getCommunityRanking). Delega o cálculo a ranking_for_accounts — mesma função serve qualquer outro agrupamento de contas no futuro (ex.: um clube formal), bastando resolver a lista de account_id e checar a permissão antes de chamar.';

-- Sistema de seguir (estilo X): perfil público aceita o follow direto,
-- perfil privado fica pendente até o followee responder.
--
-- profiles já existe no banco (criada fora do histórico de migrations deste
-- repo — não há CREATE TABLE profiles em nenhuma migration anterior), então
-- aqui só adicionamos a coluna nova. As policies de leitura/escrita de
-- profiles (select para qualquer autenticado, update só do dono) também já
-- existem e cobrem is_private sem precisar de policy nova.
alter table public.profiles
  add column if not exists is_private boolean not null default false;

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id),
  followee_id uuid not null references auth.users(id),
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (follower_id, followee_id)
);

create index follows_follower_id_idx on public.follows (follower_id);
create index follows_followee_id_idx on public.follows (followee_id);

alter table public.follows enable row level security;

-- Mesma técnica de is_player_owner / is_active_player_editor (SECURITY
-- DEFINER, sem RLS) pra checar profiles.is_private dentro da policy de
-- insert de follows sem subquery cruzada direta entre as duas tabelas e sem
-- risco da recursão já vista entre players/player_editors.
--
-- Reforça no banco a mesma regra do followService: status = 'accepted' só é
-- aceito se o followee for público; contra um perfil privado, só 'pending'
-- passa. Isso não deixa um cliente que não passe pelo followService inserir
-- 'accepted' direto contra um perfil privado.
create or replace function public.follow_status_allowed(p_followee_id uuid, p_status text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select case
    when p_status = 'pending' then true
    when p_status = 'accepted' then not coalesce(
      (select is_private from profiles where id = p_followee_id),
      false
    )
    else false
  end;
$$;

-- Follower vê suas próprias linhas de follows.
create policy follows_select_follower on public.follows
  for select
  using (follower_id = auth.uid());

-- Followee vê linhas onde é o alvo, pra gerenciar pedidos.
create policy follows_select_followee on public.follows
  for select
  using (followee_id = auth.uid());

-- Qualquer autenticado insere um follow pra si mesmo, nunca em nome de
-- outra conta; o status inicial respeita profiles.is_private do followee.
create policy follows_insert_self on public.follows
  for insert
  with check (
    follower_id = auth.uid()
    and follow_status_allowed(followee_id, status)
  );

-- Followee aceita um pedido pendente (pending -> accepted).
create policy follows_update_followee_accepts on public.follows
  for update
  using (followee_id = auth.uid())
  with check (followee_id = auth.uid() and status = 'accepted');

-- Followee rejeita um pedido pendente removendo a linha.
create policy follows_delete_followee_rejects on public.follows
  for delete
  using (followee_id = auth.uid());

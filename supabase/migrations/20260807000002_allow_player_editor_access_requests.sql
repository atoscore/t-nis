-- Hoje player_editors só aceita INSERT do dono do jogador
-- (player_editors_insert_by_player_owner, com status liberado só pra
-- 'active'/'revoked' via player_editors_status_check) — ou seja, só o dono
-- consegue conceder acesso, direto e já ativo; não existe fluxo de pedido
-- vindo de quem quer ser anotador.
--
-- Aqui adicionamos 'pending' como status válido e uma nova policy de INSERT
-- que libera qualquer autenticado pedir acesso a um player_id de terceiro,
-- desde que seja pra si mesmo (editor_id = auth.uid()) e a linha nasça
-- pendente. A policy de UPDATE existente (player_editors_update_revoke_by_player_owner)
-- continua exigindo is_player_owner, então quem pede não consegue se
-- auto-aprovar: só o dono do jogador pode virar o status pra 'active'.
alter table public.player_editors
  drop constraint player_editors_status_check,
  add constraint player_editors_status_check check (status in ('pending', 'active', 'revoked'));

create policy player_editors_insert_request_self on public.player_editors
  for insert
  with check (
    editor_id = auth.uid()
    and granted_by = auth.uid()
    and status = 'pending'
  );

/*
 * Insight de IA gerado automaticamente quando uma partida é concluída.
 * Reaproveita o mesmo gatilho de matches_award_badges
 * (20260804000002_add_badges.sql: "after update of status ... when
 * (new.status = 'completed' and old.status is distinct from 'completed')"),
 * mas em vez de rodar lógica só em SQL, aciona a Edge Function
 * generate-match-insight via pg_net (chamada assíncrona, não bloqueia o
 * UPDATE que fechou a partida).
 *
 * Autenticação da chamada pg_net -> Edge Function: a documentação atual do
 * Supabase não recomenda mais fixar a service_role key em texto plano na
 * migration (nem via current_setting de app, nem hardcoded) — o padrão
 * atual é Supabase Vault (extensão supabase_vault, já habilitada neste
 * projeto). A trigger function lê dois segredos por nome:
 *   - edge_function_base_url:        ex. https://<project-ref>.supabase.co/functions/v1
 *   - edge_function_service_role_key: a service_role key (JWT), enviada em
 *     Authorization: Bearer <key> — é o padrão mais citado para chamadas
 *     pg_net -> Edge Function, e não depende do formato novo de secret key.
 *
 * Esses dois segredos NÃO são inseridos por esta migration (nunca commitar
 * segredo real em SQL versionado). Precisam ser criados manualmente uma
 * vez, por um humano com acesso ao projeto, antes deste recurso funcionar
 * em produção:
 *
 *   select vault.create_secret('https://ajuwcbaqophgyyqpldbc.supabase.co/functions/v1', 'edge_function_base_url');
 *   select vault.create_secret('<service_role key real>', 'edge_function_service_role_key');
 *
 * Se os segredos não existirem, a trigger function apenas loga e segue —
 * nunca bloqueia o UPDATE que fechou a partida (insight de IA é
 * complementar, não pode quebrar o fluxo principal de registro de
 * partida). O mesmo vale para qualquer falha do pg_net em si.
 */

create extension if not exists pg_net with schema extensions;

-- Guarda o texto gerado por partida, com o payload de métricas usado (pra
-- auditoria/reprocessamento) e qual provedor/modelo gerou.
create table public.match_insights (
  match_id uuid primary key references public.matches(id) on delete cascade,
  provider text not null,
  model text not null,
  insight_text text not null,
  metrics_snapshot jsonb not null,
  generated_at timestamptz not null default now()
);

alter table public.match_insights enable row level security;

-- Mesma condição de matches_select_owner_or_editor_or_player (dono, editor
-- ativo, ou o próprio player), reescrita via EXISTS contra matches — não
-- inventa função nova. Sem policy de insert/update/delete pra client: só a
-- Edge Function grava aqui, com service role (bypassa RLS).
create policy match_insights_select_owner_or_editor_or_player on public.match_insights
  for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_insights.match_id
        and (
          m.owner_id = auth.uid()
          or public.is_active_player_editor(m.player_id, auth.uid())
          or public.is_player_owner(m.player_id, auth.uid())
        )
    )
  );

create or replace function public.trigger_match_insight_generation()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions', 'vault', 'pg_temp'
as $$
declare
  v_base_url text;
  v_service_key text;
begin
  select decrypted_secret into v_base_url
    from vault.decrypted_secrets where name = 'edge_function_base_url';
  select decrypted_secret into v_service_key
    from vault.decrypted_secrets where name = 'edge_function_service_role_key';

  if v_base_url is null or v_service_key is null then
    raise log 'trigger_match_insight_generation: segredos do Vault ausentes (edge_function_base_url / edge_function_service_role_key) — pulando geração de insight para a partida %', new.id;
    return new;
  end if;

  begin
    perform net.http_post(
      url := v_base_url || '/generate-match-insight',
      body := jsonb_build_object('match_id', new.id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      )
    );
  exception
    when others then
      raise log 'trigger_match_insight_generation: falha ao chamar generate-match-insight para a partida %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

create trigger matches_trigger_ai_insight
  after update of status on public.matches
  for each row
  when (new.status = 'completed' and old.status is distinct from 'completed')
  execute function public.trigger_match_insight_generation();

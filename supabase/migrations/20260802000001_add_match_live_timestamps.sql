-- Timestamps de início/fim de partida, preenchidos apenas pelo fluxo do
-- marcador ao vivo (LiveMatch.tsx / matchService.ts). Partidas criadas por
-- outros fluxos ficam com essas colunas null.
alter table public.matches
  add column started_at timestamptz null,
  add column ended_at timestamptz null;

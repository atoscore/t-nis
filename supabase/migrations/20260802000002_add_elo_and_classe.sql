-- ELO dos jogadores e vínculo opcional do adversário a um player cadastrado.
alter table public.players
  add column elo_rating integer not null default 1200;

-- opponent_name continua existindo e sendo o texto livre padrão; esta coluna
-- é preenchida apenas quando o adversário é vinculado a um player cadastrado.
alter table public.matches
  add column opponent_player_id uuid null references public.players(id);

-- Faixas provisórias de classe a partir do ELO.
create or replace function public.classe_from_elo(elo integer)
returns text
language sql
immutable
as $$
  select case
    when elo >= 2000 then 'Classe 1'
    when elo >= 1700 then 'Classe 2'
    when elo >= 1400 then 'Classe 3'
    when elo >= 1100 then 'Classe 4'
    else 'Classe 5'
  end;
$$;

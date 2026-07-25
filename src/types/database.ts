/*
 * Tipos do schema existente no Supabase (referência fixa — nada aqui cria ou
 * altera tabelas). Os ids são tipados como string por premissa de uuid; se o
 * schema real usar bigint, ajuste apenas estes aliases.
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

export type MatchRow = {
  id: string;
  owner_id: string;
  player_id: string;
  opponent_name: string;
  match_date: string;
  location: string | null;
  best_of: number;
  status: MatchStatus;
  /* true: game comum sem vantagem — em 40-40 o próximo ponto fecha o game. */
  no_ad: boolean | null;
  /* true: o set decisivo é um único match tiebreak, sem games. */
  final_set_match_tiebreak: boolean | null;
  /* Alvo de pontos do match tiebreak; null usa o padrão de 10. */
  match_tiebreak_points_to: number | null;
}

export type MatchInsert = {
  id?: string;
  owner_id: string;
  player_id: string;
  opponent_name: string;
  match_date?: string;
  location?: string | null;
  best_of: number;
  status?: MatchStatus;
  no_ad?: boolean | null;
  final_set_match_tiebreak?: boolean | null;
  match_tiebreak_points_to?: number | null;
}

export type MatchUpdate = Partial<MatchInsert>;

export type SetRow = {
  id: string;
  match_id: string;
  set_number: number;
  player_games: number;
  opponent_games: number;
  tiebreak_player_points: number | null;
  tiebreak_opponent_points: number | null;
  winner: Side | null;
}

export type SetInsert = {
  id?: string;
  match_id: string;
  set_number: number;
  player_games?: number;
  opponent_games?: number;
  tiebreak_player_points?: number | null;
  tiebreak_opponent_points?: number | null;
  winner?: Side | null;
}

export type SetUpdate = Partial<SetInsert>;

export type StatEventRow = {
  id: string;
  match_id: string;
  set_number: number;
  game_number: number;
  point_number: number;
  server: Side;
  stroke: Stroke;
  outcome: Outcome;
  is_break_point: boolean | null;
  break_point_won: boolean | null;
}

export type StatEventInsert = {
  id?: string;
  match_id: string;
  set_number: number;
  game_number: number;
  point_number: number;
  server: Side;
  stroke: Stroke;
  outcome: Outcome;
  is_break_point?: boolean | null;
  break_point_won?: boolean | null;
}

export type StatEventUpdate = Partial<StatEventInsert>;

/*
 * Premissa: a tabela players existe no banco com ao menos estas colunas
 * (id, owner_id, name). Se o schema real tiver outros campos, ajuste aqui.
 */
export type PlayerRow = {
  id: string;
  owner_id: string;
  name: string;
}

export type PlayerInsert = {
  id?: string;
  owner_id: string;
  name: string;
}

export type PlayerUpdate = Partial<PlayerInsert>;

export type MatchStatsSummaryRow = {
  match_id: string;
  aces: number;
  duplas_faltas: number;
  pct_primeiro_saque: number | null;
  pct_pontos_ganhos_primeiro_saque: number | null;
  pct_pontos_ganhos_segundo_saque: number | null;
  winners_total: number;
  winners_forehand: number;
  winners_backhand: number;
  winners_voleio: number;
  winners_smash: number;
  erros_nao_forcados_total: number;
  erros_nao_forcados_forehand: number;
  erros_nao_forcados_backhand: number;
  erros_nao_forcados_voleio: number;
  erros_nao_forcados_smash: number;
  break_points_enfrentados: number;
  break_points_convertidos: number;
  break_points_a_favor: number;
  break_points_convertidos_a_favor: number;
  erros_forcados_total: number;
  erros_forcados_forehand: number;
  erros_forcados_backhand: number;
  erros_forcados_voleio: number;
  erros_forcados_smash: number;
  pontos_totais_jogados: number;
  pontos_totais_ganhos: number;
  pct_pontos_ganhos: number | null;
}

export type Database = {
  public: {
    Tables: {
      matches: {
        Row: MatchRow;
        Insert: MatchInsert;
        Update: MatchUpdate;
        Relationships: [];
      };
      sets: {
        Row: SetRow;
        Insert: SetInsert;
        Update: SetUpdate;
        Relationships: [];
      };
      stat_events: {
        Row: StatEventRow;
        Insert: StatEventInsert;
        Update: StatEventUpdate;
        Relationships: [];
      };
      players: {
        Row: PlayerRow;
        Insert: PlayerInsert;
        Update: PlayerUpdate;
        Relationships: [];
      };
    };
    Views: {
      match_stats_summary: {
        Row: MatchStatsSummaryRow;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      // TEMP: gen manual, confirmar com supabase gen types na linha alterada
      account_badges: {
        Row: {
          account_id: string
          badge_code: string
          earned_at: string
          id: string
          match_id: string
        }
        Insert: {
          account_id: string
          badge_code: string
          earned_at?: string
          id?: string
          match_id: string
        }
        Update: {
          account_id?: string
          badge_code?: string
          earned_at?: string
          id?: string
          match_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_badges_badge_code_fkey"
            columns: ["badge_code"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "account_badges_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      // TEMP: gen manual, confirmar com supabase gen types na linha alterada
      badges: {
        Row: {
          code: string
          description: string
          name: string
        }
        Insert: {
          code: string
          description: string
          name: string
        }
        Update: {
          code?: string
          description?: string
          name?: string
        }
        Relationships: []
      }
      // TEMP: gen manual, confirmar com supabase gen types na linha alterada
      brecho_listings: {
        Row: {
          category: string
          condition: string
          created_at: string
          description: string | null
          id: string
          image_paths: string[]
          location: string | null
          price: number | null
          seller_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          condition: string
          created_at?: string
          description?: string | null
          id?: string
          image_paths?: string[]
          location?: string | null
          price?: number | null
          seller_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          image_paths?: string[]
          location?: string | null
          price?: number | null
          seller_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      communities: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          created_at: string
          id: string
          invited_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
          id?: string
          status: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          best_of: number
          created_at: string | null
          ended_at: string | null
          final_set_match_tiebreak: boolean
          id: string
          location: string | null
          match_date: string
          match_tiebreak_points_to: number
          no_ad: boolean
          opponent_name: string | null
          opponent_player_id: string | null
          owner_id: string
          player_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          best_of?: number
          created_at?: string | null
          ended_at?: string | null
          final_set_match_tiebreak?: boolean
          id?: string
          location?: string | null
          match_date: string
          match_tiebreak_points_to?: number
          no_ad?: boolean
          opponent_name?: string | null
          opponent_player_id?: string | null
          owner_id?: string
          player_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          best_of?: number
          created_at?: string | null
          ended_at?: string | null
          final_set_match_tiebreak?: boolean
          id?: string
          location?: string | null
          match_date?: string
          match_tiebreak_points_to?: number
          no_ad?: boolean
          opponent_name?: string | null
          opponent_player_id?: string | null
          owner_id?: string
          player_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_opponent_player_id_fkey"
            columns: ["opponent_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      // TEMP: gen manual, confirmar com supabase gen types na linha alterada
      matchmaking_notifications: {
        Row: {
          account_id: string
          created_at: string
          id: string
          requested_by: string
          status: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          requested_by: string
          status?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          requested_by?: string
          status?: string
        }
        Relationships: []
      }
      // TEMP: gen manual, confirmar com supabase gen types na linha alterada
      matchmaking_profiles: {
        Row: {
          account_id: string
          available_days: number[]
          available_end_time: string | null
          available_start_time: string | null
          is_active: boolean
          location: unknown
          search_radius_km: number
          skill_level: string
          updated_at: string
        }
        Insert: {
          account_id: string
          available_days?: number[]
          available_end_time?: string | null
          available_start_time?: string | null
          is_active?: boolean
          location: unknown
          search_radius_km?: number
          skill_level: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          available_days?: number[]
          available_end_time?: string | null
          available_start_time?: string | null
          is_active?: boolean
          location?: unknown
          search_radius_km?: number
          skill_level?: string
          updated_at?: string
        }
        Relationships: []
      }
      player_editors: {
        Row: {
          created_at: string
          editor_id: string
          granted_by: string
          id: string
          player_id: string
          status: string
        }
        Insert: {
          created_at?: string
          editor_id: string
          granted_by: string
          id?: string
          player_id: string
          status?: string
        }
        Update: {
          created_at?: string
          editor_id?: string
          granted_by?: string
          id?: string
          player_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_editors_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string | null
          elo_rating: number
          id: string
          name: string
          owner_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          elo_rating?: number
          id?: string
          name: string
          owner_id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          elo_rating?: number
          id?: string
          name?: string
          owner_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          created_at: string
          id: string
          image_path: string | null
          link_preview: Json | null
          link_url: string | null
          text_content: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          image_path?: string | null
          link_preview?: Json | null
          link_url?: string | null
          text_content: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          image_path?: string | null
          link_preview?: Json | null
          link_url?: string | null
          text_content?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_private: boolean
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          is_private?: boolean
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_private?: boolean
        }
        Relationships: []
      }
      sets: {
        Row: {
          id: string
          match_id: string
          opponent_games: number
          player_games: number
          set_number: number
          tiebreak_opponent_points: number | null
          tiebreak_player_points: number | null
          winner: string | null
        }
        Insert: {
          id?: string
          match_id: string
          opponent_games?: number
          player_games?: number
          set_number: number
          tiebreak_opponent_points?: number | null
          tiebreak_player_points?: number | null
          winner?: string | null
        }
        Update: {
          id?: string
          match_id?: string
          opponent_games?: number
          player_games?: number
          set_number?: number
          tiebreak_opponent_points?: number | null
          tiebreak_player_points?: number | null
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match_stats_summary"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "sets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      stat_events: {
        Row: {
          break_point_won: boolean | null
          created_at: string | null
          game_number: number
          id: string
          is_break_point: boolean
          match_id: string
          outcome: string
          point_number: number
          server: string
          set_number: number
          stroke: string | null
        }
        Insert: {
          break_point_won?: boolean | null
          created_at?: string | null
          game_number: number
          id?: string
          is_break_point?: boolean
          match_id: string
          outcome: string
          point_number: number
          server: string
          set_number: number
          stroke?: string | null
        }
        Update: {
          break_point_won?: boolean | null
          created_at?: string | null
          game_number?: number
          id?: string
          is_break_point?: boolean
          match_id?: string
          outcome?: string
          point_number?: number
          server?: string
          set_number?: number
          stroke?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stat_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match_stats_summary"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "stat_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      match_stats_summary: {
        Row: {
          aces: number | null
          break_points_a_favor: number | null
          break_points_convertidos: number | null
          break_points_convertidos_a_favor: number | null
          break_points_enfrentados: number | null
          duplas_faltas: number | null
          erros_forcados_backhand: number | null
          erros_forcados_forehand: number | null
          erros_forcados_smash: number | null
          erros_forcados_total: number | null
          erros_forcados_voleio: number | null
          erros_nao_forcados_backhand: number | null
          erros_nao_forcados_forehand: number | null
          erros_nao_forcados_smash: number | null
          erros_nao_forcados_total: number | null
          erros_nao_forcados_voleio: number | null
          match_id: string | null
          pct_pontos_ganhos: number | null
          pct_pontos_ganhos_primeiro_saque: number | null
          pct_pontos_ganhos_segundo_saque: number | null
          pct_primeiro_saque: number | null
          pontos_totais_ganhos: number | null
          pontos_totais_jogados: number | null
          winners_backhand: number | null
          winners_forehand: number | null
          winners_smash: number | null
          winners_total: number | null
          winners_voleio: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      classe_from_elo: { Args: { elo: number }; Returns: string }
      // TEMP: gen manual, confirmar com supabase gen types na linha alterada
      find_nearby_matches: {
        Args: { p_max_results?: number }
        Returns: {
          account_id: string
          display_name: string
          distance_km: number
          skill_level: string
        }[]
      }
      follow_status_allowed: {
        Args: { p_followee_id: string; p_status: string }
        Returns: boolean
      }
      get_community_ranking: {
        Args: { p_community_id: string }
        Returns: {
          account_id: string
          derrotas: number
          display_name: string
          partidas: number
          pct_vitorias: number
          vitorias: number
        }[]
      }
      get_head_to_head: {
        Args: { player_a: string; player_b: string }
        Returns: {
          match_date: string
          match_id: string
          placar: string
          vencedor_player_id: string
        }[]
      }
      is_accepted_community_member: {
        Args: { p_community_id: string; p_uid: string }
        Returns: boolean
      }
      is_active_player_editor: {
        Args: { p_player_id: string; p_uid: string }
        Returns: boolean
      }
      is_community_creator: {
        Args: { p_community_id: string; p_uid: string }
        Returns: boolean
      }
      is_player_owner: {
        Args: { p_player_id: string; p_uid: string }
        Returns: boolean
      }
      // TEMP: gen manual, confirmar com supabase gen types na linha alterada
      match_side_account_id: {
        Args: { p_match_id: string; p_side: string }
        Returns: string
      }
      post_visible_to: {
        Args: { p_author_id: string; p_viewer_id: string }
        Returns: boolean
      }
      // TEMP: gen manual, confirmar com supabase gen types na linha alterada
      ranking_for_accounts: {
        Args: { p_account_ids: string[] }
        Returns: {
          account_id: string
          derrotas: number
          display_name: string
          partidas: number
          pct_vitorias: number
          vitorias: number
        }[]
      }
      // TEMP: gen manual, confirmar com supabase gen types na linha alterada
      request_match: {
        Args: { p_target_account_id: string }
        Returns: {
          account_id: string
          created_at: string
          id: string
          requested_by: string
          status: string
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

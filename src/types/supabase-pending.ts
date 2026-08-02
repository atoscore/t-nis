/*
 * Extensão TEMPORÁRIA do Database gerado — só para o typecheck reconhecer o
 * que supabase/migrations/20260802000003_add_follows.sql ainda vai criar no
 * banco remoto (tabela follows e profiles.is_private).
 *
 * APAGAR este arquivo assim que a migration for aplicada e
 * `supabase gen types typescript` rodar de novo: nesse ponto
 * src/types/supabase.ts já traz follows/is_private nativamente e
 * followService.ts deve voltar a importar de lá (ver Database ali).
 */

import type { Database as GeneratedDatabase } from './supabase';

type FollowStatus = 'pending' | 'accepted';

type FollowsRow = {
  id: string;
  follower_id: string;
  followee_id: string;
  status: FollowStatus;
  created_at: string;
};

type FollowsInsert = {
  id?: string;
  follower_id: string;
  followee_id: string;
  status: FollowStatus;
  created_at?: string;
};

type FollowsUpdate = Partial<FollowsInsert>;

type GeneratedTables = GeneratedDatabase['public']['Tables'];

export type Database = Omit<GeneratedDatabase, 'public'> & {
  public: Omit<GeneratedDatabase['public'], 'Tables'> & {
    Tables: Omit<GeneratedTables, 'profiles'> & {
      profiles: {
        Row: GeneratedTables['profiles']['Row'] & { is_private: boolean };
        Insert: GeneratedTables['profiles']['Insert'] & { is_private?: boolean };
        Update: GeneratedTables['profiles']['Update'] & { is_private?: boolean };
        Relationships: GeneratedTables['profiles']['Relationships'];
      };
      follows: {
        Row: FollowsRow;
        Insert: FollowsInsert;
        Update: FollowsUpdate;
        Relationships: [];
      };
    };
  };
};

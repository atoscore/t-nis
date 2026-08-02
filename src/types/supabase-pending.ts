/*
 * Extensão TEMPORÁRIA do Database gerado — só para o typecheck reconhecer o
 * que as migrations abaixo já criaram (ou vão criar) no banco remoto, mas
 * que `supabase gen types typescript` ainda não gerou em src/types/supabase.ts:
 *
 *   - 20260802000003_add_follows.sql: tabela follows, profiles.is_private
 *     (aplicada no banco; falta só regenerar os tipos)
 *   - 20260802000004_add_posts_feed.sql: posts, post_likes, post_comments
 *
 * Assim que uma migration for aplicada E `supabase gen types typescript`
 * rodar de novo, remova daqui só a parte correspondente (o resto continua
 * até a outra também estar coberta por supabase.ts) — nesse ponto
 * followService.ts/postService.ts/feedService.ts devem voltar a importar de
 * lá (ver Database ali). Quando as duas estiverem cobertas, apague este
 * arquivo.
 */

import type { Database as GeneratedDatabase } from './supabase';
import type { LinkPreview } from '../services/linkPreviewService';

type PostsRow = {
  id: string;
  author_id: string;
  text_content: string;
  image_path: string | null;
  link_url: string | null;
  link_preview: LinkPreview | null;
  created_at: string;
};

type PostsInsert = {
  id?: string;
  author_id: string;
  text_content: string;
  image_path?: string | null;
  link_url?: string | null;
  link_preview?: LinkPreview | null;
  created_at?: string;
};

type PostsUpdate = Partial<PostsInsert>;

type PostLikesRow = {
  post_id: string;
  user_id: string;
  created_at: string;
};

type PostLikesInsert = {
  post_id: string;
  user_id: string;
  created_at?: string;
};

type PostLikesUpdate = Partial<PostLikesInsert>;

type PostCommentsRow = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
};

type PostCommentsInsert = {
  id?: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at?: string;
};

type PostCommentsUpdate = Partial<PostCommentsInsert>;

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
      posts: {
        Row: PostsRow;
        Insert: PostsInsert;
        Update: PostsUpdate;
        Relationships: [];
      };
      post_likes: {
        Row: PostLikesRow;
        Insert: PostLikesInsert;
        Update: PostLikesUpdate;
        Relationships: [];
      };
      post_comments: {
        Row: PostCommentsRow;
        Insert: PostCommentsInsert;
        Update: PostCommentsUpdate;
        Relationships: [];
      };
    };
  };
};

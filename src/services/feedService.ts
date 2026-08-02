/*
 * Feed: posts do próprio viewer + de quem ele segue com status accepted,
 * do mais novo pro mais antigo. A RLS de posts (post_visible_to) garante
 * quem pode ler cada linha, mas ela sozinha é mais permissiva que o feed —
 * um post público de alguém que o viewer não segue é visível se acessado
 * direto, mas não deve aparecer aqui. Por isso o feed também filtra por
 * autor (self + accepted followees), não só confia na RLS.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/supabase-pending';
import type { PostRow } from './postService';

const db = supabase as unknown as SupabaseClient<Database>;

const DEFAULT_PAGE_SIZE = 20;

export interface FeedPage {
  posts: PostRow[];
  nextCursor: string | null;
}

async function acceptedFolloweeIds(viewerId: string): Promise<string[]> {
  const { data, error } = await db
    .from('follows')
    .select('followee_id')
    .eq('follower_id', viewerId)
    .eq('status', 'accepted');
  if (error) {
    throw new Error(`Falha ao carregar quem você segue: ${error.message}`);
  }
  return data.map((row) => row.followee_id);
}

/*
 * cursor: created_at (ISO) do último post da página anterior; omitido na
 * primeira página. nextCursor volta null quando a página não veio cheia
 * (não há mais posts a paginar).
 */
export async function getFeed(
  viewerId: string,
  cursor?: string | null,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<FeedPage> {
  const followeeIds = await acceptedFolloweeIds(viewerId);
  const authorIds = [viewerId, ...followeeIds];

  let query = db
    .from('posts')
    .select('*')
    .in('author_id', authorIds)
    .order('created_at', { ascending: false })
    .limit(pageSize);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Falha ao carregar o feed: ${error.message}`);
  }

  const posts = data ?? [];
  const nextCursor = posts.length === pageSize ? (posts[posts.length - 1]?.created_at ?? null) : null;

  return { posts, nextCursor };
}

/*
 * Regra pura de visibilidade de post, sem acesso a banco (mesmo padrão de
 * followStatus.ts): espelha post_visible_to (SQL, em
 * supabase/migrations/20260802000004_add_posts_feed.sql), que é quem de
 * fato garante a regra via RLS em posts/post_likes/post_comments e na
 * policy de Storage do bucket post-images.
 */

export interface PostVisibilityInput {
  viewerId: string;
  authorId: string;
  authorIsPrivate: boolean;
  followStatus: 'accepted' | 'pending' | null;
}

/*
 * Visível se: o viewer é o autor, OU o autor não é privado, OU existe
 * follow aceito do viewer para o autor.
 */
export function isPostVisible({
  viewerId,
  authorId,
  authorIsPrivate,
  followStatus,
}: PostVisibilityInput): boolean {
  if (viewerId === authorId) return true;
  if (!authorIsPrivate) return true;
  return followStatus === 'accepted';
}

/*
 * Posts, curtidas e comentários do feed social. Quem pode ler cada
 * post/curtida/comentário é decidido pela RLS (post_visible_to, ver
 * supabase/migrations/20260802000004_add_posts_feed.sql); aqui só ficam as
 * regras que o banco não expressa sozinho: resolver o preview do link antes
 * de gravar (cache) e alternar curtir/descurtir.
 */

import { supabase } from '../lib/supabaseClient';
import type { Json, Tables } from '../types/supabase';
import { getLinkPreview, type LinkPreview } from './linkPreviewService';

const POST_IMAGES_BUCKET = 'post-images';

export type PostRow = Tables<'posts'>;
export type PostCommentRow = Tables<'post_comments'>;

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('Usuário não autenticado: faça login novamente.');
  }
  return data.user.id;
}

export interface CreatePostInput {
  textContent: string;
  imagePath?: string | null;
  linkUrl?: string | null;
}

/*
 * O preview do link é resolvido uma única vez aqui e gravado em
 * posts.link_preview (cache); o feed nunca rechama getLinkPreview na
 * leitura.
 */
export async function createPost(input: CreatePostInput): Promise<PostRow> {
  const authorId = await requireUserId();
  const linkPreview: LinkPreview | null = input.linkUrl
    ? await getLinkPreview(input.linkUrl)
    : null;

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: authorId,
      text_content: input.textContent,
      image_path: input.imagePath ?? null,
      link_url: input.linkUrl ?? null,
      /* LinkPreview é estruturalmente JSON, mas não tem index signature — TS
       * não aceita a interface direto onde o gerado espera Json. */
      link_preview: linkPreview as Json | null,
    })
    .select()
    .single();
  if (error) {
    throw new Error(`Falha ao criar o post: ${error.message}`);
  }
  return data;
}

/* Alterna a curtida do usuário atual no post; retorna o novo estado (curtido ou não). */
export async function toggleLike(postId: string): Promise<boolean> {
  const userId = await requireUserId();

  const { data: existing, error: selectError } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();
  if (selectError) {
    throw new Error(`Falha ao verificar a curtida: ${selectError.message}`);
  }

  if (existing) {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
    if (error) {
      throw new Error(`Falha ao remover a curtida: ${error.message}`);
    }
    return false;
  }

  const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
  if (error) {
    throw new Error(`Falha ao curtir: ${error.message}`);
  }
  return true;
}

export async function addComment(postId: string, content: string): Promise<PostCommentRow> {
  const authorId = await requireUserId();
  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, author_id: authorId, content })
    .select()
    .single();
  if (error) {
    throw new Error(`Falha ao comentar: ${error.message}`);
  }
  return data;
}

/*
 * RLS só deixa o autor deletar; a mensagem não distingue "não existe" de
 * "não é seu" (mesma discrição já usada em respondToJoinRequest).
 */
export async function deletePost(postId: string): Promise<void> {
  const { data, error } = await supabase.from('posts').delete().eq('id', postId).select().maybeSingle();
  if (error) {
    throw new Error(`Falha ao excluir o post: ${error.message}`);
  }
  if (!data) {
    throw new Error('Post não encontrado ou você não é o autor.');
  }
}

/*
 * Bucket privado (post-images): sem URL pública. O path fica em
 * `{authorId}/{uuid}.{extensão}`, pra bater com a policy de Storage que só
 * deixa cada um fazer upload/exclusão na própria pasta.
 */
export async function uploadPostImage(file: Blob, extension: string): Promise<string> {
  const authorId = await requireUserId();
  const path = `${authorId}/${crypto.randomUUID()}.${extension.replace(/^\./, '')}`;

  const { error } = await supabase.storage.from(POST_IMAGES_BUCKET).upload(path, file);
  if (error) {
    throw new Error(`Falha ao enviar a imagem: ${error.message}`);
  }
  return path;
}

/*
 * Signed URL temporária: só é emitida se a policy de select do bucket
 * (post_visible_to, mesma regra de posts/post_likes/post_comments) deixar —
 * é isso que confirma a visibilidade antes de expor a imagem.
 */
export async function getPostImageUrl(
  imagePath: string,
  expiresInSeconds = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .createSignedUrl(imagePath, expiresInSeconds);
  if (error || !data) {
    throw new Error(
      `Falha ao gerar a URL da imagem: ${error?.message ?? 'preview indisponível'}`
    );
  }
  return data.signedUrl;
}

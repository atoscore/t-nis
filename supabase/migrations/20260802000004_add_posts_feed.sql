-- Posts, curtidas e comentários (feed social), sobre follows/
-- profiles.is_private já existentes (20260802000003_add_follows.sql).

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id),
  text_content text not null,
  image_path text null,
  link_url text null,
  link_preview jsonb null,
  created_at timestamptz not null default now()
);

create index posts_author_id_idx on public.posts (author_id);
create index posts_created_at_idx on public.posts (created_at desc);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  content text not null,
  created_at timestamptz not null default now()
);

create index post_comments_post_id_idx on public.post_comments (post_id);

alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

-- Regra única de visibilidade, reaproveitada em posts/post_likes/
-- post_comments e na policy de Storage do bucket post-images (uma
-- implementação só, não duas): viewer é o autor, OU o autor é público
-- (mesmo teste que follow_status_allowed já faz pra decidir se um follow
-- pode nascer 'accepted' contra esse followee — reaproveitado aqui em vez
-- de reconsultar profiles.is_private do zero), OU existe follow aceito
-- viewer -> autor.
--
-- Espelha isPostVisible em src/services/postVisibility.ts (regra pura,
-- testada em tests/postVisibility.test.ts) — mesmo padrão de
-- follow_status_allowed/followService.decideFollowStatus: a função pura
-- documenta e testa a regra, o banco é quem de fato a impõe via RLS.
create or replace function public.post_visible_to(p_author_id uuid, p_viewer_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select
    p_viewer_id = p_author_id
    or public.follow_status_allowed(p_author_id, 'accepted')
    or exists (
      select 1 from public.follows f
      where f.follower_id = p_viewer_id
        and f.followee_id = p_author_id
        and f.status = 'accepted'
    );
$$;

create policy posts_select_visible on public.posts
  for select
  using (public.post_visible_to(author_id, auth.uid()));

create policy posts_insert_self on public.posts
  for insert
  with check (author_id = auth.uid());

create policy posts_delete_author on public.posts
  for delete
  using (author_id = auth.uid());

create policy post_likes_select_visible on public.post_likes
  for select
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_likes.post_id
        and public.post_visible_to(p.author_id, auth.uid())
    )
  );

create policy post_likes_insert_self on public.post_likes
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.posts p
      where p.id = post_likes.post_id
        and public.post_visible_to(p.author_id, auth.uid())
    )
  );

create policy post_likes_delete_self on public.post_likes
  for delete
  using (user_id = auth.uid());

create policy post_comments_select_visible on public.post_comments
  for select
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_comments.post_id
        and public.post_visible_to(p.author_id, auth.uid())
    )
  );

create policy post_comments_insert_self on public.post_comments
  for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.posts p
      where p.id = post_comments.post_id
        and public.post_visible_to(p.author_id, auth.uid())
    )
  );

-- Bucket privado: sem URL pública. Leitura só via signed URL — é a policy
-- de select abaixo (post_visible_to, mesma regra de nome) quem de fato
-- confirma a visibilidade nesse momento, porque createSignedUrl passa pela
-- RLS de storage.objects como qualquer select.
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', false)
on conflict (id) do nothing;

-- Além do post visível, o próprio dono do arquivo sempre pode lê-lo — cobre
-- o preview durante a composição do post, antes da linha em posts existir.
create policy post_images_select_visible on storage.objects
  for select
  using (
    bucket_id = 'post-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.posts p
        where p.image_path = name
          and public.post_visible_to(p.author_id, auth.uid())
      )
    )
  );

-- Upload/exclusão só na própria pasta ({auth.uid()}/...), pra sempre existir
-- um dono claro do objeto.
create policy post_images_insert_own_folder on storage.objects
  for insert
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy post_images_delete_own_folder on storage.objects
  for delete
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

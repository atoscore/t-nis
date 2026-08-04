-- Brechó: quadro de classificados de equipamento (raquete, cordas, tênis,
-- roupa, bolsa etc.). Sem transação de dinheiro no app — price é só o valor
-- pedido, exibido pra informar; combinar e pagar acontece fora do app. Sem
-- carrinho, sem pedido, sem pagamento: só o anúncio e seu ciclo de vida
-- (disponível -> vendido/retirado).
create table public.brecho_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id),
  title text not null,
  description text null,
  category text not null check (
    category in ('raquete', 'cordas', 'calcado', 'roupa', 'bolsa', 'outro')
  ),
  condition text not null check (condition in ('novo', 'seminovo', 'usado')),
  price numeric(10, 2) null check (price is null or price >= 0),
  location text null,
  status text not null default 'available' check (status in ('available', 'sold', 'removed')),
  image_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index brecho_listings_seller_id_idx on public.brecho_listings (seller_id);
create index brecho_listings_status_created_at_idx
  on public.brecho_listings (status, created_at desc);

alter table public.brecho_listings enable row level security;

-- Quadro é público entre autenticados: qualquer um vê anúncios 'available'.
-- O vendedor também vê os próprios em qualquer status (pra gerenciar
-- 'sold'/'removed' e reabrir se precisar).
create policy brecho_listings_select_available_or_own on public.brecho_listings
  for select
  using (status = 'available' or seller_id = auth.uid());

create policy brecho_listings_insert_self on public.brecho_listings
  for insert
  with check (seller_id = auth.uid());

-- Só o vendedor edita (preço, descrição, marcar como vendido/removido).
create policy brecho_listings_update_seller on public.brecho_listings
  for update
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

create policy brecho_listings_delete_seller on public.brecho_listings
  for delete
  using (seller_id = auth.uid());

-- Mesma técnica de updated_at automático — não existe helper genérico no
-- schema atual pra isso, então a função é local a esta tabela.
create or replace function public.brecho_listings_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger brecho_listings_touch_updated_at
  before update on public.brecho_listings
  for each row
  execute function public.brecho_listings_set_updated_at();

-- Bucket privado, mesmo padrão de post-images (20260802000004): leitura só
-- via signed URL, RLS reaplicada em storage.objects na mesma condição de
-- visibilidade do anúncio (available ou dono), upload/remoção só na própria
-- pasta ({auth.uid()}/...).
insert into storage.buckets (id, name, public)
values ('brecho-images', 'brecho-images', false)
on conflict (id) do nothing;

create policy brecho_images_select_visible on storage.objects
  for select
  using (
    bucket_id = 'brecho-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.brecho_listings l
        where l.image_paths @> array[name]
          and (l.status = 'available' or l.seller_id = auth.uid())
      )
    )
  );

create policy brecho_images_insert_own_folder on storage.objects
  for insert
  with check (
    bucket_id = 'brecho-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy brecho_images_delete_own_folder on storage.objects
  for delete
  using (
    bucket_id = 'brecho-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

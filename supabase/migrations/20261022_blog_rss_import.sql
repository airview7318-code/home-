-- Safe, additive migration for admin-reviewed Naver RSS imports.
-- This keeps all existing property/post records and visibility unchanged.
alter table public.properties
  add column if not exists source_url text,
  add column if not exists naver_post_id text;

create unique index if not exists properties_naver_post_id_uidx
  on public.properties(naver_post_id) where naver_post_id is not null;

alter table public.blog_posts
  add column if not exists source_url text;

create unique index if not exists blog_posts_source_url_uidx
  on public.blog_posts(source_url) where source_url is not null;

create or replace view public.properties_public
  with (security_barrier=true, security_invoker=true) as
  select id,title,property_type,transaction_type,area,floor,area_m2,contract_area_m2,
         price,deposit,rent,maintenance_fee,available_date,use_type,recommended_business,
         parking,description,image_url,created_at,updated_at,source_url
  from public.properties
  where is_public=true and status='published';

grant select on public.properties_public to anon, authenticated;
grant select(source_url) on public.properties to anon;

create or replace view public.blog_posts_public
  with (security_barrier=true, security_invoker=true) as
  select id,title,slug,category,excerpt,body,cover_url,author,seo_title,seo_description,
         published_at,created_at,updated_at,source_url
  from public.blog_posts
  where is_published=true and published_at is not null and published_at<=now();

grant select on public.blog_posts_public to anon, authenticated;
grant select(source_url) on public.blog_posts to anon;


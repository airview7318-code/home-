-- Run in Supabase SQL editor. Create admin users through Supabase Auth, then set
-- app_metadata.role = 'admin' using a trusted server/admin console.
create extension if not exists pgcrypto;
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(), title text not null,
  property_type text not null, transaction_type text not null,
  area text, address text, building_name text, floor text, area_m2 numeric,
  contract_area_m2 numeric, price numeric, deposit numeric, rent numeric,
  maintenance_fee numeric, premium numeric, available_date date,
  use_type text, recommended_business text, parking text, description text,
  image_url text, source_url text, naver_post_id text,
  status text not null default 'preparing', is_public boolean not null default false,
  internal_note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint properties_status_check check(status in ('preparing','published','consulting','contracting','completed','closed'))
);
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(), request_type text not null,
  name text not null, phone text not null, property_type text, area text, details text,
  consent boolean not null check(consent=true), created_at timestamptz not null default now(), status text not null default '신규 접수', admin_note text
);
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique,
  category text not null, excerpt text, body text not null, cover_url text, author text not null default '검단 윤소장',
  seo_title text, seo_description text, source_url text, is_published boolean not null default false,
  published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(), name text not null, phone text,
  client_type text, source text, desired_conditions jsonb not null default '{}',
  status text not null default '신규 접수', next_contact_at timestamptz,
  assigned_to text, created_at timestamptz not null default now(), admin_note text
);
create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(), client_id uuid references public.clients(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null, note text not null,
  created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create or replace function public.is_buja_admin() returns boolean language sql stable as $$
 select coalesce(auth.jwt()->'app_metadata'->>'role'='admin',false)
$$;
alter table public.properties enable row level security;
alter table public.inquiries enable row level security;
alter table public.clients enable row level security;
alter table public.consultations enable row level security;
alter table public.blog_posts enable row level security;
drop policy if exists "admins manage properties" on public.properties;
create policy "admins manage properties" on public.properties for all to authenticated using (public.is_buja_admin()) with check (public.is_buja_admin());
drop policy if exists "visitors read public properties" on public.properties;
create policy "visitors read public properties" on public.properties for select to anon, authenticated using (is_public=true and status='published');
create or replace view public.properties_public with (security_barrier=true, security_invoker=true) as
 select id,title,property_type,transaction_type,area,floor,area_m2,contract_area_m2,
        price,deposit,rent,maintenance_fee,available_date,use_type,recommended_business,
        parking,description,image_url,created_at,updated_at,source_url
 from public.properties where is_public=true and status='published';
grant select on public.properties_public to anon, authenticated;
drop policy if exists "admins manage blog posts" on public.blog_posts;
create policy "admins manage blog posts" on public.blog_posts for all to authenticated using (public.is_buja_admin()) with check (public.is_buja_admin());
drop policy if exists "visitors read published posts" on public.blog_posts;
create policy "visitors read published posts" on public.blog_posts for select to anon, authenticated using (is_published=true and published_at is not null and published_at<=now());
create or replace view public.blog_posts_public with (security_barrier=true, security_invoker=true) as
 select id,title,slug,category,excerpt,body,cover_url,author,seo_title,seo_description,published_at,created_at,updated_at,source_url
 from public.blog_posts where is_published=true and published_at is not null and published_at<=now();
grant select on public.blog_posts_public to anon, authenticated;
drop policy if exists "visitors submit inquiries" on public.inquiries;
create policy "visitors submit inquiries" on public.inquiries for insert to anon, authenticated with check (consent=true and status='신규 접수' and admin_note is null and length(name) between 1 and 80 and length(phone) between 7 and 30);
drop policy if exists "admins read and manage inquiries" on public.inquiries;
create policy "admins read and manage inquiries" on public.inquiries for all to authenticated using (public.is_buja_admin()) with check (public.is_buja_admin());
drop policy if exists "admins manage clients" on public.clients;
create policy "admins manage clients" on public.clients for all to authenticated using (public.is_buja_admin()) with check (public.is_buja_admin());
drop policy if exists "admins manage consultations" on public.consultations;
create policy "admins manage consultations" on public.consultations for all to authenticated using (public.is_buja_admin()) with check (public.is_buja_admin());
revoke all on public.properties from anon;
grant select(id,title,property_type,transaction_type,area,floor,area_m2,contract_area_m2,price,deposit,rent,maintenance_fee,available_date,use_type,recommended_business,parking,description,image_url,source_url,created_at,updated_at,is_public,status) on public.properties to anon;
revoke all on public.blog_posts from anon;
grant select(id,title,slug,category,excerpt,body,cover_url,author,seo_title,seo_description,source_url,published_at,created_at,updated_at,is_published) on public.blog_posts to anon;
grant select, insert, update, delete on public.properties to authenticated;
grant insert on public.inquiries to anon, authenticated;
grant select, update, delete on public.inquiries to authenticated;
grant select, insert, update, delete on public.clients, public.consultations to authenticated;
grant select, insert, update, delete on public.blog_posts to authenticated;
revoke insert on public.inquiries from anon, authenticated;
grant insert(request_type,name,phone,property_type,area,details,consent) on public.inquiries to anon, authenticated;
create index if not exists properties_public_created_idx on public.properties(is_public,status,created_at desc);
create index if not exists inquiries_created_idx on public.inquiries(created_at desc);
create index if not exists blog_posts_published_idx on public.blog_posts(is_published,published_at desc);
create unique index if not exists properties_naver_post_id_uidx on public.properties(naver_post_id) where naver_post_id is not null;
create unique index if not exists blog_posts_source_url_uidx on public.blog_posts(source_url) where source_url is not null;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;
drop trigger if exists properties_touch_updated on public.properties;
create trigger properties_touch_updated before update on public.properties for each row execute function public.touch_updated_at();
drop trigger if exists blog_posts_touch_updated on public.blog_posts;
create trigger blog_posts_touch_updated before update on public.blog_posts for each row execute function public.touch_updated_at();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('buja-media','buja-media',true,8388608,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do update set public=true,file_size_limit=8388608,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "public reads buja media" on storage.objects;
create policy "public reads buja media" on storage.objects for select to anon,authenticated using(bucket_id='buja-media');
drop policy if exists "admins upload buja media" on storage.objects;
create policy "admins upload buja media" on storage.objects for insert to authenticated with check(bucket_id='buja-media' and public.is_buja_admin());
drop policy if exists "admins update buja media" on storage.objects;
create policy "admins update buja media" on storage.objects for update to authenticated using(bucket_id='buja-media' and public.is_buja_admin()) with check(bucket_id='buja-media' and public.is_buja_admin());
drop policy if exists "admins delete buja media" on storage.objects;
create policy "admins delete buja media" on storage.objects for delete to authenticated using(bucket_id='buja-media' and public.is_buja_admin());

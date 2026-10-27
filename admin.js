const cfg=window.BUJA_CONFIG||{},url=(cfg.supabaseUrl||'').replace(/\/$/,''),key=cfg.supabaseAnonKey||'';let token='',adminUserId='',properties=[],posts=[],clients=[],developments=[]���m�G����ƭy�완료','비공개')),
  location text, supply_scale text, area_info text, price_info text, schedule text,
  image_url text, source_url text, description text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
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
alter table public.developments enable row level security;
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
drop policy if exists "admins manage developments" on public.developments;
create policy "admins manage developments" on public.developments for all to authenticated using (public.is_buja_admin()) with check (public.is_buja_admin());
drop policy if exists "visitors read public developments" on public.developments;
create policy "visitors read public developments" on public.developments for select to anon, authenticated using (is_public=true and status <> '비공개');
create or replace view public.developments_public with (security_barrier=true) as
 select id,title,category,status,location,supply_scale,area_info,price_info,schedule,image_url,source_url,description,created_at,updated_at
 from public.developments where is_public=true and status <> '비공개';
grant select on public.developments_public to anon, authenticated;
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
grant select, insert, update, delete on public.developments to authenticated;
revoke insert on public.inquiries from anon, authenticated;
grant insert(request_type,name,phone,property_type,area,details,consent) on public.inquiries to anon, authenticated;
create index if not exists properties_public_created_idx on public.properties(is_public,status,created_at desc);
create index if not exists inquiries_created_idx on public.inquiries(created_at desc);
create index if not exists blog_posts_published_idx on public.blog_posts(is_published,published_at desc);
create unique index if not exists properties_naver_post_id_uidx on public.properties(naver_post_id) where naver_post_id is not null;
create unique index if not exists blog_posts_source_url_uidx on public.blog_posts(source_url) where source_url is not null;
create index if not exists developments_public_updated_idx on public.developments(is_public,status,updated_at desc);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;
drop trigger if exists properties_touch_updated on public.properties;
create trigger properties_touch_updated before update on public.properties for each row execute function public.touch_updated_at();
drop trigger if exists blog_posts_touch_updated on public.blog_posts;
create trigger blog_posts_touch_updated before update on public.blog_posts for each row execute function public.touch_updated_at();
drop trigger if exists developments_touch_updated on public.developments;
create trigger developments_touch_updated before update on public.developments for each row execute function public.touch_updated_at();

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

-- Admin-only anonymous website visit statistics.
create table if not exists public.site_visits (
  visitor_id uuid not null,
  first_seen_at timestamptz not null default now(),
  visit_date date generated always as ((first_seen_at at time zone 'Asia/Seoul')::date) stored,
  constraint site_visits_visitor_day_unique unique (visitor_id, visit_date)
);
create index if not exists site_visits_visit_date_idx on public.site_visits (visit_date);

alter table public.site_visits enable row level security;
revoke all on table public.site_visits from public, anon, authenticated;
grant insert (visitor_id) on table public.site_visits to anon, authenticated;

create table if not exists public.site_visit_daily (
  visit_date date primary key,
  visitors bigint not null default 0 check (visitors >= 0)
);
revoke all on table public.site_visit_daily from public, anon, authenticated;

drop policy if exists "record anonymous site visits" on public.site_visits;
create policy "record anonymous site visits"
  on public.site_visits for insert to anon, authenticated
  with check (visitor_id is not null);

create or replace function public.aggregate_site_visit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.site_visit_daily (visit_date, visitors)
  values (new.visit_date, 1)
  on conflict (visit_date) do update
    set visitors = public.site_visit_daily.visitors + 1;

  delete from public.site_visits
  where visit_date < ((now() at time zone 'Asia/Seoul')::date - interval '13 months')::date;

  return new;
end;
$$;

revoke all on function public.aggregate_site_visit() from public, anon, authenticated;
drop trigger if exists aggregate_site_visit on public.site_visits;
create trigger aggregate_site_visit
  after insert on public.site_visits
  for each row execute function public.aggregate_site_visit();

create or replace function public.get_admin_visit_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  today_kst date := (now() at time zone 'Asia/Seoul')::date;
  result jsonb;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total_visits', (select coalesce(sum(visitors), 0) from public.site_visit_daily),
    'today_unique', (select coalesce(visitors, 0) from public.site_visit_daily where visit_date = today_kst),
    'daily', (
      select coalesce(
        jsonb_agg(jsonb_build_object('date', to_char(days.day, 'YYYY-MM-DD'), 'visitors', coalesce(visits.visitors, 0)) order by days.day desc),
        '[]'::jsonb
      )
      from generate_series((today_kst - 6)::timestamp, today_kst::timestamp, interval '1 day') as days(day)
      left join public.site_visit_daily as visits on visits.visit_date = days.day::date
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_admin_visit_stats() from public, anon;
grant execute on function public.get_admin_visit_stats() to authenticated;


-- Classify daily unique visits by a safe, coarse external source category.
alter table public.site_visits
  add column if not exists referrer_source text not null default 'direct'
  check (referrer_source in ('direct','naver','google','youtube','instagram','kakao','other'));

grant insert (visitor_id, referrer_source) on table public.site_visits to anon, authenticated;

create table if not exists public.site_visit_source_daily (
  visit_date date not null,
  referrer_source text not null check (referrer_source in ('direct','naver','google','youtube','instagram','kakao','other')),
  visitors bigint not null default 0 check (visitors >= 0),
  primary key (visit_date, referrer_source)
);
revoke all on table public.site_visit_source_daily from public, anon, authenticated;

create or replace function public.aggregate_site_visit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.site_visit_daily (visit_date, visitors)
  values (new.visit_date, 1)
  on conflict (visit_date) do update
    set visitors = public.site_visit_daily.visitors + 1;

  insert into public.site_visit_source_daily (visit_date, referrer_source, visitors)
  values (new.visit_date, new.referrer_source, 1)
  on conflict (visit_date, referrer_source) do update
    set visitors = public.site_visit_source_daily.visitors + 1;

  delete from public.site_visits
  where visit_date < ((now() at time zone 'Asia/Seoul')::date - interval '13 months')::date;
  return new;
end;
$$;

create or replace function public.get_admin_visit_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  today_kst date := (now() at time zone 'Asia/Seoul')::date;
  result jsonb;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total_visits', (select coalesce(sum(visitors), 0) from public.site_visit_daily),
    'today_unique', (select coalesce(visitors, 0) from public.site_visit_daily where visit_date = today_kst),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('date', to_char(days.day, 'YYYY-MM-DD'), 'visitors', coalesce(visits.visitors, 0)) order by days.day desc), '[]'::jsonb)
      from generate_series((today_kst - 6)::timestamp, today_kst::timestamp, interval '1 day') as days(day)
      left join public.site_visit_daily as visits on visits.visit_date = days.day::date
    ),
    'sources_today', (
      select coalesce(jsonb_agg(jsonb_build_object('source', referrer_source, 'visitors', visitors) order by visitors desc, referrer_source), '[]'::jsonb)
      from public.site_visit_source_daily where visit_date = today_kst
    )
  ) into result;
  return result;
end;
$$;
revoke all on function public.get_admin_visit_stats() from public, anon;
grant execute on function public.get_admin_visit_stats() to authenticated;

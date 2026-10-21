-- 신규 분양 정보 관리: 일반 매물과 분리하여 저장하고 공개 승인된 정보만 노출한다.
create table if not exists public.developments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('신규 분양 상가','신규 분양 아파트','신규 분양 오피스텔','기타 분양')),
  status text not null default '분양 예정' check (status in ('분양 예정','분양 중','잔여 호실 분양','분양 완료','비공개')),
  location text,
  supply_scale text,
  area_info text,
  price_info text,
  schedule text,
  image_url text,
  source_url text,
  description text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.developments enable row level security;
drop policy if exists "admins manage developments" on public.developments;
create policy "admins manage developments" on public.developments for all to authenticated
  using (public.is_buja_admin()) with check (public.is_buja_admin());
drop policy if exists "visitors read public developments" on public.developments;
create policy "visitors read public developments" on public.developments for select to anon, authenticated
  using (is_public=true and status <> '비공개');

create or replace view public.developments_public with (security_barrier=true) as
  select id,title,category,status,location,supply_scale,area_info,price_info,schedule,
         image_url,source_url,description,created_at,updated_at
  from public.developments where is_public=true and status <> '비공개';
grant select on public.developments_public to anon, authenticated;
revoke all on public.developments from anon;
grant select(id,title,category,status,location,supply_scale,area_info,price_info,schedule,image_url,source_url,description,is_public,created_at,updated_at) on public.developments to authenticated;
grant insert(title,category,status,location,supply_scale,area_info,price_info,schedule,image_url,source_url,description,is_public) on public.developments to authenticated;
grant update(title,category,status,location,supply_scale,area_info,price_info,schedule,image_url,source_url,description,is_public) on public.developments to authenticated;
create index if not exists developments_public_updated_idx on public.developments(is_public,status,updated_at desc);
drop trigger if exists developments_touch_updated on public.developments;
create trigger developments_touch_updated before update on public.developments for each row execute function public.touch_updated_at();

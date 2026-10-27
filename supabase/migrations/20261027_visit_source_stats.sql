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

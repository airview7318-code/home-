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

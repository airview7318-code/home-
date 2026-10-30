create table if not exists public.talktalk_pending (
  token uuid primary key,
  encrypted_payload text not null,
  payload_iv text not null,
  payload_tag text not null,
  status text not null default 'ready' check (status in ('ready', 'prompted')),
  user_hash text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists talktalk_pending_expires_at_idx
  on public.talktalk_pending (expires_at);

alter table public.talktalk_pending enable row level security;
revoke all on table public.talktalk_pending from anon, authenticated;
grant all on table public.talktalk_pending to service_role;

create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
    from cron.job
    where jobname = 'buja-talktalk-pending-expiry'
    limit 1;
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
  perform cron.schedule(
    'buja-talktalk-pending-expiry',
    '*/5 * * * *',
    'delete from public.talktalk_pending where expires_at <= now()'
  );
end;
$$;


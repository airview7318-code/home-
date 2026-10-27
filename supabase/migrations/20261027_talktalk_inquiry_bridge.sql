-- Adds a one-time opaque token used to link a submitted inquiry to the
-- visitor's TalkTalk conversation. No Naver user identifier is exposed to the site.
alter table public.inquiries
  add column if not exists talktalk_token uuid not null default gen_random_uuid(),
  add column if not exists talktalk_consent boolean not null default false,
  add column if not exists talktalk_delivery_status text not null default '대기',
  add column if not exists talktalk_sent_at timestamptz;

create unique index if not exists inquiries_talktalk_token_uidx
  on public.inquiries (talktalk_token);

grant insert (talktalk_token, talktalk_consent) on public.inquiries to anon, authenticated;

drop policy if exists "visitors submit inquiries" on public.inquiries;
create policy "visitors submit inquiries"
  on public.inquiries
  for insert to anon, authenticated
  with check (
    consent = true
    and status = '신규 접수'
    and admin_note is null
    and talktalk_token is not null
    and length(name) between 1 and 80
    and length(phone) between 7 and 30
  );

-- Requires pg_net and Supabase Vault to be enabled.
-- Store the deployed Google Apps Script URL (including its secret query parameter)
-- in Vault as `inquiry_notification_url` before creating this trigger.

create or replace function public.notify_new_inquiry_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  notifier_url text;
begin
  select decrypted_secret
    into notifier_url
    from vault.decrypted_secrets
   where name = 'inquiry_notification_url'
   limit 1;

  if notifier_url is not null then
    perform net.http_post(
      url := notifier_url,
      body := jsonb_build_object(
        'type', 'INSERT',
        'schema', 'public',
        'table', 'inquiries',
        'record', jsonb_build_object(
          'id', new.id,
          'request_type', new.request_type,
          'created_at', new.created_at
        )
      ),
      headers := jsonb_build_object('Content-Type', 'application/json'),
      timeout_milliseconds := 5000
    );
  end if;
  return new;
end;
$$;

revoke all on function public.notify_new_inquiry_email() from public, anon, authenticated;

drop trigger if exists notify_new_inquiry_email on public.inquiries;
create trigger notify_new_inquiry_email
  after insert on public.inquiries
  for each row
  execute function public.notify_new_inquiry_email();

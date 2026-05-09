-- Phase 5a: track Anthropic Batch API submissions for next-day lesson body
-- pre-generation. See db-schema.md "lessons" / roadmap.md "Phase 5 / 翌日レッスンの事前生成(Batch API)".

alter table public.lessons
  add column prefetch_batch_id text,
  add column prefetch_submitted_at timestamptz;

-- Helps prefetch-pull's "WHERE prefetch_batch_id IS NOT NULL AND body IS NULL".
create index idx_lessons_prefetch_pending
  on public.lessons (prefetch_submitted_at)
  where prefetch_batch_id is not null and body is null;

-- pg_cron + pg_net: every morning at 06:00 JST (= 21:00 UTC the day before)
-- invoke the prefetch-pull Edge Function. The cron job runs as the postgres
-- superuser, so we ship the service_role JWT in the Authorization header so
-- the Edge Function (verify_jwt = false) can use it as the admin client.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Read project URL + service_role key from Vault if available; otherwise the
-- migration will fail loudly (never hardcode secrets in SQL).
-- Operators must populate these vault secrets before running this migration:
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service-role-jwt>', 'service_role_key');
-- (See https://supabase.com/docs/guides/cron for the standard recipe.)
do $$
declare
  job_id bigint;
begin
  -- Drop any prior schedule with the same name so re-running this migration
  -- (e.g. db reset in local dev) doesn't accumulate duplicate jobs.
  select jobid into job_id from cron.job where jobname = 'lessons-prefetch-pull';
  if job_id is not null then
    perform cron.unschedule(job_id);
  end if;
end $$;

select cron.schedule(
  'lessons-prefetch-pull',
  '0 21 * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/prefetch-pull',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);

-- Re-schedule the lessons-prefetch-pull cron with both Authorization and
-- apikey headers carrying the same Vault secret value.
--
-- Why: Supabase's new API key format `sb_secret_...` is NOT a JWT and is
-- only accepted by the Edge Functions Gateway when it appears in the apikey
-- header (or in apikey AND Authorization with the same value). The original
-- migration (20260509120100) only set Authorization: Bearer <key>, which
-- fails the gateway check under the new key format.
--
-- Sending both headers is forward-compatible:
--   * legacy JWT service_role keys: gateway accepts apikey OR Authorization
--   * new sb_secret_... keys: gateway requires apikey (and tolerates a
--     matching Authorization)
-- so this migration works regardless of which key shape lives in Vault.

do $$
declare
  job_id bigint;
begin
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
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);

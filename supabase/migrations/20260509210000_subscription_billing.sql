-- Phase 7 follow-up: track which billing cadence the user is currently on so
-- /upgrade can render the correct status (ご利用中 vs 年額プランに変更) for
-- each toggle position. NULL means cadence is not yet known (e.g. legacy
-- subscription created before this column existed); the webhook backfills on
-- the next subscription.updated event.

alter table public.profiles
  add column if not exists subscription_billing text
    check (subscription_billing in ('monthly', 'yearly'));

-- Phase 7 follow-up: track the active subscription period end so /upgrade can
-- show "次回更新日" and "解約予定日" without polling Stripe on every render.
-- See roadmap.md "Phase 7" / supabase/functions/billing-webhook/index.ts.

alter table public.profiles
  add column if not exists subscription_period_end timestamptz,
  -- When the user has scheduled a cancellation, this mirrors Stripe's
  -- cancel_at — usually equals subscription_period_end. NULL means the
  -- subscription will renew normally.
  add column if not exists subscription_cancel_at timestamptz;

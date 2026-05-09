-- Phase 7: Stripe billing + per-plan content gates
-- See roadmap.md "Phase 7" / db-schema.md.

-- billing_events: dedupe Stripe webhook deliveries. Stripe retries on 5xx,
-- and `event.id` is stable across retries, so this is the canonical
-- idempotency key. PK on stripe_event_id rejects duplicate inserts.
create table public.billing_events (
  stripe_event_id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- The webhook function uses the service_role key, so RLS is mainly belt-and-
-- braces here. Do not expose this table to authenticated clients.
alter table public.billing_events enable row level security;
revoke all on public.billing_events from authenticated, anon;

-- profiles.stripe_customer_id: created the first time we hand the user a
-- Checkout/Portal session. Lets billing-portal find their portal URL without
-- a fresh Customer search call, and lets the webhook update the right row.
alter table public.profiles
  add column if not exists stripe_customer_id text unique;

create index if not exists idx_profiles_stripe_customer_id
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- Body access gate: revoke the body column from authenticated, so a malicious
-- client cannot SELECT body directly even if it owns the lesson row. All body
-- reads now go through Edge Functions (lessons-read / lessons-generate /
-- chat-send), which use the service_role key and enforce the plan check
-- before returning the body.
--
-- Title/summary/day/etc remain readable so the Roadmap can render all 30
-- locked cells. The previous policies (lessons_select_own,
-- lessons_update_complete_own) keep their row-level enforcement.
revoke select (body) on public.lessons from authenticated;

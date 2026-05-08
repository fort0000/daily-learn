-- Phase 4: extend courses for async (background) generation flow.
-- See db-schema.md "courses" / roadmap.md "Phase 4".

-- Allow 'failed' status. The Edge Function flips status to 'failed' if the
-- background skeleton generation errors out so the UI can show a retry CTA.
alter table public.courses
  drop constraint courses_status_check;

alter table public.courses
  add constraint courses_status_check
  check (status in ('generating', 'active', 'completed', 'failed', 'archived'));

-- Short error summary surfaced to the UI when status='failed'.
alter table public.courses
  add column generation_error text;

-- Realtime: courses-generate updates `status` from a background task; the
-- Home screen subscribes via postgres_changes to switch the card from
-- "作成中…" to the regular display without polling. RLS still applies — each
-- user only receives changes for their own rows.
alter publication supabase_realtime add table public.courses;

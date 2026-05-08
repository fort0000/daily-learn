-- Phase 3: courses + lessons + get_streak + RLS
-- See db-schema.md "テーブル定義 > courses / lessons" / "RLS 方針" / "関数・トリガ".

-- courses: a 30-day learning program belonging to a single user.
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  field text not null,
  prerequisite text,
  goal text not null,
  title text not null,
  status text not null default 'generating'
    check (status in ('generating', 'active', 'completed', 'archived')),
  started_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_courses_user_id_status on public.courses (user_id, status);

alter table public.courses enable row level security;

create policy courses_select_own on public.courses
  for select using (user_id = auth.uid());

create policy courses_insert_own on public.courses
  for insert with check (user_id = auth.uid());

create policy courses_update_own on public.courses
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy courses_delete_own on public.courses
  for delete using (user_id = auth.uid());

-- lessons: one day of a course. Body is generated on-demand (Phase 5).
-- Ownership is derived through course_id → courses.user_id; no user_id column here.
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  day int not null check (day between 1 and 30),
  title text not null,
  summary text not null,
  body jsonb,
  generated_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (course_id, day)
);

create index idx_lessons_course_id on public.lessons (course_id);
-- Used by the weekly chart on Home (filter by completed_at across all of the
-- user's courses, then bucket by JST date in the client).
create index idx_lessons_completed_at on public.lessons (completed_at)
  where completed_at is not null;

alter table public.lessons enable row level security;

-- SELECT/UPDATE/DELETE: allowed only when the parent course belongs to auth.uid().
-- INSERT is intentionally NOT exposed to authenticated users — lessons are
-- created by the AI generation Function via the service_role key (Phase 4).
create policy lessons_select_own on public.lessons
  for select using (
    exists (
      select 1 from public.courses c
      where c.id = lessons.course_id and c.user_id = auth.uid()
    )
  );

-- The frontend may only flip completed_at from NULL → now(). All other column
-- updates (title/summary/body/generated_at) are reserved for the service_role.
create policy lessons_update_complete_own on public.lessons
  for update using (
    completed_at is null and exists (
      select 1 from public.courses c
      where c.id = lessons.course_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.courses c
      where c.id = lessons.course_id and c.user_id = auth.uid()
    )
  );

create policy lessons_delete_own on public.lessons
  for delete using (
    exists (
      select 1 from public.courses c
      where c.id = lessons.course_id and c.user_id = auth.uid()
    )
  );

-- Belt & braces on top of the UPDATE policy: revoke the table-wide UPDATE from
-- authenticated and re-grant only the `completed_at` column. Without this a
-- malicious client could craft an UPDATE that flips `body`/`title` while still
-- satisfying the row-level WITH CHECK (which is row-scoped, not column-scoped).
-- The service_role bypasses both grants and RLS, so AI generation still works.
revoke update on public.lessons from authenticated;
grant update (completed_at) on public.lessons to authenticated;

-- get_streak: consecutive-day streak of lesson completions for the caller.
-- Returns (current, longest) in days. SECURITY DEFINER so it can read past RLS,
-- but the WHERE clause forces auth.uid() so a user can only see their own.
-- Day boundaries are evaluated in JST (Asia/Tokyo).
-- "current" allows a 1-day grace: if you completed yesterday but not yet today,
-- the streak is still alive; once two days pass with no completion, it breaks.
create or replace function public.get_streak()
returns table (current int, longest int)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tz constant text := 'Asia/Tokyo';
  today_jst date := (now() at time zone tz)::date;
begin
  if uid is null then
    return query select 0::int, 0::int;
    return;
  end if;

  return query
  with completed_days as (
    select distinct ((l.completed_at at time zone tz)::date) as d
    from public.lessons l
    join public.courses c on c.id = l.course_id
    where c.user_id = uid
      and l.completed_at is not null
  ),
  ranked as (
    select d, d - (row_number() over (order by d))::int as grp
    from completed_days
  ),
  groups as (
    select grp, count(*)::int as len, max(d) as ends_at
    from ranked
    group by grp
  )
  select
    coalesce((
      select len from groups
      where ends_at >= today_jst - 1
      order by ends_at desc
      limit 1
    ), 0)::int as current,
    coalesce((select max(len) from groups), 0)::int as longest;
end;
$$;

-- Lock down execute: only authenticated users (anon should not be able to
-- probe streak data; this RPC is for signed-in clients).
revoke all on function public.get_streak() from public;
grant execute on function public.get_streak() to authenticated;

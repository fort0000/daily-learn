-- Phase 5b: chat_messages — per-lesson AI assistant transcript.
-- See db-schema.md "chat_messages" / roadmap.md "Phase 5 / 5b".

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_chat_messages_lesson_id_created_at
  on public.chat_messages (lesson_id, created_at);

alter table public.chat_messages enable row level security;

-- SELECT: only when the parent lesson's course belongs to the caller.
create policy chat_messages_select_own on public.chat_messages
  for select using (
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = chat_messages.lesson_id
        and c.user_id = auth.uid()
    )
  );

-- INSERT: the frontend may insert its own user-role messages only. Assistant
-- replies are inserted by the chat-send Edge Function via service_role.
create policy chat_messages_insert_user_own on public.chat_messages
  for insert with check (
    role = 'user'
    and exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = chat_messages.lesson_id
        and c.user_id = auth.uid()
    )
  );

-- No UPDATE / DELETE policies on purpose — chat history is append-only for
-- both audit and AI-context-stability reasons (see db-schema.md "やらないこと").

-- Realtime: Chat screen subscribes to postgres_changes on this table so the
-- assistant message inserted by the Edge Function streams in without polling.
alter publication supabase_realtime add table public.chat_messages;

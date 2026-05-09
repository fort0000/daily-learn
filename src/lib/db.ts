import { supabase } from './supabase';

export type CourseStatus = 'generating' | 'active' | 'completed' | 'failed' | 'archived';

export type Course = {
  id: string;
  user_id: string;
  field: string;
  prerequisite: string | null;
  goal: string;
  title: string;
  status: CourseStatus;
  generation_error: string | null;
  started_at: string | null;
  created_at: string;
};

export type Lesson = {
  id: string;
  course_id: string;
  day: number;
  title: string;
  summary: string;
  body: unknown | null;
  generated_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type Streak = { current: number; longest: number };

const COURSE_COLS =
  'id, user_id, field, prerequisite, goal, title, status, generation_error, started_at, created_at';
// `body` is intentionally omitted — REVOKE'd from authenticated in Phase 7.
// Read body via requestLessonRead / requestLessonGeneration instead, both of
// which apply the plan gate before returning content.
const LESSON_COLS =
  'id, course_id, day, title, summary, generated_at, completed_at, created_at';

// Active courses = anything not archived. Generating and failed rows are
// surfaced too so the Home carousel can render their dedicated states (作成中… /
// 失敗 + 再試行).
export async function fetchActiveCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select(COURSE_COLS)
    .in('status', ['generating', 'active', 'completed', 'failed'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function fetchCourse(courseId: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from('courses')
    .select(COURSE_COLS)
    .eq('id', courseId)
    .maybeSingle();
  if (error) throw error;
  return (data as Course | null) ?? null;
}

export async function fetchLessonsByCourse(courseId: string): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select(LESSON_COLS)
    .eq('course_id', courseId)
    .order('day', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Lesson[];
}

export async function fetchLesson(lessonId: string): Promise<Lesson | null> {
  const { data, error } = await supabase
    .from('lessons')
    .select(LESSON_COLS)
    .eq('id', lessonId)
    .maybeSingle();
  if (error) throw error;
  return (data as Lesson | null) ?? null;
}

// Mark a lesson complete. The RLS policy on `lessons` already enforces
// "completed_at IS NULL" + ownership, so re-completion is a no-op (0 rows).
export async function markLessonComplete(lessonId: string): Promise<void> {
  const { error } = await supabase
    .from('lessons')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', lessonId)
    .is('completed_at', null);
  if (error) throw error;
}

// Returns rows of `{ completed_at }` for the caller's lessons within the last
// `days` days. Used by the Home weekly chart and the Profile completion count
// (the latter ignores the time window — see fetchTotalCompleted).
export async function fetchRecentCompletions(
  days = 8,
): Promise<{ completed_at: string }[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('lessons')
    .select('completed_at')
    .gte('completed_at', since)
    .not('completed_at', 'is', null);
  if (error) throw error;
  return (data ?? []) as { completed_at: string }[];
}

export async function fetchTotalCompleted(): Promise<number> {
  const { count, error } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .not('completed_at', 'is', null);
  if (error) throw error;
  return count ?? 0;
}

export async function getStreak(): Promise<Streak> {
  const { data, error } = await supabase.rpc('get_streak');
  if (error) throw error;
  // RPC for a TABLE-returning function comes back as an array of rows.
  const row = Array.isArray(data) ? data[0] : data;
  const current = (row?.current as number | undefined) ?? 0;
  const longest = (row?.longest as number | undefined) ?? 0;
  return { current, longest };
}

// ----- Phase 4: async course creation -----

export type CourseGenerationInput = {
  field: string;
  prerequisite: string | null;
  goal: string;
};

// Kicks off the courses-generate Edge Function. The function inserts a
// `status='generating'` row and returns ~immediately (~200ms); the actual
// Anthropic call runs in EdgeRuntime.waitUntil. Realtime is what tells us
// when the row flips to 'active' or 'failed'.
export async function startCourseGeneration(
  input: CourseGenerationInput,
): Promise<{ course_id: string }> {
  const { data, error } = await supabase.functions.invoke<{ course_id: string }>(
    'courses-generate',
    { body: input },
  );
  if (error) {
    await throwIfPlanLimit(error);
    throw error;
  }
  if (!data?.course_id) throw new Error('courses-generate returned no course_id');
  return data;
}

export type CourseChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

// Subscribe to INSERT/UPDATE/DELETE on the caller's `courses` rows. RLS already
// scopes the broadcast to auth.uid(), so no per-user filter is needed on the
// channel. Returns a teardown closure to call from useEffect cleanup.
export function subscribeToCourses(
  onChange: (course: Course | null, event: CourseChangeEvent) => void,
): () => void {
  const channel = supabase
    .channel('courses-changes')
    .on(
      // supabase-js types for postgres_changes are awkward to satisfy; the
      // payload shape is well-defined regardless.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: 'courses' },
      (payload: { eventType: string; new: unknown; old: unknown }) => {
        const event = payload.eventType as CourseChangeEvent;
        const row = (event === 'DELETE' ? payload.old : payload.new) as Course | null;
        onChange(row, event);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// Soft-delete a failed (or otherwise unwanted) course by flipping it to
// 'archived'. fetchActiveCourses excludes archived rows so the card disappears.
export async function archiveCourse(courseId: string): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .update({ status: 'archived' })
    .eq('id', courseId);
  if (error) throw error;
}

// ----- Phase 5: lesson body generation + prefetch + chat -----

// Phase 7: structured error returned by gated Edge Functions. The frontend
// uses `code` to decide between an inline notice and a redirect to /upgrade.
export class PlanLimitError extends Error {
  constructor(
    public readonly code: 'PLAN_LIMIT_LESSONS' | 'PLAN_LIMIT_COURSES' | 'PLAN_LIMIT_CHAT',
    message: string,
  ) {
    super(message);
    this.name = 'PlanLimitError';
  }
}

type EdgeError = { code?: string; message?: string };

// supabase-js wraps non-2xx into a FunctionsHttpError but doesn't expose the
// JSON body directly. Reach into the underlying Response to extract our
// `{ error: { code, message } }` envelope so callers can dispatch on `code`.
async function readEdgeError(err: unknown): Promise<EdgeError | null> {
  const ctx = (err as { context?: Response | { json?: () => Promise<unknown> } }).context;
  if (!ctx) return null;
  try {
    const body = (await (ctx as Response).json?.()) as { error?: EdgeError } | undefined;
    return body?.error ?? null;
  } catch {
    return null;
  }
}

async function throwIfPlanLimit(err: unknown): Promise<void> {
  const parsed = await readEdgeError(err);
  if (
    parsed?.code === 'PLAN_LIMIT_LESSONS' ||
    parsed?.code === 'PLAN_LIMIT_COURSES' ||
    parsed?.code === 'PLAN_LIMIT_CHAT'
  ) {
    throw new PlanLimitError(parsed.code, parsed.message ?? 'Plan limit reached');
  }
}

// On-demand lesson body generation. Idempotent: if body is already non-null,
// the Edge Function returns it without calling Anthropic.
export async function requestLessonGeneration(lessonId: string): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke<{ body: unknown }>(
    'lessons-generate',
    { body: { lesson_id: lessonId } },
  );
  if (error) {
    await throwIfPlanLimit(error);
    throw error;
  }
  if (!data?.body) throw new Error('lessons-generate returned no body');
  return data.body;
}

// Read-only body fetch. Used by the Article screen on every open since the
// `body` column is REVOKE'd from authenticated. Same plan gate as
// lessons-generate, but never calls Anthropic.
export async function requestLessonRead(lessonId: string): Promise<unknown | null> {
  const { data, error } = await supabase.functions.invoke<{ body: unknown | null }>(
    'lessons-read',
    { body: { lesson_id: lessonId } },
  );
  if (error) {
    await throwIfPlanLimit(error);
    throw error;
  }
  return data?.body ?? null;
}

// Fire-and-forget after markLessonComplete. The Edge Function checks the
// frontier condition itself, so callers don't need to gate.
export async function requestLessonPrefetchNext(lessonId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('lessons-prefetch-next', {
    body: { lesson_id: lessonId },
  });
  if (error) {
    // Best-effort: log but don't surface to the user. Realtime fallback handles it.
    console.warn('[db] lessons-prefetch-next failed:', error);
  }
}

export type ChatMessage = {
  id: string;
  lesson_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

const CHAT_COLS = 'id, lesson_id, role, content, created_at';

export async function fetchChatMessages(lessonId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(CHAT_COLS)
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

// Send a message to chat-send. Returns both the user echo and assistant
// reply, but the screen also subscribes to chat_messages via Realtime so
// these usually arrive there first.
export async function sendChatMessage(
  lessonId: string,
  content: string,
): Promise<{ user: ChatMessage; assistant: ChatMessage }> {
  const { data, error } = await supabase.functions.invoke<{
    user: ChatMessage;
    assistant: ChatMessage;
  }>('chat-send', { body: { lesson_id: lessonId, content } });
  if (error) {
    await throwIfPlanLimit(error);
    throw error;
  }
  if (!data?.user || !data?.assistant) {
    throw new Error('chat-send returned malformed response');
  }
  return data;
}

// ----- Phase 7: Stripe billing -----

export type BillingCadence = 'monthly' | 'yearly';

export async function startBillingCheckout(
  billing: BillingCadence = 'monthly',
): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke<{ url: string }>(
    'billing-checkout',
    { body: { billing } },
  );
  if (error) throw error;
  if (!data?.url) throw new Error('billing-checkout returned no URL');
  return data;
}

export async function startBillingPortal(): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke<{ url: string }>(
    'billing-portal',
    { body: {} },
  );
  if (error) throw error;
  if (!data?.url) throw new Error('billing-portal returned no URL');
  return data;
}

// Phase 7 follow-up: schedules cancellation at the current period end. The
// subscription stays active until period_end, then the webhook flips plan to
// 'free'. Returns the resulting cancel_at / period_end so the UI can update
// without waiting for the webhook round-trip.
export async function cancelSubscription(): Promise<{
  cancel_at: string | null;
  period_end: string | null;
}> {
  const { data, error } = await supabase.functions.invoke<{
    cancel_at: string | null;
    period_end: string | null;
  }>('billing-cancel', { body: {} });
  if (error) throw error;
  return { cancel_at: data?.cancel_at ?? null, period_end: data?.period_end ?? null };
}

export function subscribeToChatMessages(
  lessonId: string,
  onInsert: (msg: ChatMessage) => void,
): () => void {
  const channel = supabase
    .channel(`chat-${lessonId}`)
    .on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'postgres_changes' as any,
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `lesson_id=eq.${lessonId}`,
      },
      (payload: { new: ChatMessage }) => {
        onInsert(payload.new);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

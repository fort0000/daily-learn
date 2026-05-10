// Day-of-week utilities pinned to JST (Asia/Tokyo). The whole product is
// Japanese-facing so we don't bother detecting the user's locale; mirror the
// timezone choice that get_streak() uses on the server.

export type WeekDay = {
  /** ISO date `YYYY-MM-DD` in JST */
  date: string;
  /** 月..日 */
  label: string;
  done: boolean;
  today: boolean;
  future: boolean;
};

const JP_LABELS = ['月', '火', '水', '木', '金', '土', '日'] as const;

/** `YYYY-MM-DD` for the JST calendar day containing `d` (default: now). */
export function jstDateString(d: Date = new Date()): string {
  // 'en-CA' renders YYYY-MM-DD; the timezone option does the JST conversion.
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
}

function ymdToUtcNoon(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number];
  // Noon UTC keeps us safely inside the same calendar day no matter the host TZ.
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function formatYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Build Mon..Sun for the JST week containing `now`.
 * `completedDates` is a set of `YYYY-MM-DD` (JST) strings for days the user
 * completed at least one lesson.
 */
export function buildWeek(
  now: Date,
  completedDates: ReadonlySet<string>,
): WeekDay[] {
  const todayJst = jstDateString(now);
  const todayDt = ymdToUtcNoon(todayJst);
  const dow = todayDt.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const monOffset = dow === 0 ? -6 : 1 - dow;

  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(todayDt);
    dt.setUTCDate(dt.getUTCDate() + monOffset + i);
    const date = formatYmd(dt);
    return {
      date,
      label: JP_LABELS[i]!,
      done: completedDates.has(date),
      today: date === todayJst,
      future: date > todayJst,
    };
  });
}

/** Bucket a list of `completed_at` ISO timestamps into a Set of JST date strings. */
export function bucketCompletedByJstDate(
  rows: { completed_at: string | null }[],
): Set<string> {
  const out = new Set<string>();
  for (const r of rows) {
    if (!r.completed_at) continue;
    out.add(jstDateString(new Date(r.completed_at)));
  }
  return out;
}

/** Dev-only escape hatch: unlimited lessons per day when served from localhost. */
function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

/**
 * Pacing rule: only one lesson per JST day. If the user already completed any
 * lesson today, the next-in-sequence lesson is held until JST midnight rolls
 * over.
 *
 * Returns the `day` number of the locked lesson, or null when nothing is
 * locked. Operates on the lesson list of a single course.
 */
export function nextLockedDay(
  lessons: { day: number; completed_at: string | null }[],
): number | null {
  if (isLocalhost()) return null;
  if (lessons.length === 0) return null;
  const completed = lessons.filter((l) => l.completed_at);
  if (completed.length === 0) return null;
  const today = jstDateString();
  const anyToday = completed.some(
    (l) => jstDateString(new Date(l.completed_at!)) === today,
  );
  if (!anyToday) return null;
  const maxDay = Math.max(...completed.map((l) => l.day));
  if (maxDay >= 30) return null;
  return maxDay + 1;
}

/** Pretty header date — e.g. `5月7日(木)`. */
export function formatJstHeaderDate(d: Date = new Date()): string {
  // Intl gives us the locale-correct format. We pin TZ to JST so this is stable.
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('month')}月${get('day')}日(${get('weekday')})`;
}

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent as RTouchEvent,
  type MouseEvent as RMouseEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { DL } from '../lib/dl';
import { useProfile, useSession } from '../lib/auth';
import { Phone } from '../components/Phone';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { Flame } from '../components/Flame';
import { PushButton } from '../components/PushButton';
import {
  archiveCourse,
  fetchActiveCoursesCached,
  fetchLessonsByCourseCached,
  fetchRecentCompletions,
  getCachedActiveCourses,
  getCachedCourseLessons,
  getStreak,
  startCourseGeneration,
  subscribeToCourses,
  type Course,
  type Lesson,
} from '../lib/db';
import { bucketCompletedByJstDate, buildWeek, formatJstHeaderDate, nextLockedDay } from '../lib/week';

type Palette = {
  color: string;
  shadow: string;
  chip: { bg: string; dot: string; fg: string };
  blob: string;
};

const PALETTES: Palette[] = [
  {
    color: DL.primary,
    shadow: DL.primaryShadow,
    chip: { bg: '#FFEDD5', dot: DL.fire, fg: DL.fireDark },
    blob: '#FFE4D1',
  },
  {
    color: DL.mint,
    shadow: DL.mintShadow,
    chip: { bg: '#DCFCE7', dot: DL.mint, fg: DL.mintDark },
    blob: '#D1FAE5',
  },
  {
    color: '#A855F7',
    shadow: '#7E22CE',
    chip: { bg: '#EDE9FE', dot: '#A855F7', fg: '#6D28D9' },
    blob: '#EDE9FE',
  },
];

type CourseCard = {
  course: Course;
  // null when course is generating, failed, or has no remaining lessons.
  lesson: Lesson | null;
  // True when `lesson.day` is held back by the daily-pacing rule (user already
  // completed something today JST).
  locked: boolean;
  palette: Palette;
};

function buildCards(courses: Course[], lessonsByCourse: Map<string, Lesson[]>): CourseCard[] {
  const built: CourseCard[] = [];
  courses.forEach((course) => {
    const lessons = lessonsByCourse.get(course.id) ?? [];
    const next = lessons.find((l) => l.completed_at == null) ?? null;
    // For 'active' courses with every lesson completed, we have nothing
    // useful to show — skip the card entirely. Generating/failed always
    // surface so the user can see progress / retry.
    if (course.status === 'active' && !next) return;
    const lockedDay = nextLockedDay(lessons);
    built.push({
      course,
      lesson: next,
      locked: !!next && lockedDay === next.day,
      palette: PALETTES[built.length % PALETTES.length]!,
    });
  });
  return built;
}

// Lazy-init helper. Returns a fully-built carousel when both `activeCourses`
// and every needed `courseLessons` entry are already in cache; otherwise
// returns null so the screen falls back to the loading skeleton.
function buildCardsFromCache(): CourseCard[] | null {
  const courses = getCachedActiveCourses();
  if (!courses) return null;
  const map = new Map<string, Lesson[]>();
  for (const c of courses) {
    if (c.status !== 'active' && c.status !== 'completed') {
      map.set(c.id, []);
      continue;
    }
    const cached = getCachedCourseLessons(c.id);
    if (!cached) return null;
    map.set(c.id, cached.lessons);
  }
  return buildCards(courses, map);
}

export function HomeScreen() {
  const session = useSession();
  const userId = session.session?.user.id ?? null;
  const { profile } = useProfile(userId);
  // Cards lazy-init from cache so Article → Home and Roadmap → Home don't
  // flash the carousel skeleton when we already know the answer.
  const [cards, setCards] = useState<CourseCard[] | null>(() => buildCardsFromCache());
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [completedSet, setCompletedSet] = useState<Set<string>>(() => new Set());

  const load = useCallback(async () => {
    try {
      const [courses, completions, s] = await Promise.all([
        fetchActiveCoursesCached(),
        fetchRecentCompletions(8),
        getStreak(),
      ]);
      setStreak(s);
      setCompletedSet(bucketCompletedByJstDate(completions));

      const lessonLists = await Promise.all(
        courses.map((c) =>
          c.status === 'active' || c.status === 'completed'
            ? fetchLessonsByCourseCached(c)
            : Promise.resolve<Lesson[]>([]),
        ),
      );
      const map = new Map<string, Lesson[]>();
      courses.forEach((c, i) => map.set(c.id, lessonLists[i] ?? []));
      setCards(buildCards(courses, map));
    } catch (e) {
      console.error('[Home] load failed:', e);
      setCards([]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void load().then(() => {
      if (!active) return;
    });
    // Any change to the user's `courses` rows (insert from courses-generate,
    // status flip from generating → active / failed, archive) triggers a full
    // refresh. Cheap enough; keeps the state machine trivial.
    const unsubscribe = subscribeToCourses(() => {
      if (!active) return;
      void load();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [load]);

  const week = useMemo(() => buildWeek(new Date(), completedSet), [completedSet]);
  const doneCount = week.filter((d) => d.done).length;
  const headerDate = useMemo(() => formatJstHeaderDate(new Date()), []);

  return (
    <Phone>
      <StatusBar />
      <div className="pt-1 px-5 pr-[76px]">
        <div className="text-[13px] text-dl-slate font-bold tracking-[0.5px]">{headerDate}</div>
        <div className="flex gap-2 items-center mt-2.5 flex-wrap">
          <div className="bg-white rounded-full pl-1.5 pr-2.5 py-1 flex items-center gap-1 shadow-[0_0_0_2px_#F97316]">
            <Flame size={22} />
            <div className="text-[13px] font-black text-dl-fire tabular-nums">{streak.current}</div>
            <div className="text-[10px] font-extrabold text-dl-slate font-jp">日連続</div>
          </div>
        </div>
      </div>

      {cards === null ? (
        <CarouselSkeleton />
      ) : cards.length === 0 ? (
        <EmptyCarousel />
      ) : (
        <LessonCarousel cards={cards} onChanged={load} />
      )}

      <div className="pt-[18px] px-5">
        <div className="flex justify-between items-baseline mb-2.5">
          <div className="text-sm font-extrabold text-dl-navy font-jp">今週の学習</div>
          <div className="text-[11px] font-extrabold text-dl-mint-dark font-jp">{doneCount} / 7 日</div>
        </div>
        <div className="flex gap-1.5 justify-between">
          {week.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-[13px] ${
                  d.done
                    ? 'bg-dl-mint text-white shadow-[0_2px_0_#0F7A38]'
                    : d.today
                    ? 'bg-white text-dl-slate-light border-[2.5px] border-dashed border-dl-primary'
                    : 'bg-[#F5EDDF] text-dl-slate-light'
                }`}
              >
                {d.done ? (
                  <svg width="16" height="16" viewBox="0 0 16 16">
                    <path
                      d="M3 8 L7 12 L13 4"
                      stroke="#fff"
                      strokeWidth="2.6"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : d.today ? (
                  '今'
                ) : (
                  ''
                )}
              </div>
              <div
                className={`text-[10px] font-bold font-jp ${
                  d.today ? 'text-dl-primary' : 'text-dl-slate-light'
                }`}
              >
                {d.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <NewCourseCTA
        targetPath={
          profile?.plan === 'free' && (cards?.length ?? 0) >= 1 ? '/upgrade' : '/create'
        }
      />
      <TabBar active="home" />
    </Phone>
  );
}

function NewCourseCTA({ targetPath }: { targetPath: string }) {
  const navigate = useNavigate();
  return (
    <div className="pt-3.5 px-5">
      <button
        onClick={() => navigate(targetPath)}
        className="w-full bg-white border-2 border-dashed border-dl-primary rounded-[20px] px-4 py-3.5 flex items-center gap-3 cursor-pointer font-jp text-left"
      >
        <div className="w-11 h-11 rounded-[14px] bg-dl-primary flex items-center justify-center shadow-[0_3px_0_#C8431A] shrink-0">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 4 V18 M4 11 H18" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black text-dl-navy">新しい学習コースを作る</div>
          <div className="text-[11px] font-bold text-dl-slate mt-0.5">目標を入力 → AIがコースを設計</div>
        </div>
      </button>
    </div>
  );
}

function CarouselSkeleton() {
  return (
    <div className="pt-5 px-9">
      <div className="bg-white rounded-3xl border-[1.5px] border-dl-border h-[260px] animate-pulse" />
    </div>
  );
}

function EmptyCarousel() {
  return (
    <div className="pt-5 px-9">
      <div className="bg-white rounded-3xl border-[1.5px] border-dashed border-dl-border px-5 py-7 text-center">
        <div className="text-[13px] font-extrabold text-dl-navy font-jp">
          まだコースがありません
        </div>
        <div className="text-[11px] font-bold text-dl-slate font-jp mt-1.5 leading-[1.6]">
          下のボタンから最初のコースを作ってみよう。
        </div>
      </div>
    </div>
  );
}

function LessonCarousel({ cards, onChanged }: { cards: CourseCard[]; onChanged: () => void }) {
  const [idx, setIdx] = useState(0);
  const [shift, setShift] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Keep `idx` in range as the cards array shrinks (e.g., archive).
  useEffect(() => {
    if (idx > cards.length - 1) setIdx(Math.max(0, cards.length - 1));
  }, [cards.length, idx]);

  const recenter = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const card = track.children[idx] as HTMLElement | undefined;
    if (!card) return;
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    setShift(viewport.clientWidth / 2 - cardCenter);
  }, [idx]);

  useLayoutEffect(() => {
    recenter();
  }, [recenter]);
  useEffect(() => {
    if (!viewportRef.current) return;
    const ro = new ResizeObserver(recenter);
    ro.observe(viewportRef.current);
    return () => ro.disconnect();
  }, [recenter]);

  const startX = useRef<number | null>(null);
  const moved = useRef(false);
  const getX = (e: RMouseEvent | RTouchEvent): number => {
    if ('touches' in e && e.touches.length > 0) return e.touches[0]!.clientX;
    if ('changedTouches' in e && e.changedTouches.length > 0) return e.changedTouches[0]!.clientX;
    return (e as RMouseEvent).clientX;
  };
  const onStart = (e: RMouseEvent | RTouchEvent) => {
    startX.current = getX(e);
    moved.current = false;
  };
  const onMove = (e: RMouseEvent | RTouchEvent) => {
    if (startX.current == null) return;
    const x = getX(e);
    if (Math.abs(x - startX.current) > 8) moved.current = true;
  };
  const onEnd = (e: RMouseEvent | RTouchEvent) => {
    if (startX.current == null) return;
    const x = getX(e);
    const dx = x - startX.current;
    if (dx > 40 && idx > 0) setIdx(idx - 1);
    else if (dx < -40 && idx < cards.length - 1) setIdx(idx + 1);
    startX.current = null;
  };
  const wasDragging = () => moved.current;

  return (
    <div className="pt-5">
      <div
        ref={viewportRef}
        onMouseDown={onStart}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onMouseLeave={() => {
          startX.current = null;
        }}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        className="overflow-hidden relative pb-1"
      >
        <div
          ref={trackRef}
          className="flex gap-3 px-9 transition-transform duration-[320ms] ease-[cubic-bezier(.2,.7,.3,1)]"
          style={{ transform: `translateX(${shift}px)` }}
        >
          {cards.map((card, i) => (
            <div
              key={card.course.id}
              className="flex-[0_0_calc(100%-48px)] box-border transition-[opacity,transform] duration-[220ms]"
              style={{
                opacity: i === idx ? 1 : 0.55,
                transform: i === idx ? 'scale(1)' : 'scale(0.96)',
              }}
            >
              <CardBody card={card} wasDragging={wasDragging} onChanged={onChanged} />
            </div>
          ))}
        </div>
      </div>
      {cards.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {cards.map((c, i) => (
            <div
              key={c.course.id}
              onClick={() => setIdx(i)}
              className={`h-[7px] rounded-full transition-all duration-200 cursor-pointer ${
                i === idx ? 'w-[22px] bg-dl-primary' : 'w-[7px] bg-[#E5DCC8]'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CardBody({
  card,
  wasDragging,
  onChanged,
}: {
  card: CourseCard;
  wasDragging: () => boolean;
  onChanged: () => void;
}) {
  if (card.course.status === 'generating') {
    return <GeneratingCard card={card} />;
  }
  if (card.course.status === 'failed') {
    return <FailedCard card={card} onChanged={onChanged} />;
  }
  if (!card.lesson) return null; // active-but-no-lesson is filtered upstream
  return <ActiveCard card={card} lesson={card.lesson} wasDragging={wasDragging} />;
}

function CardShell({
  palette,
  children,
}: {
  palette: Palette;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-3xl pt-[18px] px-5 pb-[22px] border-[1.5px] border-dl-border shadow-[0_4px_0_#F0E2CD] relative overflow-hidden">
      <div
        className="absolute -top-10 -right-[30px] w-[120px] h-[120px] rounded-full opacity-70"
        style={{
          background: `radial-gradient(circle, ${palette.blob} 0%, ${palette.blob} 60%, transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
}

function ActiveCard({
  card,
  lesson,
  wasDragging,
}: {
  card: CourseCard;
  lesson: Lesson;
  wasDragging: () => boolean;
}) {
  const navigate = useNavigate();
  const session = useSession();
  const userId = session.session?.user.id ?? null;
  const { profile } = useProfile(userId);
  const { course, palette, locked } = card;
  const isPlanGated = profile?.plan === 'free' && lesson.day > 10;
  const lessonHref = isPlanGated ? '/upgrade' : `/lessons/${lesson.id}`;

  return (
    <CardShell palette={palette}>
      <div className="flex items-center justify-between relative">
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black tracking-[0.5px]"
          style={{ background: palette.chip.bg, color: palette.chip.fg }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: palette.chip.dot }} />
          DAY {lesson.day} / 30
        </div>
        <div className="text-[11px] font-extrabold text-dl-slate font-jp">⏱ 約10分</div>
      </div>
      <div className="mt-3.5 text-[11px] font-extrabold text-dl-slate-light tracking-wider font-jp">
        {course.title}
      </div>
      <div className="mt-1 text-[23px] font-black text-dl-navy font-jp leading-[1.25] tracking-[-0.3px]">
        {lesson.title}
      </div>
      <div className="mt-2 text-[13px] text-dl-slate leading-[1.6] font-jp">{lesson.summary}</div>
      {locked ? (
        <div className="mt-[18px] bg-[#FEF3C7] border-[1.5px] border-[#FCD34D] rounded-2xl px-3.5 py-3 flex items-center gap-2.5">
          <div className="text-2xl shrink-0">🔒</div>
          <div className="min-w-0">
            <div className="text-[12px] font-black text-[#92400E] font-jp">
              今日のレッスンは完了しました!
            </div>
            <div className="text-[11px] font-bold text-[#92400E] font-jp leading-[1.55] mt-0.5 opacity-90">
              毎日コツコツ進めるのが大事。明日の朝にこの続きが解放されます。
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-[18px]">
          <PushButton
            color={palette.color}
            shadow={palette.shadow}
            fontSize={16}
            onClick={() => {
              if (!wasDragging()) navigate(lessonHref);
            }}
          >
            今日の学びを始める →
          </PushButton>
        </div>
      )}
      <div
        onClick={() => {
          if (!wasDragging()) navigate(`/roadmap?courseId=${course.id}`);
        }}
        className="mt-3.5 flex items-center justify-between pt-3 border-t border-dashed border-dl-border cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: palette.chip.bg }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 4 Q8 4 8 8 Q8 12 13 12"
                stroke={palette.chip.fg}
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="3" cy="4" r="1.6" fill={palette.chip.fg} />
              <circle cx="13" cy="12" r="1.6" fill={palette.chip.fg} />
            </svg>
          </div>
          <div className="text-xs font-extrabold text-dl-navy font-jp">
            このコースのロードマップ
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <path
            d="M7 4 L13 10 L7 16"
            stroke={palette.chip.fg}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </CardShell>
  );
}

function GeneratingCard({ card }: { card: CourseCard }) {
  const { palette, course } = card;
  return (
    <CardShell palette={palette}>
      <div className="flex items-center justify-between relative">
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black tracking-[0.5px] animate-pulse"
          style={{ background: palette.chip.bg, color: palette.chip.fg }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: palette.chip.dot }}
          />
          作成中…
        </div>
        <div className="text-[11px] font-extrabold text-dl-slate font-jp">⏱ 約30〜60秒</div>
      </div>
      <div className="mt-3.5 text-[11px] font-extrabold text-dl-slate-light tracking-wider font-jp">
        {course.field}
      </div>
      <div className="mt-1 text-[19px] font-black text-dl-navy font-jp leading-[1.25] tracking-[-0.3px]">
        AIが30日コースを設計しています
      </div>
      <div className="mt-2 space-y-2">
        <div className="h-3 bg-[#F5EDDF] rounded-full animate-pulse" />
        <div className="h-3 w-4/5 bg-[#F5EDDF] rounded-full animate-pulse" />
        <div className="h-3 w-2/3 bg-[#F5EDDF] rounded-full animate-pulse" />
      </div>
      <div className="mt-[18px] opacity-60 pointer-events-none">
        <PushButton color={palette.color} shadow={palette.shadow} fontSize={16} onClick={() => {}}>
          準備中…
        </PushButton>
      </div>
      <div className="mt-3.5 pt-3 border-t border-dashed border-dl-border text-[11px] font-bold text-dl-slate font-jp leading-[1.6]">
        生成中はこの画面を閉じてもOKです。完成すると自動でカードが切り替わります。
      </div>
    </CardShell>
  );
}

function FailedCard({ card, onChanged }: { card: CourseCard; onChanged: () => void }) {
  const { course, palette } = card;
  const [busy, setBusy] = useState<'retry' | 'dismiss' | null>(null);

  const handleRetry = async () => {
    if (busy) return;
    setBusy('retry');
    try {
      // Archive the failed row first so we don't accumulate duplicates, then
      // re-issue the same generation request.
      await archiveCourse(course.id);
      await startCourseGeneration({
        field: course.field,
        prerequisite: course.prerequisite,
        goal: course.goal,
      });
      onChanged();
    } catch (e) {
      console.error('[Home] retry failed:', e);
      setBusy(null);
    }
  };
  const handleDismiss = async () => {
    if (busy) return;
    setBusy('dismiss');
    try {
      await archiveCourse(course.id);
      onChanged();
    } catch (e) {
      console.error('[Home] dismiss failed:', e);
      setBusy(null);
    }
  };

  return (
    <CardShell palette={palette}>
      <div className="flex items-center justify-between relative">
        <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black tracking-[0.5px] bg-[#FEE2E2] text-[#B91C1C]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
          作成に失敗
        </div>
      </div>
      <div className="mt-3.5 text-[11px] font-extrabold text-dl-slate-light tracking-wider font-jp">
        {course.field}
      </div>
      <div className="mt-1 text-[19px] font-black text-dl-navy font-jp leading-[1.25] tracking-[-0.3px]">
        コースの作成に失敗しました
      </div>
      <div className="mt-2 text-[12px] text-dl-slate leading-[1.6] font-jp">
        {course.generation_error?.trim()
          ? course.generation_error
          : '通信またはAI応答に問題が発生しました。'}
      </div>
      <div className={`mt-[18px] ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
        <PushButton color={palette.color} shadow={palette.shadow} fontSize={15} onClick={handleRetry}>
          {busy === 'retry' ? '再試行中…' : '🔄 もう一度作成する'}
        </PushButton>
      </div>
      <div
        onClick={handleDismiss}
        className={`mt-3 text-center text-[12px] font-extrabold text-dl-slate-light font-jp cursor-pointer ${
          busy ? 'opacity-60 pointer-events-none' : ''
        }`}
      >
        {busy === 'dismiss' ? '削除中…' : '削除する'}
      </div>
    </CardShell>
  );
}

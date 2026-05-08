import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { DL } from '../lib/dl';
import { useNav } from '../lib/nav';
import { Phone } from '../components/Phone';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import {
  fetchActiveCourses,
  fetchCourse,
  fetchLessonsByCourse,
  subscribeToCourses,
  type Course,
  type Lesson,
} from '../lib/db';

type DayState = 'done' | 'current' | 'future';

type Cell = {
  day: number;
  state: DayState;
  lesson: Lesson | null;
};

export function RoadmapScreen() {
  const { route, navigate } = useNav();
  const courseIdParam = (route.params?.courseId as string | undefined) ?? null;

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[] | null>(null);

  const load = useCallback(async () => {
    try {
      // Caller didn't pin a course → land on the most recent active one.
      const c = courseIdParam
        ? await fetchCourse(courseIdParam)
        : (await fetchActiveCourses())[0] ?? null;
      setCourse(c);
      if (!c || c.status !== 'active') {
        // Generating / failed / no-course: nothing to show in the 30 cells yet.
        setLessons([]);
        return;
      }
      const ls = await fetchLessonsByCourse(c.id);
      setLessons(ls);
    } catch (e) {
      console.error('[Roadmap] load failed:', e);
      setCourse(null);
      setLessons([]);
    }
  }, [courseIdParam]);

  useEffect(() => {
    let active = true;
    void load().then(() => {
      if (!active) return;
    });
    // If the user lands here on a generating course, the row will flip to
    // 'active' as soon as the Edge Function finishes — refetch on any change
    // so the cells appear without a manual reload.
    const unsubscribe = subscribeToCourses(() => {
      if (!active) return;
      void load();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [load]);

  const cells: Cell[] = useMemo(() => buildCells(lessons), [lessons]);
  const doneDays = cells.filter((c) => c.state === 'done').length;
  const totalDays = 30;
  const percent = Math.round((doneDays / totalDays) * 100);

  const isGenerating = course?.status === 'generating';
  const isFailed = course?.status === 'failed';

  return (
    <Phone>
      <StatusBar />
      <div className="pt-1 px-5 pr-[76px] pb-2.5">
        <div className="flex items-center gap-2.5 mb-3">
          <div
            onClick={() => navigate('home')}
            className="w-[38px] h-[38px] rounded-xl bg-white border-[1.5px] border-dl-border flex items-center justify-center cursor-pointer shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path
                d="M10 3 L4 8 L10 13"
                stroke={DL.navy}
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-dl-slate-light tracking-wider">30日コース</div>
            <div className="text-[22px] font-black text-dl-navy font-jp mt-0.5">
              {isGenerating
                ? 'コースを作成中…'
                : course?.title ?? (lessons === null ? '...' : 'コースがありません')}
            </div>
          </div>
        </div>

        {isGenerating ? (
          <div className="bg-white rounded-2xl px-3.5 py-2.5 border-[1.5px] border-dashed border-dl-primary text-[12px] font-bold text-dl-slate font-jp leading-[1.6]">
            AIが30日分のレッスンを設計しています(30〜60秒)。完成すると自動でこの画面に反映されます。
          </div>
        ) : isFailed ? (
          <div className="bg-[#FEF2F2] rounded-2xl px-3.5 py-2.5 border-[1.5px] border-[#FCA5A5] text-[12px] font-bold text-[#B91C1C] font-jp leading-[1.6]">
            コースの作成に失敗しました。ホームから再試行してください。
          </div>
        ) : (
          <div className="bg-white rounded-2xl px-3.5 py-2.5 border-[1.5px] border-dl-border">
            <div className="flex justify-between text-xs font-extrabold font-jp mb-1.5">
              <span className="text-dl-slate">達成度</span>
              <span className="text-dl-primary">
                {percent}% <span className="text-dl-slate-light font-bold">({doneDays}/{totalDays}日)</span>
              </span>
            </div>
            <div className="h-2 bg-[#F5EDDF] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${percent}%`,
                  background: `linear-gradient(90deg, ${DL.primary}, ${DL.fire})`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div
        className="absolute top-[200px] bottom-0 left-0 right-0 overflow-y-auto"
        style={{
          backgroundImage: `radial-gradient(circle, #E8DCC4 1.2px, transparent 1.5px)`,
          backgroundSize: '20px 20px',
        }}
      >
        <div className="pt-[18px] pb-[100px] relative">
          {cells.map((c, i) => (
            <Fragment key={c.day}>
              {i === 0 && <SectionHeader stage="basics" />}
              {i === 10 && <SectionHeader stage="applied" />}
              {i === 20 && <SectionHeader stage="integration" />}
              <Node cell={c} idx={i} pulse={isGenerating} />
            </Fragment>
          ))}
        </div>
      </div>

      <TabBar active="home" />
    </Phone>
  );
}

// Build 30 cells from the lesson rows. The "current" day is the lowest day
// with completed_at IS NULL; everything before it is "done" (assumes lessons
// progress in order, which the schema enforces via day=1..30 + UNIQUE).
function buildCells(lessons: Lesson[] | null): Cell[] {
  if (lessons === null) {
    return Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      state: 'future',
      lesson: null,
    }));
  }
  const byDay = new Map<number, Lesson>();
  for (const l of lessons) byDay.set(l.day, l);
  const firstUncompleted = lessons.find((l) => l.completed_at == null)?.day ?? null;
  return Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const lesson = byDay.get(day) ?? null;
    let state: DayState = 'future';
    if (lesson?.completed_at) state = 'done';
    else if (firstUncompleted === day) state = 'current';
    return { day, state, lesson };
  });
}

type Stage = 'basics' | 'applied' | 'integration';

const STAGE_META: Record<Stage, { label: string; sub: string; range: string; tone: string; bg: string }> = {
  basics: {
    label: '基礎',
    sub: 'BASICS',
    range: 'Day 1 〜 10',
    tone: '#0F7A38',
    bg: '#DCFCE7',
  },
  applied: {
    label: '応用',
    sub: 'APPLIED',
    range: 'Day 11 〜 20',
    tone: DL.primaryShadow,
    bg: '#FFEDD5',
  },
  integration: {
    label: '統合',
    sub: 'INTEGRATION',
    range: 'Day 21 〜 30',
    tone: '#6D28D9',
    bg: '#EDE9FE',
  },
};

function SectionHeader({ stage }: { stage: Stage }) {
  const m = STAGE_META[stage];
  return (
    <div className="relative h-[44px] my-1 px-5">
      <div
        className="rounded-full inline-flex items-center gap-2 px-3 py-1.5"
        style={{ background: m.bg, color: m.tone }}
      >
        <span className="text-[10px] font-extrabold tracking-[1.5px]">{m.sub}</span>
        <span className="text-[14px] font-black font-jp">{m.label}</span>
        <span className="text-[10px] font-bold opacity-70 font-jp">{m.range}</span>
      </div>
    </div>
  );
}

type NodeProps = { cell: Cell; idx: number; pulse?: boolean };

function Node({ cell, idx, pulse }: NodeProps) {
  const { navigate } = useNav();
  const { day, state, lesson } = cell;
  const positions = [110, 160, 200, 230, 240, 230, 200, 160, 110, 60, 30, 20, 30, 60];
  const left = positions[idx % positions.length];

  const colors: Record<DayState, { bg: string; sh: string; icon: 'check' | 'star' | 'lock' }> = {
    done: { bg: DL.mint, sh: '#0F7A38', icon: 'check' },
    current: { bg: DL.primary, sh: DL.primaryShadow, icon: 'star' },
    future: { bg: '#E5DCC8', sh: '#C9BFA8', icon: 'lock' },
  };
  const c = colors[state];
  const size = state === 'current' ? 56 : 44;
  const showLabel = state !== 'current' && (day % 10 === 0 || day === 11 || day === 1);
  // Future cells — and any cell missing a backing lesson row — are not navigable.
  const navigable = state !== 'future' && lesson !== null;

  return (
    <div className="relative h-[60px]">
      <div
        onClick={() => {
          if (navigable && lesson) navigate('article', { lessonId: lesson.id });
        }}
        className={`absolute top-1 ${navigable ? 'cursor-pointer' : 'cursor-not-allowed'} ${
          pulse ? 'animate-pulse' : ''
        }`}
        style={{ left, width: size, height: size }}
      >
        {state === 'current' && (
          <div className="absolute inset-[-8px] rounded-full border-[3px] border-dl-primary opacity-30 animate-dlpulse" />
        )}
        <div
          className="rounded-full flex items-center justify-center border-[3px] border-white box-border relative"
          style={{
            width: size,
            height: size,
            background: c.bg,
            boxShadow: `0 4px 0 ${c.sh}`,
          }}
        >
          {c.icon === 'check' && (
            <svg width="20" height="20" viewBox="0 0 28 28">
              <path
                d="M6 14 L12 20 L22 8"
                stroke="#fff"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {c.icon === 'star' && (
            <div className="font-black text-white text-center leading-none font-jp">
              <div className="text-base">D{day}</div>
              <div className="text-[8px] mt-0.5 opacity-95">進行中</div>
            </div>
          )}
          {c.icon === 'lock' && (
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
              <rect x="5" y="10" width="12" height="9" rx="2" fill="#A89F88" />
              <path
                d="M7 10 V7 a4 4 0 0 1 8 0 V10"
                stroke="#A89F88"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
        {showLabel && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 text-[9px] font-extrabold font-jp whitespace-nowrap ${
              state === 'future' ? 'text-dl-slate-light' : 'text-dl-mint-dark'
            }`}
            style={{ top: size + 2 }}
          >
            Day {day}
          </div>
        )}
      </div>
    </div>
  );
}

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type TouchEvent as RTouchEvent,
  type MouseEvent as RMouseEvent,
} from 'react';
import { DL } from '../lib/dl';
import { useNav } from '../lib/nav';
import { Phone } from '../components/Phone';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { Flame } from '../components/Flame';
import { PushButton } from '../components/PushButton';

type Lesson = {
  day: number;
  status: 'today' | 'tomorrow' | 'soon';
  eyebrow: string;
  title: [string, string];
  summary: string;
  cta: string;
  color: string;
  shadow: string;
  chip: { bg: string; dot: string; fg: string; label: string };
  blob: string;
  planId: string;
};

export function HomeScreen() {
  const { navigate } = useNav();
  const days = [
    { d: '月', done: true },
    { d: '火', done: true },
    { d: '水', done: true },
    { d: '木', done: true },
    { d: '金', done: false, today: true },
    { d: '土', done: false },
    { d: '日', done: false },
  ];

  return (
    <Phone>
      <StatusBar />
      <div className="pt-1 px-5 pr-[76px]">
        <div className="text-[13px] text-dl-slate font-bold tracking-[0.5px]">5月3日(金)</div>
        <div className="flex gap-2 items-center mt-2.5 flex-wrap">
          <div className="bg-white rounded-full pl-1.5 pr-2.5 py-1 flex items-center gap-1 shadow-[0_0_0_2px_#F97316]">
            <Flame size={22} />
            <div className="text-[13px] font-black text-dl-fire tabular-nums">12</div>
            <div className="text-[10px] font-extrabold text-dl-slate font-jp">日連続</div>
          </div>
        </div>
      </div>

      <LessonCarousel />

      <div className="pt-[18px] px-5">
        <div className="flex justify-between items-baseline mb-2.5">
          <div className="text-sm font-extrabold text-dl-navy font-jp">今週の学習</div>
          <div className="text-[11px] font-extrabold text-dl-mint-dark font-jp">4 / 7 日</div>
        </div>
        <div className="flex gap-1.5 justify-between">
          {days.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
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
                {d.d}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3.5 px-5">
        <button
          onClick={() => navigate('create')}
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

      <TabBar active="home" />
    </Phone>
  );
}

function LessonCarousel() {
  const { navigate } = useNav();
  const lessons: Lesson[] = [
    {
      day: 12,
      status: 'today',
      eyebrow: '今日のレッスン',
      title: ['競合分析の基本', 'フレームワーク'],
      summary: '3C・4P・SWOTを使い分けて、市場のスキマを見つける方法。今日は3Cから始めよう。',
      cta: '今日の学びを始める →',
      color: DL.primary,
      shadow: DL.primaryShadow,
      chip: { bg: '#FFEDD5', dot: DL.fire, fg: DL.fireDark, label: 'DAY 12 / 30' },
      blob: '#FFE4D1',
      planId: 'side-business',
    },
    {
      day: 13,
      status: 'tomorrow',
      eyebrow: '今日のレッスン',
      title: ['顧客インタビュー', 'の作り方'],
      summary: '5人に聞くだけで仮説の8割は検証できる。質問リストを準備しよう。',
      cta: '今日の学びを始める →',
      color: DL.mint,
      shadow: DL.mintShadow,
      chip: { bg: '#DCFCE7', dot: DL.mint, fg: DL.mintDark, label: 'DAY 13 / 30' },
      blob: '#D1FAE5',
      planId: 'interview',
    },
    {
      day: 14,
      status: 'soon',
      eyebrow: '今日のレッスン',
      title: ['価格設定の', 'やさしい考え方'],
      summary: 'コスト基準・市場基準・価値基準。3つの軸でブレずに値段を決める。',
      cta: '今日の学びを始める →',
      color: '#A855F7',
      shadow: '#7E22CE',
      chip: { bg: '#EDE9FE', dot: '#A855F7', fg: '#6D28D9', label: 'DAY 14 / 30' },
      blob: '#EDE9FE',
      planId: 'pricing',
    },
  ];

  const [idx, setIdx] = useState(0);
  const [shift, setShift] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

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
    else if (dx < -40 && idx < lessons.length - 1) setIdx(idx + 1);
    startX.current = null;
  };

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
          {lessons.map((l, i) => (
            <div
              key={i}
              className="flex-[0_0_calc(100%-48px)] box-border transition-[opacity,transform] duration-[220ms]"
              style={{
                opacity: i === idx ? 1 : 0.55,
                transform: i === idx ? 'scale(1)' : 'scale(0.96)',
              }}
            >
              <div
                className="bg-white rounded-3xl pt-[18px] px-5 pb-[22px] border-[1.5px] border-dl-border shadow-[0_4px_0_#F0E2CD] relative overflow-hidden"
                style={{ opacity: l.status === 'soon' ? 0.95 : 1 }}
              >
                <div
                  className="absolute -top-10 -right-[30px] w-[120px] h-[120px] rounded-full opacity-70"
                  style={{
                    background: `radial-gradient(circle, ${l.blob} 0%, ${l.blob} 60%, transparent 70%)`,
                  }}
                />
                <div className="flex items-center justify-between relative">
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black tracking-[0.5px]"
                    style={{ background: l.chip.bg, color: l.chip.fg }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: l.chip.dot }}
                    />
                    {l.chip.label}
                  </div>
                  <div className="text-[11px] font-extrabold text-dl-slate font-jp">⏱ 約10分</div>
                </div>
                <div className="mt-3.5 text-[11px] font-extrabold text-dl-slate-light tracking-wider font-jp">
                  {l.eyebrow}
                </div>
                <div className="mt-1 text-[23px] font-black text-dl-navy font-jp leading-[1.25] tracking-[-0.3px]">
                  {l.title[0]}
                  <br />
                  {l.title[1]}
                </div>
                <div className="mt-2 text-[13px] text-dl-slate leading-[1.6] font-jp">{l.summary}</div>
                <div className="mt-[18px]">
                  <PushButton
                    color={l.color}
                    shadow={l.shadow}
                    fontSize={16}
                    onClick={() => {
                      if (!moved.current) navigate('article', { planId: l.planId, day: l.day });
                    }}
                  >
                    {l.cta}
                  </PushButton>
                </div>
                <div
                  onClick={() => {
                    if (!moved.current) navigate('roadmap', { planId: l.planId });
                  }}
                  className="mt-3.5 flex items-center justify-between pt-3 border-t border-dashed border-dl-border cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: l.chip.bg }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M3 4 Q8 4 8 8 Q8 12 13 12"
                          stroke={l.chip.fg}
                          strokeWidth="2"
                          strokeLinecap="round"
                          fill="none"
                        />
                        <circle cx="3" cy="4" r="1.6" fill={l.chip.fg} />
                        <circle cx="13" cy="12" r="1.6" fill={l.chip.fg} />
                      </svg>
                    </div>
                    <div className="text-xs font-extrabold text-dl-navy font-jp">
                      このコースのロードマップ
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M7 4 L13 10 L7 16"
                      stroke={l.chip.fg}
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-center gap-1.5 mt-3">
        {lessons.map((_, i) => (
          <div
            key={i}
            onClick={() => setIdx(i)}
            className={`h-[7px] rounded-full transition-all duration-200 cursor-pointer ${
              i === idx ? 'w-[22px] bg-dl-primary' : 'w-[7px] bg-[#E5DCC8]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

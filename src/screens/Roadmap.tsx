import { DL } from '../lib/dl';
import { useNav } from '../lib/nav';
import { Phone } from '../components/Phone';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';

type DayState = 'done' | 'current' | 'future';
type Day = { d: number; state: DayState };

export function RoadmapScreen() {
  const { navigate } = useNav();
  const days: Day[] = Array.from({ length: 30 }, (_, i) => {
    const d = i + 1;
    let state: DayState = 'future';
    if (d <= 11) state = 'done';
    else if (d === 12) state = 'current';
    return { d, state };
  });

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
            <div className="text-[22px] font-black text-dl-navy font-jp mt-0.5">副業を始める</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl px-3.5 py-2.5 border-[1.5px] border-dl-border">
          <div className="flex justify-between text-xs font-extrabold font-jp mb-1.5">
            <span className="text-dl-slate">達成度</span>
            <span className="text-dl-primary">
              13% <span className="text-dl-slate-light font-bold">(12/30日)</span>
            </span>
          </div>
          <div className="h-2 bg-[#F5EDDF] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: '13%',
                background: `linear-gradient(90deg, ${DL.primary}, ${DL.fire})`,
              }}
            />
          </div>
        </div>
      </div>

      <div
        className="absolute top-[200px] bottom-0 left-0 right-0 overflow-y-auto"
        style={{
          backgroundImage: `radial-gradient(circle, #E8DCC4 1.2px, transparent 1.5px)`,
          backgroundSize: '20px 20px',
        }}
      >
        <div className="pt-[18px] pb-[100px] relative">
          {days.map((d, i) => (
            <Node key={d.d} {...d} idx={i} />
          ))}
        </div>
      </div>

      <TabBar active="home" />
    </Phone>
  );
}

type NodeProps = Day & { idx: number };

function Node({ d, state, idx }: NodeProps) {
  const { navigate } = useNav();
  const positions = [110, 160, 200, 230, 240, 230, 200, 160, 110, 60, 30, 20, 30, 60];
  const left = positions[idx % positions.length];

  const colors: Record<DayState, { bg: string; sh: string; icon: 'check' | 'star' | 'lock' }> = {
    done: { bg: DL.mint, sh: '#0F7A38', icon: 'check' },
    current: { bg: DL.primary, sh: DL.primaryShadow, icon: 'star' },
    future: { bg: '#E5DCC8', sh: '#C9BFA8', icon: 'lock' },
  };
  const c = colors[state];
  const size = state === 'current' ? 56 : 44;
  const showLabel = state !== 'current' && (d % 10 === 0 || d === 11 || d === 1);

  return (
    <div className="relative h-[60px]">
      <div
        onClick={() => {
          if (state !== 'future') navigate('article', { day: d });
        }}
        className={`absolute top-1 ${state === 'future' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
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
              <div className="text-base">D{d}</div>
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
            Day {d}
          </div>
        )}
      </div>
    </div>
  );
}

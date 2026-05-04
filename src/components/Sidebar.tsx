import { DL } from '../lib/dl';
import { useNav, type RouteName } from '../lib/nav';
import { AppIcon } from './AppIcon';
import { Flame } from './Flame';

type Item = {
  id: RouteName;
  label: string;
  sub: string;
  icon: (active: boolean) => JSX.Element;
};

export function Sidebar() {
  const { route, navigate } = useNav();
  const items: Item[] = [
    {
      id: 'home',
      label: 'ホーム',
      sub: '今日のレッスン',
      icon: (active) => (
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <path
            d="M3 11 L11 3 L19 11 V19 a1 1 0 0 1 -1 1 H14 V14 H8 V20 H4 a1 1 0 0 1 -1 -1 Z"
            fill={active ? '#fff' : 'none'}
            stroke={active ? '#fff' : DL.navy}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'プロフィール',
      sub: '記録・バッジ',
      icon: (active) => (
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <circle
            cx="11"
            cy="8"
            r="4"
            fill={active ? '#fff' : 'none'}
            stroke={active ? '#fff' : DL.navy}
            strokeWidth="2.2"
          />
          <path
            d="M3 20 C3 15 7 13 11 13 C15 13 19 15 19 20"
            fill={active ? '#fff' : 'none'}
            stroke={active ? '#fff' : DL.navy}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];
  return (
    <aside className="hidden md:flex md:flex-col md:gap-2 md:w-[248px] md:shrink-0 md:pt-6 md:px-4 md:pb-5 md:bg-dl-bg md:border-r md:border-dl-border md:box-border">
      <div className="flex items-center gap-2.5 pt-1 px-2 pb-3.5 border-b border-dl-border mb-1.5">
        <AppIcon size={44} rounded="rounded-[14px]" />
        <div>
          <div className="text-[17px] font-black text-dl-navy font-jp leading-[1.1]">DailyLearn</div>
          <div className="text-[10px] font-bold text-dl-slate-light font-jp mt-[3px]">
            毎日10分のマイクロ学習
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {items.map((t) => {
          const isActive = route.name === t.id;
          return (
            <button
              key={t.id}
              onClick={() => navigate(t.id)}
              className={`flex items-center gap-3 p-3 rounded-[14px] cursor-pointer text-left transition-[background,border-color] duration-[120ms] border-[1.5px] font-sans ${
                isActive
                  ? 'bg-dl-primary border-dl-primary shadow-[0_3px_0_#C8431A]'
                  : 'bg-transparent border-transparent hover:bg-dl-cream'
              }`}
            >
              <span className="w-5 h-5 flex shrink-0">{t.icon(isActive)}</span>
              <span className="flex flex-col gap-0.5">
                <span
                  className={`text-sm font-black font-jp leading-[1.1] ${
                    isActive ? 'text-white' : 'text-dl-navy'
                  }`}
                >
                  {t.label}
                </span>
                <span
                  className={`text-[10px] font-bold font-jp ${
                    isActive ? 'text-white/85' : 'text-dl-slate-light'
                  }`}
                >
                  {t.sub}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-3 px-3.5 py-3 rounded-2xl border-[1.5px] border-[#FED7AA] shadow-[0_3px_0_#F0E2CD] bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5]">
        <Flame size={36} />
        <div>
          <div className="text-[10px] font-extrabold text-dl-fire-dark tracking-wider font-jp">連続記録</div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <div className="text-[22px] font-black text-dl-fire leading-none tabular-nums">12</div>
            <div className="text-[11px] font-extrabold text-dl-slate font-jp">日連続</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

import { NavLink } from 'react-router-dom';
import { DL } from '../lib/dl';
import { AppIcon } from './AppIcon';

type Item = {
  to: string;
  label: string;
  sub: string;
  icon: (active: boolean) => JSX.Element;
};

export function Sidebar() {
  const items: Item[] = [
    {
      to: '/home',
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
      to: '/profile',
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
        {items.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            replace
            className={({ isActive }) =>
              `flex items-center gap-3 p-3 rounded-[14px] cursor-pointer text-left transition-[background,border-color] duration-[120ms] border-[1.5px] font-sans ${
                isActive
                  ? 'bg-dl-primary border-dl-primary shadow-[0_3px_0_#C8431A]'
                  : 'bg-transparent border-transparent hover:bg-dl-cream'
              }`
            }
          >
            {({ isActive }) => (
              <>
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
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1" />
    </aside>
  );
}

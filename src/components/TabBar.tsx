import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DL } from '../lib/dl';

type ActiveTab = 'home' | 'profile';

type Props = { active?: ActiveTab };

// Hamburger menu (top-right). Hidden on desktop where the sidebar takes over.
export function TabBar({ active }: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const resolved: ActiveTab = active ?? (location.pathname.startsWith('/profile') ? 'profile' : 'home');

  const items: { id: ActiveTab; to: string; label: string; sub: string }[] = [
    { id: 'home', to: '/home', label: 'ホーム', sub: '今日のレッスン' },
    { id: 'profile', to: '/profile', label: 'プロフィール', sub: '記録・バッジ' },
  ];
  return (
    <div className="absolute top-[14px] right-4 z-30 flex flex-col items-end gap-2 md:hidden">
      <div
        onClick={() => setOpen((o) => !o)}
        className={`w-11 h-11 rounded-[14px] flex items-center justify-center cursor-pointer border-[1.5px] ${
          open
            ? 'bg-dl-primary border-dl-primary shadow-[0_3px_0_#C8431A]'
            : 'bg-white border-dl-border shadow-[0_3px_0_#F0E2CD]'
        }`}
      >
        {open ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2 L12 12 M12 2 L2 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
            <rect x="0" y="0" width="20" height="2.5" rx="1.25" fill={DL.navy} />
            <rect x="0" y="5.75" width="20" height="2.5" rx="1.25" fill={DL.navy} />
            <rect x="0" y="11.5" width="20" height="2.5" rx="1.25" fill={DL.navy} />
          </svg>
        )}
      </div>
      {open && (
        <div className="bg-white rounded-[18px] border-[1.5px] border-dl-border p-1.5 w-[220px] shadow-[0_8px_0_#F0E2CD,0_12px_32px_rgba(15,23,42,0.08)]">
          {items.map((t) => {
            const isActive = resolved === t.id;
            return (
              <div
                key={t.id}
                onClick={() => {
                  setOpen(false);
                  navigate(t.to, { replace: true });
                }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer ${
                  isActive ? 'bg-[#FFEDD5]' : 'bg-transparent'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isActive ? 'bg-dl-primary' : 'bg-[#E5DCC8]'
                  }`}
                />
                <div className="flex-1">
                  <div
                    className={`text-[13px] font-black font-jp leading-[1.1] ${
                      isActive ? 'text-dl-fire-dark' : 'text-dl-navy'
                    }`}
                  >
                    {t.label}
                  </div>
                  <div className="text-[10px] font-bold text-dl-slate-light font-jp mt-0.5">
                    {t.sub}
                  </div>
                </div>
                {isActive && (
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <path
                      d="M3 7 L6 10 L11 4"
                      stroke={DL.primary}
                      strokeWidth="2.6"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

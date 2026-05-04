import { Children, Fragment, type ReactNode } from 'react';
import { DL } from '../lib/dl';
import { useNav } from '../lib/nav';
import { Phone } from '../components/Phone';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { Mascot } from '../components/Mascot';
import { Flame } from '../components/Flame';

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const arr = Children.toArray(children);
  return (
    <div className="pt-5 px-5">
      <div className="text-[11px] font-black text-dl-slate-light font-jp tracking-wider mb-1.5 pl-1">
        {title}
      </div>
      <div className="bg-white rounded-2xl border-[1.5px] border-dl-border overflow-hidden">
        {arr.map((child, i) => (
          <Fragment key={i}>
            {i > 0 && <div className="h-px bg-dl-divider ml-3.5" />}
            {child}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function SettingsRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="px-3.5 py-3 flex items-center gap-2.5 cursor-pointer"
    >
      <div className="text-xs font-extrabold text-dl-navy font-jp">{label}</div>
      <div className="flex-1" />
      {value && <div className="text-xs font-bold text-dl-slate font-jp">{value}</div>}
      <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
        <path
          d="M1.5 1.5 L6 6 L1.5 10.5"
          stroke={DL.slateLight}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

type Stat = { label: string; value: string; unit: string; color: string; bg: string };
type Badge = { icon: string; label: string; unlocked: boolean; color?: string };

export function ProfileScreen() {
  const { navigate } = useNav();
  const stats: Stat[] = [
    { label: '総学習日数', value: '47', unit: '日', color: DL.primary, bg: '#FFEDD5' },
    { label: '完了レッスン', value: '38', unit: '本', color: DL.mintDark, bg: '#DCFCE7' },
  ];
  const badges: Badge[] = [
    { icon: '🎯', label: '目標設定', unlocked: true, color: DL.primary },
    { icon: '🔥', label: '7日連続', unlocked: true, color: DL.fire },
    { icon: '📚', label: '初学習', unlocked: true, color: DL.mint },
    { icon: '💎', label: '30日達成', unlocked: false },
    { icon: '🏆', label: '100日連続', unlocked: false },
  ];

  return (
    <Phone>
      <StatusBar />
      <div className="absolute top-4 bottom-0 left-0 right-0 overflow-y-auto pb-6">
        <div className="pt-1 px-5 pr-[76px] flex items-center gap-3">
          <div className="w-[60px] h-[60px] rounded-full bg-[#FEF3C7] border-[3px] border-dl-yellow flex items-center justify-center shrink-0">
            <Mascot size={48} />
          </div>
          <div>
            <div className="text-[17px] font-black text-dl-navy font-jp">たけし</div>
          </div>
        </div>

        <div className="pt-4 px-5">
          <div className="rounded-[22px] border-[1.5px] border-[#FED7AA] px-[18px] py-4 flex items-center gap-3.5 relative overflow-hidden shadow-[0_3px_0_#F0E2CD] bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5]">
            <Flame size={62} />
            <div className="flex-1">
              <div className="text-[11px] font-extrabold text-dl-fire-dark tracking-wider font-jp">
                連続記録
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <div className="text-4xl font-black text-dl-fire leading-none tabular-nums">12</div>
                <div className="text-sm font-extrabold text-dl-slate font-jp">日連続</div>
              </div>
              <div className="text-[11px] font-bold text-dl-slate font-jp mt-1">
                最長記録 <span className="text-dl-navy font-black">28日</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-3.5 px-5">
          <div className="grid grid-cols-2 gap-2.5">
            {stats.map((s, i) => (
              <div
                key={i}
                className="rounded-2xl px-3.5 py-3 border-[1.5px]"
                style={{ background: s.bg, borderColor: `${s.color}30` }}
              >
                <div className="text-[10px] font-extrabold text-dl-slate font-jp">{s.label}</div>
                <div className="flex items-baseline gap-[3px] mt-1">
                  <div
                    className="text-2xl font-black leading-none tabular-nums"
                    style={{ color: s.color }}
                  >
                    {s.value}
                  </div>
                  <div className="text-[11px] font-extrabold text-dl-slate font-jp">{s.unit}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3.5 px-5">
          <div className="flex justify-between items-baseline mb-2">
            <div className="text-[13px] font-black text-dl-navy font-jp">バッジ</div>
          </div>
          <div className="flex gap-2 justify-between">
            {badges.map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-2xl"
                  style={{
                    background: b.unlocked ? '#fff' : '#F5EDDF',
                    border: `2px solid ${b.unlocked ? b.color || DL.primary : '#E5DCC8'}`,
                    opacity: b.unlocked ? 1 : 0.4,
                    filter: b.unlocked ? 'none' : 'grayscale(1)',
                    boxShadow: b.unlocked ? `0 3px 0 ${b.color || DL.primary}40` : 'none',
                  }}
                >
                  {b.unlocked ? b.icon : '🔒'}
                </div>
                <div
                  className={`text-[9px] font-extrabold font-jp text-center ${
                    b.unlocked ? 'text-dl-navy' : 'text-dl-slate-light'
                  }`}
                >
                  {b.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <SettingsSection title="アカウント">
          <SettingsRow label="プロフィール" value="名前・メール・パスワード" onClick={() => navigate('account')} />
        </SettingsSection>

        <SettingsSection title="サブスクリプション">
          <div className="px-3.5 py-3 flex items-center gap-3">
            <div className="px-2.5 py-1 rounded-full text-[11px] font-black font-jp text-[#78350F] bg-gradient-to-r from-dl-yellow to-[#F59E0B]">
              無料プラン
            </div>
            <div className="flex-1 text-[11px] font-bold text-dl-slate font-jp">1日1レッスン</div>
            <div className="text-xs font-black text-dl-primary font-jp">変更 →</div>
          </div>
        </SettingsSection>

        <SettingsSection title="その他">
          <SettingsRow label="利用規約" />
          <SettingsRow label="プライバシーポリシー" />
        </SettingsSection>

        <div className="pt-5 px-5">
          <div className="p-3.5 rounded-2xl border-[1.5px] border-[#FECACA] bg-white text-center text-[13px] font-black text-[#DC2626] font-jp cursor-pointer">
            ログアウト
          </div>
        </div>
      </div>

      <TabBar active="profile" />
    </Phone>
  );
}

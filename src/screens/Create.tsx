import { useState, type ReactNode } from 'react';
import { DL } from '../lib/dl';
import { useNav } from '../lib/nav';
import { Phone } from '../components/Phone';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { PushButton } from '../components/PushButton';

type Level = { id: string; label: string; sub: string; emoji: string };

const inputClass =
  'w-full box-border bg-white border-[1.5px] border-dl-border rounded-2xl px-3.5 py-3 text-sm font-bold text-dl-navy font-jp outline-none';

export function CreateScreen() {
  const { navigate } = useNav();
  const [field, setField] = useState('');
  const [level, setLevel] = useState('beginner');
  const [goal, setGoal] = useState('');

  const levels: Level[] = [
    { id: 'novice', label: '全くの初心者', sub: 'これから始める', emoji: '🌱' },
    { id: 'beginner', label: '基礎を知っている', sub: '入門書は読んだ', emoji: '📖' },
    { id: 'intermediate', label: '実務経験あり', sub: '何度か手を動かした', emoji: '🛠️' },
    { id: 'advanced', label: '上級者', sub: '人に教えられる', emoji: '🎓' },
  ];

  const canSubmit = field.trim().length > 0 && goal.trim().length > 0;

  return (
    <Phone>
      <StatusBar />
      <div className="pt-2 px-4 pb-3 pr-[76px] flex items-center gap-2.5">
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
        <div className="flex-1">
          <div className="text-[10px] font-extrabold text-dl-slate-light tracking-wider">NEW COURSE</div>
          <div className="text-[13px] font-black text-dl-navy font-jp mt-px">新しい学習コース</div>
        </div>
      </div>

      <div className="absolute top-[70px] bottom-0 left-0 right-0 overflow-y-auto pt-1 px-5 pb-[120px]">
        <div className="mb-[18px]">
          <h1 className="text-[22px] font-black text-dl-navy font-jp leading-[1.3] mt-0 mx-0 mb-1.5 tracking-[-0.3px]">
            何を学びたい？
          </h1>
          <div className="text-xs text-dl-slate font-jp leading-[1.5]">
            3つ答えるだけで、AIが30日のコースを設計します。
          </div>
        </div>

        <Field label="📚 分野" hint="例: 副業, 投資, プログラミング, 英会話">
          <input
            value={field}
            onChange={(e) => setField(e.target.value)}
            placeholder="学びたい分野を入力"
            className={inputClass}
          />
        </Field>

        <Field label="🎯 自分の状態" hint="今のレベルにいちばん近いものを1つ選んでください">
          <div className="flex flex-col gap-2">
            {levels.map((l) => {
              const active = level === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLevel(l.id)}
                  className={`w-full rounded-2xl px-3.5 py-3 flex items-center gap-3 cursor-pointer font-jp text-left transition-all duration-[120ms] border-2 ${
                    active
                      ? 'bg-[#FFF7ED] border-dl-primary shadow-[0_3px_0_rgba(255,122,69,0.25)]'
                      : 'bg-white border-dl-border'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                      active ? 'bg-dl-primary' : 'bg-[#F5EDDF]'
                    }`}
                  >
                    {l.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black text-dl-navy">{l.label}</div>
                    <div className="text-[11px] font-bold text-dl-slate mt-px">{l.sub}</div>
                  </div>
                  <div
                    className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 ${
                      active ? 'border-dl-primary bg-dl-primary' : 'border-[#E5DCC8] bg-white'
                    }`}
                  >
                    {active && (
                      <svg width="12" height="12" viewBox="0 0 12 12">
                        <path
                          d="M2 6 L5 9 L10 3"
                          stroke="#fff"
                          strokeWidth="2.4"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="🏁 ゴール" hint="30日後にどうなっていたい？具体的なほどコースの精度が上がります">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="例: 月3万円の副業収入を作る / 簡単なWebアプリを公開する"
            rows={3}
            className={`${inputClass} resize-none leading-[1.5]`}
          />
        </Field>
      </div>

      <div className="absolute bottom-6 left-4 right-4 z-20">
        <div
          className={`${canSubmit ? 'opacity-100 pointer-events-auto' : 'opacity-45 pointer-events-none'}`}
        >
          <PushButton color={DL.primary} shadow={DL.primaryShadow} fontSize={16} onClick={() => navigate('home')}>
            ✨ コースを作成する
          </PushButton>
        </div>
      </div>

      <TabBar active="home" />
    </Phone>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-[18px]">
      <div className="text-[13px] font-black text-dl-navy font-jp mb-1">{label}</div>
      {hint && (
        <div className="text-[11px] font-bold text-dl-slate font-jp mb-2.5 leading-[1.5]">{hint}</div>
      )}
      {children}
    </div>
  );
}

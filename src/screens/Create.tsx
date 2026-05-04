import { useState, type ReactNode } from 'react';
import { DL } from '../lib/dl';
import { useNav } from '../lib/nav';
import { Phone } from '../components/Phone';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { PushButton } from '../components/PushButton';

const inputClass =
  'w-full box-border bg-white border-[1.5px] border-dl-border rounded-2xl px-3.5 py-3 text-sm font-bold text-dl-navy font-jp outline-none';

export function CreateScreen() {
  const { navigate } = useNav();
  const [field, setField] = useState('');
  const [prerequisite, setPrerequisite] = useState('');
  const [goal, setGoal] = useState('');

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
            いくつか答えるだけで、AIが30日のコースを設計します。
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

        <Field
          label="🧭 前提にしていい知識(任意)"
          hint="すでに知っていることがあれば書いてください。未入力なら基礎から組み立てます"
        >
          <textarea
            value={prerequisite}
            onChange={(e) => setPrerequisite(e.target.value)}
            placeholder="例: HTML/CSSは書ける / 簿記3級は持っている"
            rows={2}
            className={`${inputClass} resize-none leading-[1.5]`}
          />
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

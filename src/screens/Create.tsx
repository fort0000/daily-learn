import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { DL } from '../lib/dl';
import { Phone } from '../components/Phone';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { PushButton } from '../components/PushButton';
import { PlanLimitError, fetchActiveCourses, startCourseGeneration } from '../lib/db';
import { useProfile, useSession } from '../lib/auth';

const inputClass =
  'w-full box-border bg-white border-[1.5px] border-dl-border rounded-2xl px-3.5 py-3 text-sm font-bold text-dl-navy font-jp outline-none';

export function CreateScreen() {
  const navigate = useNavigate();
  const session = useSession();
  const userId = session.session?.user.id ?? null;
  const { profile } = useProfile(userId);
  const [field, setField] = useState('');
  const [prerequisite, setPrerequisite] = useState('');
  const [goal, setGoal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mount-time guard: deep-linking /create as a free user with an existing
  // course should not show this form. Bounce to /upgrade instead.
  useEffect(() => {
    if (!profile || profile.plan !== 'free') return;
    let active = true;
    fetchActiveCourses()
      .then((courses) => {
        if (!active) return;
        if (courses.length >= 1) navigate('/upgrade', { replace: true });
      })
      .catch((e) => console.error('[Create] guard fetch failed:', e));
    return () => {
      active = false;
    };
  }, [profile?.plan, navigate]);

  const canSubmit =
    !submitting && field.trim().length > 0 && goal.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await startCourseGeneration({
        field: field.trim(),
        prerequisite: prerequisite.trim() || null,
        goal: goal.trim(),
      });
      // Navigate immediately. Home subscribes to the courses table via
      // Realtime; the card flips to its "ready" state on its own when the
      // background generation finishes.
      navigate('/home');
    } catch (e) {
      if (e instanceof PlanLimitError) {
        navigate('/upgrade', { replace: true });
        return;
      }
      console.error('[Create] startCourseGeneration failed:', e);
      setError(e instanceof Error ? e.message : 'コースの作成リクエストに失敗しました');
      setSubmitting(false);
    }
  };

  return (
    <Phone>
      <StatusBar />
      <div className="pt-2 px-4 pb-3 pr-[76px] flex items-center gap-2.5">
        <div
          onClick={() => navigate(-1)}
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

      <div className="absolute top-[70px] bottom-0 left-0 right-0 overflow-y-auto overscroll-contain pt-1 px-5 pb-[120px]">
        <div className="mb-[18px]">
          <h1 className="text-[22px] font-black text-dl-navy font-jp leading-[1.3] mt-0 mx-0 mb-1.5 tracking-[-0.3px]">
            何を学びたい？
          </h1>
          <div className="text-xs text-dl-slate font-jp leading-[1.5]">
            いくつか答えるだけで、AIが30日のコースを設計します。生成は裏側で進むので、ボタンを押したらホームに戻ってもOKです。
          </div>
        </div>

        <Field label="📚 分野" hint="例: 副業, 投資, プログラミング, 英会話">
          <input
            value={field}
            onChange={(e) => setField(e.target.value)}
            placeholder="学びたい分野を入力"
            className={inputClass}
            disabled={submitting}
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
            disabled={submitting}
          />
        </Field>

        <Field label="🏁 ゴール" hint="30日後にどうなっていたい？具体的なほどコースの精度が上がります">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="例: 月3万円の副業収入を作る / 簡単なWebアプリを公開する"
            rows={3}
            className={`${inputClass} resize-none leading-[1.5]`}
            disabled={submitting}
          />
        </Field>

        {error && (
          <div className="mt-2 px-3.5 py-2.5 rounded-2xl border-[1.5px] border-[#FCA5A5] bg-[#FEF2F2] text-[12px] font-bold text-[#B91C1C] font-jp leading-[1.5]">
            {error}
          </div>
        )}
      </div>

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] left-4 right-4 z-20">
        <div
          className={`${canSubmit ? 'opacity-100 pointer-events-auto' : 'opacity-45 pointer-events-none'}`}
        >
          <PushButton color={DL.primary} shadow={DL.primaryShadow} fontSize={16} onClick={handleSubmit}>
            {submitting ? '送信中…' : 'コースを作成する'}
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

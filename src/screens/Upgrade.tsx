import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DL } from '../lib/dl';
import { Phone } from '../components/Phone';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { PushButton } from '../components/PushButton';
import { useProfile, useSession } from '../lib/auth';
import { startBillingCheckout } from '../lib/db';

export function UpgradeScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const session = useSession();
  const userId = session.session?.user.id ?? null;
  const { profile, refresh } = useProfile(userId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = searchParams.get('status');
  const isAlreadyPaid = profile?.plan === 'paid';

  // After Stripe Checkout completes, the user is redirected back with
  // `?status=success`. The webhook should have flipped profiles.plan to 'paid'
  // by the time we land, but allow up to ~12s for the round-trip and poll.
  const pollRef = useRef<number | null>(null);
  useEffect(() => {
    if (status !== 'success') return;
    if (isAlreadyPaid) {
      // Drop the query string and head home.
      setSearchParams({}, { replace: true });
      navigate('/home', { replace: true });
      return;
    }
    let attempts = 0;
    const tick = () => {
      attempts += 1;
      refresh();
      if (attempts >= 12) {
        if (pollRef.current) window.clearInterval(pollRef.current);
      }
    };
    pollRef.current = window.setInterval(tick, 1000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [status, isAlreadyPaid, refresh, setSearchParams, navigate]);

  const handleUpgrade = async () => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const { url } = await startBillingCheckout();
      window.location.href = url;
    } catch (err) {
      console.error('[Upgrade] checkout failed:', err);
      setError(err instanceof Error ? err.message : 'チェックアウトの開始に失敗しました');
      setSubmitting(false);
    }
  };

  return (
    <Phone>
      <StatusBar />
      <div className="pt-2 px-4 pb-3 pr-[76px] flex items-center gap-2.5">
        <div
          onClick={() => navigate('/home')}
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
          <div className="text-[10px] font-extrabold text-dl-slate-light tracking-wider">UPGRADE</div>
          <div className="text-[13px] font-black text-dl-navy font-jp mt-px">プランを切り替える</div>
        </div>
      </div>

      <div className="absolute top-[70px] bottom-0 left-0 right-0 overflow-y-auto px-5 pb-[120px]">
        {status === 'cancel' && (
          <div className="mb-4 px-3.5 py-2.5 rounded-2xl border-[1.5px] border-[#FCA5A5] bg-[#FEF2F2] text-[12px] font-bold text-[#B91C1C] font-jp leading-[1.5]">
            支払いをキャンセルしました。いつでも再開できます。
          </div>
        )}
        {status === 'success' && !isAlreadyPaid && (
          <div className="mb-4 px-3.5 py-2.5 rounded-2xl border-[1.5px] border-[#FED7AA] bg-[#FFF7ED] text-[12px] font-bold text-[#9A3412] font-jp leading-[1.5]">
            支払いを確認中です…(数秒お待ちください)
          </div>
        )}

        <div className="text-center pt-4 pb-2">
          <div className="text-[34px]">🔓</div>
          <h1 className="text-[22px] font-black text-dl-navy font-jp mt-2 leading-[1.3] tracking-[-0.3px]">
            すべての学習を解放しよう
          </h1>
          <p className="text-[13px] font-bold text-dl-slate font-jp mt-2 leading-[1.6]">
            有料プランでは無制限のコース・全 30 日のレッスン・AIアシスタントが使えます。
          </p>
        </div>

        <ComparisonTable />

        {error && (
          <div className="mt-3 px-3.5 py-2.5 rounded-2xl border-[1.5px] border-[#FCA5A5] bg-[#FEF2F2] text-[12px] font-bold text-[#B91C1C] font-jp leading-[1.5]">
            {error}
          </div>
        )}
      </div>

      <div className="absolute bottom-6 left-4 right-4 z-20">
        <div className={submitting ? 'opacity-60 pointer-events-none' : ''}>
          <PushButton
            color={DL.primary}
            shadow={DL.primaryShadow}
            fontSize={16}
            onClick={handleUpgrade}
          >
            {submitting ? '読み込み中…' : '有料プランにアップグレード'}
          </PushButton>
        </div>
        <div
          onClick={() => navigate('/home')}
          className="mt-3 text-center text-[12px] font-extrabold text-dl-slate-light font-jp cursor-pointer"
        >
          あとで
        </div>
      </div>

      <TabBar active="home" />
    </Phone>
  );
}

function ComparisonTable() {
  const rows: Array<{ label: string; free: string; paid: string; freeIcon?: string; paidIcon?: string }> = [
    { label: 'コース作成', free: '1 コース', paid: '無制限', freeIcon: '1', paidIcon: '∞' },
    { label: 'レッスン受講', free: 'Day 1〜10', paid: '全 30 日', freeIcon: '10', paidIcon: '30' },
    { label: 'AIアシスタント', free: '使えない', paid: '無制限', freeIcon: '✕', paidIcon: '✓' },
  ];
  return (
    <div className="mt-5 bg-white rounded-3xl border-[1.5px] border-dl-border overflow-hidden shadow-[0_4px_0_#F0E2CD]">
      <div className="grid grid-cols-3 text-[11px] font-extrabold font-jp tracking-wider">
        <div className="px-3 py-3 text-dl-slate-light">プラン特典</div>
        <div className="px-3 py-3 text-center text-dl-slate-light bg-[#FAF5EC]">無料</div>
        <div className="px-3 py-3 text-center text-white bg-dl-primary">有料</div>
      </div>
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-3 border-t border-dl-divider">
          <div className="px-3 py-3 text-[12px] font-black text-dl-navy font-jp">{r.label}</div>
          <div className="px-3 py-3 text-center text-[13px] font-extrabold text-dl-slate font-jp bg-[#FAF5EC]/50">
            {r.free}
          </div>
          <div className="px-3 py-3 text-center text-[13px] font-black text-dl-primary font-jp">
            {r.paid}
          </div>
        </div>
      ))}
    </div>
  );
}

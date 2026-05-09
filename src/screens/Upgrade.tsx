import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DL } from '../lib/dl';
import { Phone } from '../components/Phone';
import { PushButton } from '../components/PushButton';
import { useProfile, useSession } from '../lib/auth';
import { startBillingCheckout, type BillingCadence } from '../lib/db';

export function UpgradeScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const session = useSession();
  const userId = session.session?.user.id ?? null;
  const { profile, refresh } = useProfile(userId);

  const [billing, setBilling] = useState<BillingCadence>('monthly');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = searchParams.get('status');
  const isAlreadyPaid = profile?.plan === 'paid';

  // After Stripe Checkout succeeds the user lands here with ?status=success.
  // The webhook usually flips profiles.plan before they arrive but allow ~12s
  // of polling to cover the redirect→webhook race.
  const pollRef = useRef<number | null>(null);
  useEffect(() => {
    if (status !== 'success') return;
    if (isAlreadyPaid) {
      setSearchParams({}, { replace: true });
      navigate('/home', { replace: true });
      return;
    }
    let attempts = 0;
    const tick = () => {
      attempts += 1;
      refresh();
      if (attempts >= 12 && pollRef.current) {
        window.clearInterval(pollRef.current);
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
      const { url } = await startBillingCheckout(billing);
      window.location.href = url;
    } catch (err) {
      console.error('[Upgrade] checkout failed:', err);
      setError(err instanceof Error ? err.message : 'チェックアウトの開始に失敗しました');
      setSubmitting(false);
    }
  };

  return (
    <Phone>
      <div className="absolute inset-0 overflow-y-auto pb-10">
        <div className="h-4" />

        {/* Top bar */}
        <div className="px-5 pt-1 flex items-center gap-2.5">
          <div
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white border-[1.5px] border-dl-border flex items-center justify-center cursor-pointer shrink-0 shadow-[0_2px_0_#F0E2CD]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M9 2 L3 7 L9 12"
                stroke={DL.navy}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex-1 text-center pr-10 text-[15px] font-black text-dl-navy font-jp">
            プラン
          </div>
        </div>

        {/* Hero */}
        <div className="px-5 pt-[18px] text-center">
          <div className="text-[24px] font-black text-dl-navy font-jp leading-[1.3] tracking-[-0.3px]">
            学びを<span className="text-dl-primary">無制限</span>に
          </div>
          <div className="mt-1 text-[12px] font-bold text-dl-slate font-jp">
            AIコーチがあなた専用のプランを設計します
          </div>
        </div>

        {/* Status banners */}
        {status === 'cancel' && (
          <div className="px-5 mt-4">
            <div className="px-3.5 py-2.5 rounded-2xl border-[1.5px] border-[#FCA5A5] bg-[#FEF2F2] text-[12px] font-bold text-[#B91C1C] font-jp leading-[1.5]">
              支払いをキャンセルしました。いつでも再開できます。
            </div>
          </div>
        )}
        {status === 'success' && !isAlreadyPaid && (
          <div className="px-5 mt-4">
            <div className="px-3.5 py-2.5 rounded-2xl border-[1.5px] border-[#FED7AA] bg-[#FFF7ED] text-[12px] font-bold text-[#9A3412] font-jp leading-[1.5]">
              支払いを確認中です…(数秒お待ちください)
            </div>
          </div>
        )}

        {/* Billing toggle */}
        <div className="px-5 pt-[14px]">
          <div
            className="rounded-full p-1 flex"
            style={{ background: '#F5EDDF' }}
          >
            {(
              [
                { id: 'monthly', label: '月額', save: null },
                { id: 'yearly', label: '年額', save: '2ヶ月分お得' },
              ] as const
            ).map((o) => {
              const on = billing === o.id;
              return (
                <div
                  key={o.id}
                  onClick={() => setBilling(o.id)}
                  className="flex-1 h-[34px] rounded-full flex items-center justify-center gap-1.5 text-[12px] font-black font-jp cursor-pointer transition-all duration-150"
                  style={{
                    background: on ? '#fff' : 'transparent',
                    boxShadow: on ? '0 2px 0 #E5DCC8, 0 1px 3px rgba(15,23,42,0.06)' : undefined,
                    color: on ? DL.navy : DL.slateLight,
                  }}
                >
                  {o.label}
                  {o.save && (
                    <span
                      className="text-[9px] font-black font-jp px-1.5 py-0.5 rounded-full"
                      style={{
                        letterSpacing: 0.3,
                        background: on ? '#DCFCE7' : '#fff',
                        color: DL.mintDark,
                      }}
                    >
                      {o.save}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Premium hero card */}
        <div className="px-5 pt-[14px]">
          <div
            className="relative rounded-3xl overflow-hidden text-white"
            style={{
              background:
                'linear-gradient(160deg, #1B2540 0%, #0F172A 60%, #1F2A4A 100%)',
              padding: '18px 18px 16px',
              boxShadow: '0 4px 0 #C8431A',
              border: `2px solid ${DL.primary}`,
            }}
          >
            {/* corner glow */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: -50,
                right: -50,
                width: 160,
                height: 160,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(255,122,69,0.35) 0%, transparent 65%)',
              }}
            />

            <div className="relative">
              <div
                className="inline-flex items-center gap-1.5 text-[11px] font-black font-jp"
                style={{ letterSpacing: 1.5, color: '#FFD7B5' }}
              >
                <span
                  style={{ width: 14, height: 2, background: DL.primary, borderRadius: 2 }}
                />
                PREMIUM
              </div>
              <div className="mt-1.5 text-[18px] font-black text-white font-jp leading-[1.2]">
                DailyLearn プレミアム
              </div>

              {/* Price row */}
              {billing === 'monthly' ? (
                <div className="mt-2.5 flex items-baseline gap-1">
                  <div className="text-[13px] font-extrabold" style={{ color: '#FFD7B5' }}>
                    ¥
                  </div>
                  <div
                    className="text-[44px] font-black text-white leading-none tabular-nums"
                    style={{ letterSpacing: -1 }}
                  >
                    980
                  </div>
                  <div
                    className="text-[13px] font-extrabold font-jp"
                    style={{ color: '#FFD7B5' }}
                  >
                    / 月
                  </div>
                </div>
              ) : (
                <div className="mt-2.5">
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <div
                      className="text-[13px] font-extrabold tabular-nums mr-0.5 line-through"
                      style={{
                        color: '#FFD7B5',
                        textDecorationColor: 'rgba(255,215,181,0.7)',
                      }}
                    >
                      ¥980
                    </div>
                    <div className="text-[13px] font-extrabold" style={{ color: '#FFD7B5' }}>
                      ¥
                    </div>
                    <div
                      className="text-[44px] font-black text-white leading-none tabular-nums"
                      style={{ letterSpacing: -1 }}
                    >
                      816
                    </div>
                    <div
                      className="text-[13px] font-extrabold font-jp"
                      style={{ color: '#FFD7B5' }}
                    >
                      / 月
                    </div>
                    <div
                      className="ml-auto text-[10px] font-black text-white font-jp"
                      style={{
                        background: 'linear-gradient(90deg, #22C55E, #16A34A)',
                        letterSpacing: 0.4,
                        padding: '5px 9px',
                        borderRadius: 999,
                        boxShadow: '0 2px 0 #0F7A38',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ¥1,960 お得
                    </div>
                  </div>
                  <div
                    className="mt-2 flex items-center gap-2"
                    style={{
                      background: 'rgba(34,197,94,0.12)',
                      border: '1px solid rgba(134,239,172,0.3)',
                      borderRadius: 10,
                      padding: '7px 10px',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M3 7 L6 10 L11 4"
                        stroke="#86EFAC"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div
                      className="text-[11px] font-extrabold font-jp"
                      style={{ color: '#BBF7D0' }}
                    >
                      年額{' '}
                      <span className="text-white tabular-nums">¥9,800</span> を一括 ·{' '}
                      <span className="text-white">2ヶ月分無料</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Feature list */}
              <div className="mt-3.5 flex flex-col gap-2">
                {(
                  [
                    { text: 'コース', value: '無制限' },
                    { text: 'レッスン', value: '無制限' },
                    { text: 'AIアシスタント', value: '無制限' },
                  ] as const
                ).map((f) => (
                  <div
                    key={f.text}
                    className="flex items-center gap-2.5"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: 12,
                      padding: '10px 12px',
                      border: '1px solid rgba(255,215,181,0.15)',
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: DL.primary,
                        boxShadow: `0 2px 0 ${DL.primaryShadow}`,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                          d="M3 7 L6 10 L11 4"
                          stroke="#fff"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 text-[13px] font-extrabold text-white font-jp">
                      {f.text}
                    </div>
                    <div
                      className="text-[12px] font-black font-jp"
                      style={{
                        color: '#FFD7B5',
                        background: 'rgba(255,122,69,0.18)',
                        padding: '3px 9px',
                        borderRadius: 999,
                        letterSpacing: 0.3,
                      }}
                    >
                      {f.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className={`mt-3.5 ${submitting ? 'opacity-60 pointer-events-none' : ''}`}>
                <PushButton
                  color={DL.primary}
                  shadow={DL.primaryShadow}
                  fontSize={15}
                  height={54}
                  onClick={handleUpgrade}
                >
                  {submitting
                    ? '読み込み中…'
                    : billing === 'monthly'
                      ? 'プレミアムを始める →'
                      : '年額プランで始める →'}
                </PushButton>
              </div>
              <div
                className="mt-2 text-center text-[10px] font-bold font-jp"
                style={{ color: '#FFD7B5', opacity: 0.7 }}
              >
                {billing === 'monthly'
                  ? 'いつでもキャンセル可能 · 自動更新'
                  : '初年度 ¥9,800 · 翌年以降も同額で自動更新'}
              </div>
              {error && (
                <div
                  className="mt-2 px-3 py-2 rounded-xl text-[11px] font-extrabold font-jp text-center"
                  style={{ background: 'rgba(220,38,38,0.18)', color: '#FECACA' }}
                >
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Free card */}
        <div className="px-5 pt-3">
          <div className="bg-white rounded-[20px] border-[1.5px] border-dl-border px-4 py-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div
                  className="inline-flex items-center gap-1.5 text-[10px] font-black font-jp"
                  style={{ letterSpacing: 1.5, color: DL.slateLight }}
                >
                  <span
                    style={{ width: 10, height: 2, background: DL.slateLight, borderRadius: 2 }}
                  />
                  FREE
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <div className="text-[13px] font-extrabold text-dl-slate font-jp">
                    無料プラン
                  </div>
                  <div className="text-[11px] font-extrabold text-dl-slate-light font-jp">
                    · ¥0
                  </div>
                </div>
              </div>
              {!isAlreadyPaid && (
                <div
                  className="text-[9px] font-black font-jp shrink-0"
                  style={{
                    letterSpacing: 0.6,
                    background: '#DCFCE7',
                    color: DL.mintDark,
                    padding: '4px 8px',
                    borderRadius: 999,
                  }}
                >
                  ✓ 現在のプラン
                </div>
              )}
            </div>

            <div className="mt-2.5 flex flex-col gap-1.5">
              {(
                [
                  { ok: true, text: '1コースまで作成可能' },
                  { ok: true, text: '10レッスンまで受講可能' },
                  { ok: false, text: 'AIアシスタント機能は使えません' },
                ] as const
              ).map((f) => (
                <FeatureRow key={f.text} ok={f.ok} text={f.text} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Phone>
  );
}

function FeatureRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0"
        style={{ background: ok ? '#DCFCE7' : '#FEE2E2' }}
      >
        {ok ? (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path
              d="M2 5 L4 7 L8 3"
              stroke={DL.mintDark}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="8" height="8" viewBox="0 0 8 8">
            <path
              d="M2 2 L6 6 M6 2 L2 6"
              stroke="#DC2626"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
      <div
        className="text-[12px] font-bold font-jp"
        style={{
          color: ok ? DL.slate : DL.slateLight,
          textDecoration: ok ? 'none' : 'line-through',
          textDecorationColor: '#FCA5A5',
        }}
      >
        {text}
      </div>
    </div>
  );
}

import { Fragment, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { DL } from '../lib/dl';
import { Flame } from './Flame';
import { PushButton } from './PushButton';

type Props = {
  day: number;
  title: string;
  streak: number;
  daysCompleted: number;
  totalDays?: number;
  onClose: () => void;
};

// Lesson-complete celebration modal.
// Choreography: backdrop → card slam → trophy drop → shockwave → confetti
// burst → streak slot-roll → impact shake/flash → days slot-roll.
// Mirrors design package "03b · 完了モーダル".
export function CompleteModal({
  day,
  title,
  streak,
  daysCompleted,
  totalDays = 30,
  onClose,
}: Props) {
  const [streakDisplay, setStreakDisplay] = useState(streak);
  const [daysDisplay, setDaysDisplay] = useState(daysCompleted);
  const [stage, setStage] = useState(0);
  const [impact, setImpact] = useState(false);
  const [streakImpact, setStreakImpact] = useState(false);
  const [daysImpact, setDaysImpact] = useState(false);

  const buzz = (p: number | number[]) => {
    try {
      navigator.vibrate?.(p);
    } catch {
      /* ignore — desktop / unsupported */
    }
  };

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    // Slot-roll values around the targets — gives the slot-machine "tick" feel.
    const streakRoll = nearbyValues(streak, 6);
    const daysRoll = nearbyValues(daysCompleted, 4);

    // STAGE 1 — backdrop + card slam
    at(30, () => {
      setStage(1);
      buzz(8);
    });
    // STAGE 2 — trophy drop
    at(420, () => {
      setStage(2);
      buzz([0, 18]);
    });
    // STAGE 3 — shockwave + confetti
    at(700, () => {
      setStage(3);
      buzz([0, 12, 40, 12]);
    });

    // STAGE 4 — streak slot
    at(1100, () => setStage(4));
    streakRoll.forEach((v, i) => {
      at(1100 + i * 70, () => {
        setStreakDisplay(v);
        buzz(4);
      });
    });
    const streakLockAt = 1100 + streakRoll.length * 70 + 40;
    at(streakLockAt, () => {
      setStreakDisplay(streak);
      setStreakImpact(true);
      setImpact(true);
      buzz([0, 60, 30, 80]);
    });
    at(streakLockAt + 380, () => setImpact(false));
    at(streakLockAt + 880, () => setStreakImpact(false));

    // STAGE 5 — days slot
    const daysStart = streakLockAt + 380;
    daysRoll.forEach((v, i) => {
      at(daysStart + i * 80, () => {
        setDaysDisplay(v);
        buzz(3);
      });
    });
    const daysLockAt = daysStart + daysRoll.length * 80 + 40;
    at(daysLockAt, () => {
      setDaysDisplay(daysCompleted);
      setStage(5);
      setDaysImpact(true);
      setImpact(true);
      buzz([0, 50, 30, 60]);
    });
    at(daysLockAt + 200, () => setImpact(false));
    at(daysLockAt + 700, () => setDaysImpact(false));

    return () => timers.forEach(clearTimeout);
  }, [streak, daysCompleted]);

  // 48 confetti pieces — varied shapes, sizes, drift, rotation.
  const confetti = useMemo(
    () =>
      Array.from({ length: 48 }).map((_, i) => {
        const colors = [
          '#FF7A45',
          '#22C55E',
          '#FACC15',
          '#A855F7',
          '#0EA5E9',
          '#F97316',
          '#EC4899',
          '#FB7185',
        ];
        return {
          left: (i * 31 + 7) % 100,
          delay: 700 + (i % 12) * 40,
          dur: 1600 + (i % 7) * 260,
          rot: (i * 53) % 360,
          drift: ((i % 9) - 4) * 22,
          color: colors[i % colors.length],
          shape: i % 4,
          size: 7 + (i % 4) * 2,
        };
      }),
    [],
  );

  // Radial spark lines that fire on trophy impact.
  const sparks = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => ({
        angle: (i * 360) / 12,
        delay: i * 18,
      })),
    [],
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 100,
        background: stage >= 1 ? 'rgba(8,12,28,0.72)' : 'rgba(8,12,28,0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        transition: 'background 280ms ease',
        overflow: 'hidden',
      }}
    >
      <style>{KEYFRAMES}</style>

      {impact && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#fff',
            animation: 'dlFlash 380ms ease-out forwards',
            pointerEvents: 'none',
            zIndex: 200,
          }}
        />
      )}

      {/* Confetti layer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {confetti.map((c, i) => (
          <div
            key={i}
            style={
              {
                position: 'absolute',
                top: -30,
                left: `${c.left}%`,
                width: c.shape === 2 ? c.size : c.size + 2,
                height:
                  c.shape === 1 ? c.size + 8 : c.shape === 2 ? c.size : c.size + 2,
                background: c.color,
                borderRadius:
                  c.shape === 2 ? '50%' : c.shape === 3 ? '40% 60% 30% 70%' : 2,
                boxShadow: `0 0 6px ${c.color}80`,
                ['--dx']: `${c.drift}px`,
                ['--rot']: `${c.rot}deg`,
                animation: `dlConfettiFall ${c.dur}ms cubic-bezier(.3,.7,.5,1) ${c.delay}ms forwards`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* Card */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 320,
          background: '#fff',
          borderRadius: 28,
          padding: '24px 22px 20px',
          textAlign: 'center',
          boxShadow:
            '0 30px 80px rgba(15,23,42,0.45), 0 0 0 1px rgba(255,255,255,0.4), 0 0 80px rgba(250,204,21,0.25)',
          animation:
            stage >= 1
              ? `dlSlamIn 720ms cubic-bezier(.16,1.2,.3,1) both${
                  impact ? ', dlScreenShake 420ms cubic-bezier(.36,.07,.19,.97)' : ''
                }`
              : 'none',
          opacity: stage >= 1 ? 1 : 0,
          fontFamily: DL.fontJp,
          overflow: 'hidden',
        }}
      >
        {/* Trophy stage */}
        <div
          style={{
            position: 'relative',
            height: 130,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {stage >= 2 && (
            <svg
              width="260"
              height="260"
              viewBox="0 0 260 260"
              style={{
                position: 'absolute',
                animation: 'dlSpin 8s linear infinite',
                opacity: 0.55,
              }}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <polygon
                  key={i}
                  points="130,20 138,130 122,130"
                  fill="url(#dlRayGrad)"
                  transform={`rotate(${i * 30} 130 130)`}
                  opacity={i % 2 === 0 ? 1 : 0.5}
                />
              ))}
              <defs>
                <linearGradient id="dlRayGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#FACC15" stopOpacity="0.9" />
                  <stop offset="1" stopColor="#FACC15" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          )}

          {stage >= 2 &&
            [0, 220, 440].map((d, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  border: '3px solid rgba(250,204,21,0.7)',
                  animation: `dlShock 1100ms ease-out ${d}ms forwards`,
                }}
              />
            ))}

          {stage >= 2 && (
            <div style={{ position: 'absolute', width: 0, height: 0 }}>
              {sparks.map((s, i) => (
                <div
                  key={i}
                  style={
                    {
                      position: 'absolute',
                      width: 32,
                      height: 3,
                      borderRadius: 2,
                      background:
                        'linear-gradient(90deg, transparent, #FCD34D, #fff)',
                      transformOrigin: '0 50%',
                      ['--a']: `${s.angle}deg`,
                      animation: `dlSpark 700ms cubic-bezier(.2,.6,.3,1) ${
                        420 + s.delay
                      }ms forwards`,
                      opacity: 0,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}

          {stage >= 3 && (
            <Fragment>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 60,
                  fontSize: 22,
                  animation: 'dlSparkle 1600ms ease-in-out infinite',
                }}
              >
                ✨
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 50,
                  fontSize: 18,
                  animation: 'dlSparkle 1600ms ease-in-out 400ms infinite',
                }}
              >
                ✨
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: 20,
                  right: 40,
                  fontSize: 14,
                  animation: 'dlSparkle 1600ms ease-in-out 800ms infinite',
                }}
              >
                ⭐
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: 80,
                  left: 40,
                  fontSize: 14,
                  animation: 'dlSparkle 1600ms ease-in-out 1100ms infinite',
                }}
              >
                ✨
              </div>
            </Fragment>
          )}

          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background:
                'radial-gradient(circle at 30% 25%, #FDE68A, #FACC15 45%, #D97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 52,
              boxShadow:
                '0 10px 0 #92400E, 0 18px 32px rgba(245,158,11,0.55), inset 0 -8px 16px rgba(180,83,9,0.4), inset 0 6px 10px rgba(255,255,255,0.5)',
              position: 'relative',
              zIndex: 3,
              animation:
                stage >= 2
                  ? 'dlTrophyDrop 700ms cubic-bezier(.34,1.56,.64,1) both, dlTrophyBob 2.2s ease-in-out 700ms infinite'
                  : 'none',
              opacity: stage >= 2 ? 1 : 0,
            }}
          >
            🏆
          </div>
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 3,
            color: DL.fireDark,
            opacity: stage >= 3 ? 1 : 0,
            animation:
              stage >= 3
                ? 'dlTitleIn 420ms cubic-bezier(.2,.8,.3,1.2) both'
                : 'none',
          }}
        >
          LESSON COMPLETE
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 28,
            fontWeight: 900,
            color: DL.navy,
            lineHeight: 1.2,
            letterSpacing: -0.4,
            opacity: stage >= 3 ? 1 : 0,
            animation:
              stage >= 3
                ? 'dlTitleIn 520ms cubic-bezier(.2,.8,.3,1.2) 80ms both'
                : 'none',
          }}
        >
          おめでとう! 🎉
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            fontWeight: 700,
            color: DL.slate,
            lineHeight: 1.6,
            opacity: stage >= 3 ? 1 : 0,
            animation:
              stage >= 3
                ? 'dlTitleIn 480ms cubic-bezier(.2,.8,.3,1.2) 200ms both'
                : 'none',
          }}
        >
          DAY {day} 「{title}」を
          <br />
          読み終えました
        </div>

        {/* Streak row */}
        <div
          style={{
            position: 'relative',
            marginTop: 16,
            background: streakImpact
              ? 'linear-gradient(135deg, #FFEDD5 0%, #FFD7B5 50%, #FED7AA 100%)'
              : 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
            border: streakImpact ? '2px solid #FB923C' : '1.5px solid #FED7AA',
            borderRadius: 18,
            padding: '14px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            opacity: stage >= 4 ? 1 : 0,
            transition: 'opacity 240ms, background 220ms, border 220ms',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 50,
              height: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              animation: streakImpact
                ? 'dlFlameImpact 700ms cubic-bezier(.36,.07,.19,.97)'
                : stage >= 4
                  ? 'dlTrophyBob 1.6s ease-in-out infinite'
                  : 'none',
              zIndex: 2,
            }}
          >
            <Flame size={46} />
          </div>
          <div
            style={{
              flex: 1,
              textAlign: 'left',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 900,
                color: DL.fireDark,
                letterSpacing: 1.5,
              }}
            >
              連続記録
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 4,
                marginTop: 2,
                minHeight: 36,
              }}
            >
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {streakImpact && (
                  <span
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: 8,
                      height: 8,
                      marginLeft: -4,
                      marginTop: -4,
                      borderRadius: '50%',
                      animation: 'dlGlowPulse 900ms ease-out forwards',
                      pointerEvents: 'none',
                      zIndex: 0,
                    }}
                  />
                )}
                <div
                  key={`s-${streakDisplay}`}
                  style={
                    {
                      fontSize: 32,
                      fontWeight: 900,
                      color: DL.fire,
                      ['--final']: DL.fire,
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1,
                      position: 'relative',
                      animation: streakImpact
                        ? 'dlJumbo 720ms cubic-bezier(.2,.8,.3,1.2) both'
                        : 'dlSlotTick 110ms ease-out both',
                    } as CSSProperties
                  }
                >
                  {streakDisplay}
                </div>
              </div>
              <div
                style={{ fontSize: 13, fontWeight: 800, color: DL.slate }}
              >
                日連続
              </div>
              {streakImpact && (
                <div
                  style={{
                    marginLeft: 'auto',
                    fontSize: 12,
                    fontWeight: 900,
                    color: '#fff',
                    background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                    padding: '4px 10px',
                    borderRadius: 999,
                    boxShadow:
                      '0 3px 0 #0F7A38, 0 0 16px rgba(34,197,94,0.6)',
                    animation:
                      'dlBadgeSlam 520ms cubic-bezier(.2,.8,.3,1.2) both',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  +1 <Flame size={14} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress chip */}
        <div
          style={{
            position: 'relative',
            marginTop: 12,
            background: daysImpact
              ? 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 50%, #93C5FD 100%)'
              : '#DBEAFE',
            border: daysImpact ? '2px solid #3B82F6' : '2px solid transparent',
            borderRadius: 14,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            opacity: stage >= 4 ? 1 : 0,
            transition:
              'opacity 240ms 200ms, background 220ms, border 220ms',
            animation: daysImpact
              ? 'dlScreenShake 480ms cubic-bezier(.36,.07,.19,.97)'
              : 'none',
            overflow: 'hidden',
          }}
        >
          <div style={{ fontSize: 22 }}>📚</div>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 900,
                color: '#1D4ED8',
                letterSpacing: 0.6,
              }}
            >
              進捗
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 900,
                color: DL.navy,
                fontVariantNumeric: 'tabular-nums',
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 2,
              }}
            >
              <span style={{ position: 'relative', display: 'inline-block' }}>
                {daysImpact && (
                  <span
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: 8,
                      height: 8,
                      marginLeft: -4,
                      marginTop: -4,
                      borderRadius: '50%',
                      animation: 'dlGlowPulseBlue 900ms ease-out forwards',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                <span
                  key={`d-${daysDisplay}`}
                  style={
                    {
                      display: 'inline-block',
                      animation:
                        stage >= 5
                          ? 'dlJumbo 600ms cubic-bezier(.2,.8,.3,1.2) both'
                          : 'dlSlotTick 110ms ease-out both',
                      ['--final']: DL.navy,
                    } as CSSProperties
                  }
                >
                  {daysDisplay}
                </span>
              </span>
              <span> / {totalDays}日</span>
            </div>
          </div>
          <div
            style={{
              width: 80,
              height: 8,
              borderRadius: 999,
              background: '#fff',
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.1)',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, (daysDisplay / totalDays) * 100)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #3B82F6, #1D4ED8)',
                borderRadius: 999,
                transition: 'width 700ms cubic-bezier(.34,1.56,.64,1)',
                animation:
                  stage >= 5 ? 'dlBarPulse 1.4s ease-in-out 1' : 'none',
              }}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            opacity: stage >= 5 ? 1 : 0,
            transition: 'opacity 280ms ease 120ms',
            pointerEvents: stage >= 5 ? 'auto' : 'none',
          }}
        >
          <PushButton
            color={DL.mint}
            shadow={DL.mintShadow}
            fontSize={15}
            height={52}
            onClick={onClose}
          >
            ホームに戻る
          </PushButton>
        </div>
      </div>
    </div>
  );
}

// Generates a slot-machine roll: nearby values that approach the target.
// Falls back to a single tick when the target is too small for variance.
function nearbyValues(target: number, count: number): number[] {
  const out: number[] = [];
  // Pseudo-random but deterministic: drift between -3 and +3 around target,
  // never below 1, and avoid landing on the target before the lock.
  const drifts = [-3, 2, -2, 3, -1, 1, -2, 2];
  for (let i = 0; i < count; i++) {
    const d = drifts[i % drifts.length];
    let v = target + d;
    if (v < 1) v = 1;
    if (v === target) v = Math.max(1, target - 1);
    out.push(v);
  }
  return out;
}

const KEYFRAMES = `
  @keyframes dlSlamIn {
    0%   { transform: scale(0.4) translateY(60px) rotate(-3deg); opacity: 0; filter: blur(6px); }
    55%  { transform: scale(1.06) translateY(-6px) rotate(0.6deg); opacity: 1; filter: blur(0); }
    75%  { transform: scale(0.98) translateY(2px) rotate(-0.3deg); }
    100% { transform: scale(1) translateY(0) rotate(0); opacity: 1; }
  }
  @keyframes dlScreenShake {
    0%, 100% { transform: translate(0, 0) rotate(0); }
    10% { transform: translate(-4px, 3px) rotate(-0.4deg); }
    20% { transform: translate(5px, -2px) rotate(0.5deg); }
    30% { transform: translate(-3px, -3px) rotate(-0.3deg); }
    40% { transform: translate(4px, 2px) rotate(0.4deg); }
    50% { transform: translate(-2px, -4px); }
    60% { transform: translate(3px, 1px); }
    70% { transform: translate(-2px, 2px); }
    80% { transform: translate(1px, -1px); }
  }
  @keyframes dlFlash {
    0% { opacity: 0; }
    15% { opacity: 0.7; }
    100% { opacity: 0; }
  }
  @keyframes dlTrophyDrop {
    0%   { transform: translateY(-280px) scale(0.7) rotate(-15deg); opacity: 0; }
    50%  { transform: translateY(0) scale(1.08, 0.92) rotate(0); opacity: 1; }
    65%  { transform: translateY(-14px) scale(0.96, 1.06); }
    80%  { transform: translateY(0) scale(1.04, 0.98); }
    100% { transform: translateY(0) scale(1) rotate(0); opacity: 1; }
  }
  @keyframes dlTrophyBob {
    0%, 100% { transform: translateY(0) scale(1); }
    50%      { transform: translateY(-4px) scale(1.02); }
  }
  @keyframes dlSpin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes dlShock {
    0%   { transform: scale(0.2); opacity: 0; }
    20%  { opacity: 1; }
    100% { transform: scale(3.2); opacity: 0; }
  }
  @keyframes dlSpark {
    0%   { transform: rotate(var(--a)) translateX(20px) scaleX(0); opacity: 0; }
    30%  { transform: rotate(var(--a)) translateX(20px) scaleX(1); opacity: 1; }
    100% { transform: rotate(var(--a)) translateX(110px) scaleX(0.2); opacity: 0; }
  }
  @keyframes dlConfettiFall {
    0%   { transform: translate3d(0, -40px, 0) rotate(0deg) scale(0.5); opacity: 0; }
    8%   { opacity: 1; transform: translate3d(0, 0, 0) rotate(40deg) scale(1.2); }
    100% { transform: translate3d(var(--dx), 700px, 0) rotate(var(--rot)) scale(0.9); opacity: 0; }
  }
  @keyframes dlSparkle {
    0%, 100% { transform: scale(0.6) rotate(0); opacity: 0.4; }
    50%      { transform: scale(1.4) rotate(180deg); opacity: 1; }
  }
  @keyframes dlSlotTick {
    0%   { transform: translateY(-14px) scale(0.85); opacity: 0; filter: blur(2px); }
    40%  { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }
  @keyframes dlJumbo {
    0%   { transform: scale(0.5); opacity: 0; filter: blur(4px); }
    40%  { transform: scale(1.6); opacity: 1; filter: blur(0); color: #FACC15; text-shadow: 0 0 24px rgba(250,204,21,0.9), 0 0 8px #fff; }
    70%  { transform: scale(0.94); }
    100% { transform: scale(1); color: var(--final); text-shadow: none; }
  }
  @keyframes dlFlameImpact {
    0%   { transform: scale(1) rotate(0); }
    15%  { transform: scale(1.45) rotate(-14deg); }
    30%  { transform: scale(1.55) rotate(12deg); }
    45%  { transform: scale(1.4) rotate(-9deg); }
    60%  { transform: scale(1.5) rotate(7deg); }
    75%  { transform: scale(1.3) rotate(-4deg); }
    100% { transform: scale(1) rotate(0); }
  }
  @keyframes dlGlowPulseBlue {
    0%   { box-shadow: 0 0 0 0 rgba(59,130,246, 0.7); }
    50%  { box-shadow: 0 0 0 24px rgba(59,130,246, 0), 0 0 60px 16px rgba(59,130,246, 0.7); }
    100% { box-shadow: 0 0 0 0 rgba(59,130,246, 0); }
  }
  @keyframes dlGlowPulse {
    0%   { box-shadow: 0 0 0 0 rgba(249,115,22, 0.7), inset 0 0 0 0 rgba(255,255,255,0); }
    50%  { box-shadow: 0 0 0 24px rgba(249,115,22, 0), 0 0 60px 16px rgba(249,115,22, 0.8); }
    100% { box-shadow: 0 0 0 30px rgba(249,115,22, 0); }
  }
  @keyframes dlBadgeSlam {
    0%   { transform: scale(2.4) rotate(-25deg); opacity: 0; }
    40%  { transform: scale(0.9) rotate(8deg); opacity: 1; }
    70%  { transform: scale(1.08) rotate(-3deg); }
    100% { transform: scale(1) rotate(0); opacity: 1; }
  }
  @keyframes dlTitleIn {
    0%   { transform: translateY(20px) scale(0.7); opacity: 0; }
    60%  { transform: translateY(-3px) scale(1.05); opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }
  @keyframes dlBarPulse {
    0%, 100% { box-shadow: inset 0 0 0 0 rgba(255,255,255,0); }
    50%      { box-shadow: 0 0 12px 2px rgba(59,130,246,0.7); }
  }
`;

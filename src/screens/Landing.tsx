import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../lib/auth';
import './Landing.css';

const FLAME_SRC = '/flame.png';

const FAQS: { q: string; a: string }[] = [
  {
    q: '本当に1日10分で続きますか?',
    a: '1日のレッスンは「読む+小さなActionタスク」で約10分に収まる粒度で生成されます。忙しい日は読むだけでも進捗扱い。AIが進捗を見ながら後半の量を自動調整するので、無理なく30日コースを完走できます。',
  },
  {
    q: 'どんなテーマでもコースを作れますか?',
    a: '副業・投資・プログラミング・英会話・資格学習など、幅広い学習テーマに対応しています。「30日後にこうなりたい」というゴールが具体的であるほど、AIの設計精度は上がります。',
  },
  {
    q: '途中でテーマを変えたくなったらどうなりますか?',
    a: 'いつでも新しいコースに切り替えられます。無料プランでは同時に1コースまでですが、過去のコースの履歴と進捗は保存されるので後から再開も可能です。',
  },
  {
    q: 'AIアシスタントはどんな質問に答えてくれますか?',
    a: 'レッスン内容に関する質問はもちろん、「もう少し噛み砕いて」「具体例を」「自分のケースに当てはめると?」といった追加の依頼にも対応します。今日のレッスンとコース全体を理解した上で回答します。',
  },
  {
    q: 'スマホ以外でも使えますか?',
    a: '現在はiOS / Android のスマホアプリに最適化しています。タブレットでも動作しますが、レッスン体験はスマホ縦持ちでの10分利用を前提に設計されています。',
  },
  {
    q: '有料プランはいつ公開されますか?',
    a: '順次公開予定です。アプリ内通知またはメールで先行のご案内をお送りします。今は無料プランで30日コースをまるごとお試しください。',
  },
];

export function LandingScreen() {
  const session = useSession();
  const isSignedIn = session.status === 'signed-in';
  const startHref = isSignedIn ? '/home' : '/login';

  const rootRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const streakRef = useRef<HTMLDivElement | null>(null);
  const [openFaq, setOpenFaq] = useState<number>(0);
  const [streakValue, setStreakValue] = useState(0);

  // Scroll reveal + sticky header shadow
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reveals = root.querySelectorAll<HTMLElement>('[data-reveal]');
    const features = root.querySelectorAll<HTMLElement>('.feature');
    const roadmaps = root.querySelectorAll<HTMLElement>('.roadmap-30');
    const chats = root.querySelectorAll<HTMLElement>('.full-chat');

    reveals.forEach((el) => {
      if (!el.classList.contains('stagger') && !el.classList.contains('reveal-pop')) {
        el.classList.add('reveal');
      }
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('in');
          if (e.target.classList.contains('feature')) {
            const copy = (e.target as HTMLElement).querySelector('.copy');
            if (copy) copy.classList.add('in');
          }
          if ((e.target as HTMLElement).matches('.roadmap-30')) {
            e.target.classList.add('animated');
          }
          if ((e.target as HTMLElement).matches('.full-chat')) {
            e.target.classList.add('animated');
          }
          io.unobserve(e.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' },
    );

    [...reveals, ...features, ...roadmaps, ...chats].forEach((el) => {
      const r = el.getBoundingClientRect();
      const inView = r.top < window.innerHeight && r.bottom > 0;
      if (inView) {
        requestAnimationFrame(() => {
          el.classList.add('in');
          if (el.classList.contains('feature')) {
            const copy = el.querySelector('.copy');
            if (copy) copy.classList.add('in');
          }
          if (el.matches('.roadmap-30')) el.classList.add('animated');
          if (el.matches('.full-chat')) el.classList.add('animated');
        });
      } else {
        io.observe(el);
      }
    });

    const onScroll = () => {
      const hdr = headerRef.current;
      if (!hdr) return;
      if (window.scrollY > 8) hdr.classList.add('scrolled');
      else hdr.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Streak count-up when in view
  useEffect(() => {
    const el = streakRef.current;
    if (!el) return;
    const target = 12;
    let done = false;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting || done) return;
          done = true;
          const dur = 900;
          const t0 = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - t0) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            setStreakValue(Math.round(target * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Magnetic phone tilt on hover (desktop only)
  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return;
    const root = rootRef.current;
    if (!root) return;
    const wraps = Array.from(root.querySelectorAll<HTMLElement>('.phone-wrap'));
    const cleaners: Array<() => void> = [];
    wraps.forEach((wrap) => {
      const phone = wrap.querySelector<HTMLElement>('.phone');
      if (!phone) return;
      const baseR = phone.classList.contains('phone-tilt-l') ? -3 : 4;
      const onMove = (e: MouseEvent) => {
        const r = wrap.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        phone.style.animation = 'none';
        phone.style.transform = `rotate(${baseR + x * 4}deg) translate(${x * 6}px, ${y * 6}px)`;
      };
      const onLeave = () => {
        phone.style.animation = '';
        phone.style.transform = '';
      };
      wrap.addEventListener('mousemove', onMove);
      wrap.addEventListener('mouseleave', onLeave);
      cleaners.push(() => {
        wrap.removeEventListener('mousemove', onMove);
        wrap.removeEventListener('mouseleave', onLeave);
      });
    });
    return () => cleaners.forEach((fn) => fn());
  }, []);

  return (
    <div ref={rootRef} className="dl-lp">
      <Header refEl={headerRef} startHref={startHref} isSignedIn={isSignedIn} />
      <Hero startHref={startHref} isSignedIn={isSignedIn} />
      <Problem />
      <HowItWorks />
      <FeatureA />
      <FeatureB />
      <FeatureC />
      <FeatureD streakValue={streakValue} streakRef={streakRef} />
      <Tags />
      <Pricing startHref={startHref} />
      <Faq openFaq={openFaq} setOpenFaq={setOpenFaq} />
      <FinalCta startHref={startHref} />
      <Footer />
    </div>
  );
}

// ----------------------------------------------------------------
// Header
// ----------------------------------------------------------------
function Header({
  refEl,
  startHref,
  isSignedIn,
}: {
  refEl: React.MutableRefObject<HTMLElement | null>;
  startHref: string;
  isSignedIn: boolean;
}) {
  return (
    <header ref={refEl} className="site-header">
      <div className="container inner">
        <a href="#" className="logo" onClick={(e) => e.preventDefault()}>
          <span className="flame">
            <img src={FLAME_SRC} alt="" />
          </span>
          <span>
            Daily<span className="dot">Learn</span>
          </span>
        </a>
        <nav className="header-nav">
          <a className="text-link" href="#features">機能</a>
          <a className="text-link" href="#pricing">料金</a>
          <a className="text-link" href="#faq">FAQ</a>
          {!isSignedIn && (
            <Link className="text-link" to="/login">ログイン</Link>
          )}
          <Link className="btn btn-primary btn-sm" to={startHref}>
            <span className="jp">{isSignedIn ? 'アプリを開く' : '無料で始める'}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ----------------------------------------------------------------
// Hero
// ----------------------------------------------------------------
function Hero({ startHref, isSignedIn }: { startHref: string; isSignedIn: boolean }) {
  return (
    <section className="hero">
      <div className="bg-blobs">
        <span className="blob blob-orange blob-1" />
        <span className="blob blob-mint blob-2" />
      </div>

      <div className="container">
        <div className="grid">
          <div className="hero-copy">
            <h1>
              <span className="row">
                <span className="num">30</span>日後の自分は、
              </span>
              <span className="row">毎日の10分で決まる。</span>
            </h1>

            <p className="sub">
              学びたいテーマとゴールを入れるだけ。
              <br />
              AIがあなた専用の<strong>30日コース</strong>を設計します。
              <br />
              毎日10分、続けるだけで知識が積み上がる。
            </p>

            <div className="cta-row">
              <Link className="btn btn-primary btn-lg" to={startHref}>
                <span className="jp">{isSignedIn ? 'アプリを開く' : '学習を始める'}</span>
                <span aria-hidden="true">→</span>
              </Link>
              <a className="btn btn-outline btn-lg" href="#features">
                <span className="jp">アプリの中を見る</span>
              </a>
            </div>

            <div className="badges">
              <span className="b">✅ <span>1日10分で完走設計</span></span>
              <span className="b">🤖 <span>AIが個別最適化</span></span>
              <span className="b">💬 <span>つまずいたら質問できる</span></span>
            </div>
          </div>

          <div className="phone-wrap">
            <Doodle style={{ top: '6%', left: '-8%', width: 56 }} viewBox="0 0 56 56">
              <path
                d="M28 6 L32 22 L48 24 L36 34 L40 50 L28 42 L16 50 L20 34 L8 24 L24 22 Z"
                fill="#FACC15"
                stroke="#854D0E"
                strokeWidth={2.5}
                transform="rotate(-8 28 28)"
              />
            </Doodle>
            <Doodle
              className="doodle-mint"
              style={{ top: '2%', right: '2%', width: 80, transform: 'rotate(14deg)' }}
              viewBox="0 0 80 36"
              fill="none"
              strokeStyle
            >
              <path d="M4 18 Q16 4 28 18 T52 18 T76 18" />
            </Doodle>
            <Doodle
              style={{ bottom: '8%', right: '-6%', width: 90, transform: 'rotate(-12deg)', color: 'var(--ink)' }}
              viewBox="0 0 90 60"
              fill="none"
              strokeStyle
            >
              <path d="M6 50 Q30 10 64 30" />
              <path d="M54 22 L64 30 L56 40" />
            </Doodle>
            <Doodle
              style={{ bottom: '14%', left: '-2%', width: 36, transform: 'rotate(-22deg)', color: 'var(--primary)' }}
              viewBox="0 0 36 36"
            >
              <path d="M18 2 L22 14 L34 14 L24 22 L28 34 L18 26 L8 34 L12 22 L2 14 L14 14 Z" />
            </Doodle>

            <div className="phone phone-tilt">
              <div className="phone-screen">
                <PhoneStatus />
                <div className="phone-home">
                  <div className="phone-top">
                    <div className="date">
                      <strong>5月9日(土)</strong>
                      <br />
                      おはよう、Akiさん
                    </div>
                    <span className="streak-pill">
                      <img className="flame-icon" src={FLAME_SRC} alt="" /> 12日連続
                    </span>
                  </div>

                  <div className="course-card">
                    <div className="row-top">
                      <span className="day-pill">DAY 7 / 30</span>
                      <span className="min-pill">⏱ 約10分</span>
                    </div>
                    <div className="course-name">副業で月3万円コース</div>
                    <div className="lesson-title">
                      価格はコストではなく、
                      <br />
                      価値で決める。
                    </div>
                    <div className="summary">
                      「いくらかかったか」より「相手にどう価値があるか」。今日は値付けの基本を10分で。
                    </div>
                    <div className="mini-btn">
                      今日の学びを始める <span aria-hidden="true">→</span>
                    </div>
                  </div>

                  <div className="week-tracker">
                    <div className="label">
                      <span>今週のレッスン</span>
                      <span>5 / 7</span>
                    </div>
                    <div className="days">
                      <span className="day-circle done">月</span>
                      <span className="day-circle done">火</span>
                      <span className="day-circle done">水</span>
                      <span className="day-circle today">木</span>
                      <span className="day-circle">金</span>
                      <span className="day-circle">土</span>
                      <span className="day-circle">日</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// Problem
// ----------------------------------------------------------------
function Problem() {
  return (
    <section className="section problem">
      <div className="container">
        <div className="section-h reveal" data-reveal>
          <span className="eyebrow">Problem</span>
          <h2>
            学びが続かないのは、
            <br />
            <span className="marker-o">あなたのせいじゃない。</span>
          </h2>
          <p className="lede">
            原因は「教材を探す」「今日何をやるか決める」「詰まったら止まる」の3点。
            <br />
            DailyLearnはここを、まるごと肩代わりします。
          </p>
        </div>

        <div className="problem-grid stagger" data-reveal>
          <div className="problem-card">
            <div className="illus" aria-hidden="true">
              <svg viewBox="0 0 132 132" fill="none">
                <circle cx="66" cy="68" r="54" fill="#FFE8DC" />
                <g transform="translate(20 56) rotate(-10 40 22)">
                  <rect x="0" y="0" width="80" height="18" rx="4" fill="#A78BFA" stroke="#0F172A" strokeWidth="2.5" />
                  <rect x="6" y="5" width="24" height="3" rx="1.5" fill="#fff" opacity=".6" />
                </g>
                <g transform="translate(28 64) rotate(6 38 12)">
                  <rect x="0" y="0" width="76" height="18" rx="4" fill="#FACC15" stroke="#0F172A" strokeWidth="2.5" />
                  <rect x="6" y="5" width="30" height="3" rx="1.5" fill="#fff" opacity=".55" />
                </g>
                <g transform="translate(22 80) rotate(-3 42 10)">
                  <rect x="0" y="0" width="84" height="18" rx="4" fill="#22C55E" stroke="#0F172A" strokeWidth="2.5" />
                  <rect x="6" y="5" width="22" height="3" rx="1.5" fill="#fff" opacity=".6" />
                </g>
                <g transform="translate(60 18) rotate(18 30 30)">
                  <circle cx="24" cy="24" r="22" fill="#fff" stroke="#0F172A" strokeWidth="3" />
                  <circle cx="24" cy="24" r="15" fill="#FFE8DC" stroke="#FF7A45" strokeWidth="2" />
                  <path d="M16 24 q4 -8 16 0" stroke="#FF7A45" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <circle cx="19" cy="22" r="1.6" fill="#0F172A" />
                  <circle cx="29" cy="22" r="1.6" fill="#0F172A" />
                  <rect x="40" y="40" width="8" height="22" rx="4" fill="#0F172A" transform="rotate(45 44 51)" />
                </g>
                <path d="M108 38 q3 4 0 8 q-3 -4 0 -8 z" fill="#0EA5E9" />
                <path d="M114 50 q2.5 3 0 6 q-2.5 -3 0 -6 z" fill="#0EA5E9" />
                <path d="M22 32 l4 0 M24 30 l0 4" stroke="#FF7A45" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M14 70 l3 0 M15.5 68.5 l0 3" stroke="#FF7A45" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h3>教材を探すだけで疲れる</h3>
            <p className="body">
              本、記事、動画……。「何から始める?」を調べているうちに30分。気づけば学ぶ前に消耗。
            </p>
            <span className="resolve">✓ DailyLearnならここが消える</span>
          </div>

          <div className="problem-card">
            <div className="illus" aria-hidden="true">
              <svg viewBox="0 0 132 132" fill="none">
                <circle cx="66" cy="68" r="54" fill="#DCFCE7" />
                <path d="M14 100 h104" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M30 100 L70 50 L106 100 Z" fill="#A78BFA" stroke="#0F172A" strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M58 65 L70 50 L82 65 L74 70 L70 64 L66 70 Z" fill="#fff" stroke="#0F172A" strokeWidth="2" />
                <path
                  d="M28 100 Q40 88 52 92 T76 78 T96 60"
                  stroke="#FF7A45"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="4 5"
                  fill="none"
                />
                <g transform="translate(96 36)">
                  <rect x="0" y="0" width="2.5" height="26" fill="#0F172A" />
                  <path d="M2.5 0 L18 4 L2.5 10 Z" fill="#FF7A45" stroke="#0F172A" strokeWidth="2" strokeLinejoin="round" />
                </g>
                <g transform="translate(72 14)">
                  <circle cx="14" cy="14" r="14" fill="#FACC15" stroke="#0F172A" strokeWidth="2.5" />
                  <text x="14" y="20" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="20" textAnchor="middle" fill="#0F172A">
                    ?
                  </text>
                </g>
                <g transform="translate(36 86)">
                  <circle cx="6" cy="4" r="4" fill="#fff" stroke="#0F172A" strokeWidth="2" />
                  <path d="M6 8 L6 16 L2 22 M6 16 L10 22 M2 12 L10 12" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" fill="none" />
                </g>
                <text x="20" y="34" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="20" fill="#22C55E" transform="rotate(-12 20 34)">?</text>
                <text x="112" y="80" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="16" fill="#FF7A45" transform="rotate(14 112 80)">?</text>
                <path d="M14 70 l3 0 M15.5 68.5 l0 3" stroke="#FF7A45" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h3>「どこまで勉強する?」で止まる</h3>
            <p className="body">
              ゴールも、その先の道のりも、自分で線を引かないといけない。「これで十分?」と迷ううち、進む足が止まる。
            </p>
            <span className="resolve">✓ DailyLearnならここが消える</span>
          </div>

          <div className="problem-card">
            <div className="illus" aria-hidden="true">
              <svg viewBox="0 0 132 132" fill="none">
                <circle cx="66" cy="68" r="54" fill="#EDE9FE" />
                <path
                  d="M22 38 q0 -10 10 -10 h68 q10 0 10 10 v32 q0 10 -10 10 h-32 l-12 12 l2 -12 h-26 q-10 0 -10 -10 z"
                  fill="#fff"
                  stroke="#0F172A"
                  strokeWidth="3"
                />
                <path
                  d="M34 50 q8 -8 16 0 t16 0 q-12 8 -22 0 q12 6 22 -2 q-8 12 -22 4 q14 6 22 -4 q-8 14 -22 6"
                  stroke="#FF7A45"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <path d="M76 56 q6 -4 12 0 q-8 6 -12 0 z" fill="#FACC15" stroke="#0F172A" strokeWidth="2" />
                <g transform="translate(86 78)">
                  <circle cx="18" cy="18" r="18" fill="#FF7A45" stroke="#0F172A" strokeWidth="2.5" />
                  <rect x="6" y="15" width="24" height="6" rx="2" fill="#fff" />
                </g>
                <g transform="translate(20 84)">
                  <circle cx="10" cy="10" r="10" fill="#FACC15" stroke="#0F172A" strokeWidth="2.5" />
                  <rect x="8.5" y="5" width="3" height="7" rx="1.5" fill="#0F172A" />
                  <circle cx="10" cy="15" r="1.6" fill="#0F172A" />
                </g>
                <path d="M114 30 l4 0 M116 28 l0 4" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M14 30 l3 0 M15.5 28.5 l0 3" stroke="#FF7A45" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h3>詰まったら自己解決するしかない</h3>
            <p className="body">
              分からない単語を検索しても答えが見つからない。質問する相手もおらず、そのまま放置。
            </p>
            <span className="resolve">✓ DailyLearnならここが消える</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// How It Works
// ----------------------------------------------------------------
function HowItWorks() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-h reveal" data-reveal>
          <span className="eyebrow">How it works</span>
          <h2>
            <span className="marker-y">3ステップ</span>で、
            <br />
            明日から学習が始まる。
          </h2>
        </div>

        <div className="steps-grid stagger" data-reveal>
          <div className="step-card">
            <span className="badge-num">1</span>
            <h3>テーマとゴールを入力</h3>
            <p className="desc">
              「何を」「いつまでに」「どこから始めるか」の3つを入れるだけ。30秒で完了。
            </p>
            <div className="mini-ui">
              <div className="mini-form">
                <div className="field">
                  <span className="lbl">分野</span>
                  <span className="val">副業 / 価格設計</span>
                </div>
                <div className="field">
                  <span className="lbl">前提</span>
                  <span className="val">初心者</span>
                </div>
                <div className="field active">
                  <span className="lbl">ゴール</span>
                  <span className="val">月3万円稼ぐ</span>
                </div>
                <div className="submit">AIに設計を依頼 →</div>
              </div>
            </div>
          </div>

          <div className="step-card">
            <span
              className="badge-num"
              style={{ background: 'var(--accent)', boxShadow: '0 3px 0 var(--accent-shadow)' }}
            >
              2
            </span>
            <h3>AIが30日コースを設計</h3>
            <p className="desc">
              あなた専用の30日分のロードマップを、AIが30秒で組み立てます。順番も難易度もぴったり。
            </p>
            <div className="mini-ui">
              <div className="mini-roadmap">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={`d${i}`} className="cell done">✓</span>
                ))}
                <span className="cell today">7</span>
                {Array.from({ length: 11 }).map((_, i) => (
                  <span key={`u${i}`} className="cell">{8 + i}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="step-card">
            <span
              className="badge-num"
              style={{ background: 'var(--purple)', boxShadow: '0 3px 0 var(--purple-shadow)' }}
            >
              3
            </span>
            <h3>毎日10分のレッスン</h3>
            <p className="desc">
              届いた今日のレッスンをスキマ時間に。詰まったらそのままAIアシスタントに質問できます。
            </p>
            <div className="mini-ui">
              <div className="mini-article">
                <h4>
                  価格はコストではなく、
                  <br />
                  価値で決める。
                </h4>
                <p className="p">
                  商品の値段は、<em>かかった原価</em>で決めるものではありません。お客さんが受け取る<em>価値</em>から逆算します。
                </p>
                <div className="tip">💡 Tip: 同じものでも「誰が買うか」で値段は変わります。</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// Feature A — AI 30-day roadmap
// ----------------------------------------------------------------
function FeatureA() {
  return (
    <section className="feature" id="features">
      <div className="container">
        <div className="grid">
          <div className="phone-wrap">
            <Doodle
              className="doodle-mint"
              style={{ top: 0, left: '4%', width: 46, transform: 'rotate(-12deg)' }}
              viewBox="0 0 46 46"
            >
              <path d="M23 4 L27 18 L41 18 L29 26 L33 40 L23 32 L13 40 L17 26 L5 18 L19 18 Z" />
            </Doodle>
            <div className="phone phone-tilt-l">
              <div className="phone-screen">
                <PhoneStatus minimal />
                <div className="full-roadmap">
                  <h5>
                    副業で月3万円コース <span className="small">7 / 30</span>
                  </h5>
                  <div className="roadmap-30 roadmap-wave">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <span key={`d${i}`} className="cell done">✓</span>
                    ))}
                    <span className="cell today">7</span>
                    {Array.from({ length: 22 }).map((_, i) => (
                      <span key={`n${i}`} className="cell">{8 + i}</span>
                    ))}
                    <span
                      className="cell"
                      style={{ background: '#FFEDD5', color: 'var(--primary-shadow)', borderColor: '#FED7AA' }}
                    >
                      🏁
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="copy">
            <span className="eyebrow">Feature 01</span>
            <h2>
              AIが、30日分の
              <br />
              コースを自動設計。
            </h2>
            <p>
              テーマとゴールを伝えるだけで、AIがあなたの前提に合わせた30日分のロードマップを生成。1日目から30日目まで、迷わず進めます。
            </p>
            <ul>
              <li>
                <span className="check orange">✓</span>
                <span>あなたの<strong>前提と目的</strong>から逆算した順序</span>
              </li>
              <li>
                <span className="check orange">✓</span>
                <span>1日のレッスンは必ず<strong>10分前後</strong>に収まる粒度</span>
              </li>
              <li>
                <span className="check orange">✓</span>
                <span>進捗に合わせて<strong>後半の難易度を自動調整</strong></span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// Feature B — 10 min lesson
// ----------------------------------------------------------------
function FeatureB() {
  return (
    <section className="feature reverse bg-mint">
      <div className="container">
        <div className="grid">
          <div className="phone-wrap">
            <Doodle
              className="doodle-yellow"
              style={{ top: '4%', right: 0, width: 52, transform: 'rotate(14deg)' }}
              viewBox="0 0 52 52"
            >
              <path d="M26 4 L30 18 L44 18 L32 26 L36 40 L26 32 L16 40 L20 26 L8 18 L22 18 Z" />
            </Doodle>
            <div className="phone phone-tilt">
              <div className="phone-screen">
                <PhoneStatus minimal />
                <div className="full-article">
                  <div className="meta">
                    <span
                      style={{
                        background: 'var(--primary)',
                        color: '#fff',
                        padding: '4px 9px',
                        borderRadius: 999,
                        fontFamily: 'var(--font-en)',
                        fontWeight: 900,
                        fontSize: 10,
                        letterSpacing: '0.3px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      DAY 7
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--slate)',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ⏱ 約10分
                    </span>
                  </div>
                  <h5>
                    価格はコストではなく、
                    <br />
                    価値で決める。
                  </h5>
                  <p className="body">
                    商品の値段は、<em>かかった原価</em>で決めるものではありません。
                    <br />
                    本当に大切なのは、お客さんが受け取る<em>価値</em>から逆算すること。
                  </p>
                  <p className="body">
                    同じ商品でも、誰がどんな場面で買うかで「払ってもいい金額」は大きく変わります。
                  </p>
                  <div className="tip-box">
                    <span className="ico">💡</span>
                    <span>
                      <strong>Tip:</strong> 「いくらかかったか」ではなく「相手にどんな良いことが起きるか」で値段を考えよう。
                    </span>
                  </div>
                  <div className="tip-box action">
                    <span className="ico">✅</span>
                    <span>
                      <strong>Action:</strong> 自分のサービスを「価値」の言葉で1行書いてみる。
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="copy">
            <span className="eyebrow mint">Feature 02</span>
            <h2>
              1日10分の
              <br />
              レッスンに集約。
            </h2>
            <p>
              1日分のレッスンは、要点・例・図解・実践Tipまでが10分で読み切れる粒度。
              <br />
              スキマ時間に「今日のぶん」だけをこなせば、30日後にゴールへ届きます。
            </p>
            <ul>
              <li>
                <span className="check">✓</span>
                <span>本文は<strong>2〜3スクロール</strong>で読み切れる</span>
              </li>
              <li>
                <span className="check">✓</span>
                <span>重要な箇所は<strong>マーカー&Tip</strong>でひと目で分かる</span>
              </li>
              <li>
                <span className="check">✓</span>
                <span>最後に必ず<strong>5分のActionタスク</strong></span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// Feature C — AI assistant chat
// ----------------------------------------------------------------
function FeatureC() {
  return (
    <section className="feature">
      <div className="container">
        <div className="grid">
          <div className="phone-wrap">
            <Doodle
              style={{
                top: '8%',
                left: '-4%',
                width: 60,
                transform: 'rotate(-10deg)',
                color: 'var(--primary)',
              }}
              viewBox="0 0 60 30"
              fill="none"
              strokeStyle
            >
              <path d="M4 15 Q14 4 24 15 T44 15 T58 15" />
            </Doodle>
            <div className="phone phone-tilt-l">
              <div className="phone-screen">
                <PhoneStatus minimal />
                <div className="full-chat">
                  <div className="lesson-head">
                    <strong>DAY 7・価値で決める価格</strong>
                    AIアシスタントに質問
                  </div>
                  <div className="bubbles">
                    <div className="bubble ai">こんにちは!今日のレッスンで気になったところはありますか?😊</div>
                    <div className="bubble user">「価値から逆算」がよく分からなくて...具体例を教えて</div>
                    <div className="bubble ai">
                      いいですね!たとえば同じコーヒー1杯でも、自販機なら150円、カフェだと500円。同じ豆でも<strong>提供する体験</strong>が違うので、お客さんが感じる価値が変わるんです。
                    </div>
                    <div className="bubble user">なるほど。自分のサービスでも考えてみる!</div>
                  </div>
                  <div className="chat-input">
                    メッセージを入力…
                    <span className="send" aria-hidden="true">↑</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="copy">
            <span className="eyebrow purple">Feature 03</span>
            <h2>
              つまずいたら、
              <br />
              AIアシスタントに聞ける。
            </h2>
            <p>
              レッスンを読んでいて分からないところがあったら、その場でチャット。AIアシスタントは「今日のレッスン」と「あなたのコース全体」を理解した上で答えます。
            </p>
            <ul>
              <li>
                <span className="check">✓</span>
                <span><strong>レッスンの文脈</strong>を踏まえた回答</span>
              </li>
              <li>
                <span className="check">✓</span>
                <span>「もう少し噛み砕いて」「具体例を」など<strong>追加の依頼</strong>もOK</span>
              </li>
              <li>
                <span className="check">✓</span>
                <span>過去の質問は<strong>レッスンに紐付いて</strong>後から見返せる</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// Feature D — Streak
// ----------------------------------------------------------------
function FeatureD({
  streakValue,
  streakRef,
}: {
  streakValue: number;
  streakRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <section className="feature reverse bg-orange">
      <div className="container">
        <div className="grid">
          <div className="phone-wrap">
            <Doodle
              style={{
                top: 0,
                right: '-4%',
                width: 48,
                transform: 'rotate(18deg)',
                color: 'var(--primary)',
              }}
              viewBox="0 0 48 48"
            >
              <path d="M24 4 L28 18 L42 18 L30 26 L34 40 L24 32 L14 40 L18 26 L6 18 L20 18 Z" />
            </Doodle>
            <Doodle
              className="doodle-mint"
              style={{ bottom: '6%', left: '-2%', width: 70, transform: 'rotate(-14deg)' }}
              viewBox="0 0 70 30"
              fill="none"
              strokeStyle
            >
              <path d="M4 15 Q14 4 24 15 T44 15 T68 15" />
            </Doodle>
            <div className="phone phone-tilt">
              <div className="phone-screen">
                <PhoneStatus minimal />
                <div className="full-streak">
                  <img className="flame-big-icon" src={FLAME_SRC} alt="" />
                  <div ref={streakRef}>
                    <div className="streak-num">
                      {streakValue}
                      <span className="unit">日</span>
                    </div>
                    <div className="streak-label">
                      連続でレッスン完了中
                      <br />
                      <strong>あと18日でゴール!</strong>
                    </div>
                  </div>
                  <div className="weekly-big">
                    <div
                      className="label"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 10,
                        color: 'var(--slate)',
                        fontWeight: 800,
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                      }}
                    >
                      <span>今週</span>
                      <span>5 / 7 完了</span>
                    </div>
                    <div className="row">
                      <span className="day-circle done">月</span>
                      <span className="day-circle done">火</span>
                      <span className="day-circle done">水</span>
                      <span className="day-circle done">木</span>
                      <span className="day-circle today">金</span>
                      <span className="day-circle">土</span>
                      <span className="day-circle">日</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="copy">
            <span className="eyebrow">Feature 04</span>
            <h2>
              ストリークで、
              <br />
              「やめない」を仕掛ける。
            </h2>
            <p>
              連続日数とウィークリーチェックで、続けることそのものをご褒美に。
              <br />
              忙しい日のための「マイルストン保護」もあるので、1日休んでも炎は消えません。
            </p>
            <ul>
              <li>
                <span className="check orange">✓</span>
                <span><strong>連続日数</strong>と<strong>週次トラッカー</strong>で進捗が見える</span>
              </li>
              <li>
                <span className="check orange">✓</span>
                <span>夜のリマインドはあなたの<strong>習慣時間</strong>に合わせて自動調整</span>
              </li>
              <li>
                <span className="check orange">✓</span>
                <span>1日休んでも<strong>炎が消えない</strong>セーフティ</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// Tags
// ----------------------------------------------------------------
function Tags() {
  return (
    <section className="tags-section">
      <div className="container">
        <div className="section-h reveal" data-reveal>
          <span className="eyebrow">Use cases</span>
          <h2>
            こんな学びに
            <br />
            <span className="marker-y">フィットします。</span>
          </h2>
        </div>

        <div className="tags-wrap stagger" data-reveal>
          <span className="tag orange">💼 副業</span>
          <span className="tag mint">📈 投資 / NISA</span>
          <span className="tag purple">💻 プログラミング</span>
          <span className="tag yellow">🗣 英会話</span>
          <span className="tag orange">🎨 Webデザイン</span>
          <span className="tag mint">📣 マーケティング</span>
          <span className="tag purple">✍️ ライティング</span>
          <span className="tag yellow">📊 データ分析</span>
          <span className="tag orange">📖 読書習慣</span>
          <span className="tag mint">🎓 資格学習</span>
        </div>

        <p className="tags-foot">具体的なゴールほど、AIの設計精度は上がります。</p>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// Pricing
// ----------------------------------------------------------------
function Pricing({ startHref }: { startHref: string }) {
  return (
    <section className="pricing" id="pricing">
      <div className="container">
        <div className="section-h reveal" data-reveal>
          <span className="eyebrow">Pricing</span>
          <h2>
            まずは無料で、
            <br />
            30日まるごと試せます。
          </h2>
        </div>

        <div className="pricing-grid stagger" data-reveal>
          <div className="price-card featured">
            <div className="plan">Free Plan</div>
            <h3>無料プラン</h3>
            <div className="amount">
              <span className="yen">¥</span>0<span className="per"> / ずっと</span>
            </div>
            <hr />
            <ul>
              <li><span className="ck">✓</span>コースは<strong>1つ</strong>まで</li>
              <li><span className="ck">✓</span>30日分の<strong>全レッスン</strong></li>
              <li><span className="ck">✓</span>AIアシスタントとのチャット</li>
              <li><span className="ck">✓</span>ストリーク・週次トラッカー</li>
            </ul>
            <Link className="btn btn-outline-orange btn-lg" to={startHref}>
              <span className="jp">無料で始める</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="price-card coming">
            <span className="coming-badge">COMING SOON</span>
            <div className="plan">Pro Plan</div>
            <h3>有料プラン</h3>
            <div className="amount">準備中</div>
            <hr />
            <ul>
              <li><span className="ck">✓</span>コース<strong>無制限</strong></li>
              <li><span className="ck">✓</span>並行で<strong>複数テーマ</strong>を学習</li>
              <li><span className="ck">✓</span>新機能の<strong>早期アクセス</strong></li>
              <li><span className="ck">✓</span>無料プランの全機能</li>
            </ul>
            <button className="btn btn-disabled btn-lg" disabled>
              <span className="jp">順次公開</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// FAQ
// ----------------------------------------------------------------
function Faq({
  openFaq,
  setOpenFaq,
}: {
  openFaq: number;
  setOpenFaq: (n: number) => void;
}) {
  return (
    <section className="faq" id="faq">
      <div className="container">
        <div className="section-h reveal" data-reveal>
          <span className="eyebrow">FAQ</span>
          <h2>よくある質問</h2>
        </div>

        <div className="faq-grid stagger" data-reveal>
          {FAQS.map((item, i) => (
            <FaqItem
              key={i}
              q={item.q}
              a={item.a}
              open={openFaq === i}
              onToggle={() => setOpenFaq(openFaq === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [maxH, setMaxH] = useState<number>(0);
  useEffect(() => {
    if (open && innerRef.current) {
      setMaxH(innerRef.current.scrollHeight);
    } else {
      setMaxH(0);
    }
  }, [open, a]);

  return (
    <div className={`faq-item${open ? ' open' : ''}`}>
      <button className="faq-q" type="button" onClick={onToggle}>
        <span className="qmark">Q</span>
        <span className="q-text">{q}</span>
        <span className="chev">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M2 5 L7 10 L12 5" />
          </svg>
        </span>
      </button>
      <div className="faq-a" style={{ maxHeight: maxH }}>
        <div className="faq-a-inner" ref={innerRef}>
          {a}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Final CTA
// ----------------------------------------------------------------
function FinalCta({ startHref }: { startHref: string }) {
  return (
    <section className="final-cta" id="cta">
      <div className="container">
        <div className="inner reveal reveal-pop" data-reveal>
          <h2>
            今日の<span className="marker-y">10分</span>を、
            <br />
            未来への投資に。
          </h2>
          <p className="sub">
            テーマとゴールを入れるだけ。
            <br />
            AIが30日分のコースを30秒で組み立てます。
          </p>

          <div className="btn-wrap">
            <svg
              className="doodle doodle-1"
              style={{ position: 'absolute', width: 42, color: '#FACC15' }}
              viewBox="0 0 42 42"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M21 4 L25 16 L37 16 L27 24 L31 36 L21 28 L11 36 L15 24 L5 16 L17 16 Z" />
            </svg>
            <svg
              className="doodle doodle-2"
              style={{ position: 'absolute', width: 34, color: 'var(--primary)' }}
              viewBox="0 0 34 34"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M17 2 L20 12 L30 12 L22 18 L25 28 L17 22 L9 28 L12 18 L4 12 L14 12 Z" />
            </svg>
            <svg
              className="doodle doodle-3"
              style={{ position: 'absolute', width: 90, color: 'var(--accent)' }}
              viewBox="0 0 90 60"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 30 Q40 0 80 36" />
              <path d="M70 26 L80 36 L70 44" />
            </svg>
            <svg
              className="doodle doodle-4"
              style={{ position: 'absolute', width: 60, color: 'var(--ink)' }}
              viewBox="0 0 60 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 12 Q12 2 22 12 T42 12 T58 12" />
            </svg>

            <Link className="btn btn-primary btn-xl" to={startHref}>
              <span className="jp">学習を始める</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div style={{ marginTop: 24, fontSize: 13, color: 'var(--slate-2)', fontWeight: 700 }}>
            クレジットカード不要 ・ 30秒で開始 ・ いつでもやめられます
          </div>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// Footer
// ----------------------------------------------------------------
function Footer() {
  return (
    <footer className="site-footer">
      <div className="container inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="logo">
            <span className="flame">
              <img src={FLAME_SRC} alt="" />
            </span>
            <span>
              Daily<span className="dot">Learn</span>
            </span>
          </div>
          <span className="copy">© 2026 DailyLearn Inc.</span>
        </div>
        <nav className="footer-links">
          <a href="#">プライバシー</a>
          <a href="#">利用規約</a>
          <a href="#">特定商取引法</a>
          <a href="#">お問い合わせ</a>
        </nav>
      </div>
    </footer>
  );
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function PhoneStatus({ minimal = false }: { minimal?: boolean }) {
  return (
    <div className="phone-status">
      <span>9:41</span>
      <span className="right">
        <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor">
          <path
            d="M1 9 L1 7 M5 9 L5 5 M9 9 L9 3 M13 9 L13 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        {!minimal && (
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="0.5" y="2" width="11" height="6" rx="1.5" />
            <rect x="2" y="3.5" width="8" height="3" fill="currentColor" />
          </svg>
        )}
      </span>
    </div>
  );
}

function Doodle({
  className,
  style,
  viewBox,
  fill = 'currentColor',
  strokeStyle = false,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  viewBox: string;
  fill?: string;
  strokeStyle?: boolean;
  children: ReactNode;
}) {
  const props = strokeStyle
    ? {
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 3,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
      }
    : { fill };
  return (
    <svg
      className={`doodle${className ? ' ' + className : ''}`}
      style={style}
      viewBox={viewBox}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

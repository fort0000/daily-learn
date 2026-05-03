// Screen 1 — Home / Today's Lesson
function HomeScreen() {
  const { navigate } = useNav();
  const days = [
    { d: '月', done: true },
    { d: '火', done: true },
    { d: '水', done: true },
    { d: '木', done: true },
    { d: '金', done: false, today: true },
    { d: '土', done: false },
    { d: '日', done: false },
  ];

  return (
    <Phone>
      <StatusBar />
      <div style={{ padding: '4px 20px 0', paddingRight: 76 }}>
        <div style={{ fontSize: 13, color: DL.slate, fontWeight: 700, letterSpacing: 0.5 }}>5月3日(金)</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          <div style={{
            background: '#fff',
            borderRadius: 999,
            padding: '4px 10px 4px 6px',
            display: 'flex', alignItems: 'center', gap: 4,
            boxShadow: `0 0 0 2px ${DL.fire}`,
          }}>
            <Flame size={22} />
            <div style={{ fontSize: 13, fontWeight: 900, color: DL.fire, fontVariantNumeric: 'tabular-nums' }}>12</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: DL.slate, fontFamily: DL.fontJp }}>日連続</div>
          </div>
        </div>
      </div>

      <LessonCarousel />

      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: DL.navy, fontFamily: DL.fontJp }}>今週の学習</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: DL.mintDark, fontFamily: DL.fontJp }}>4 / 7 日</div>
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
          {days.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 999,
                background: d.done ? DL.mint : d.today ? '#fff' : '#F5EDDF',
                border: d.today ? `2.5px dashed ${DL.primary}` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: d.done ? '#fff' : DL.slateLight,
                fontWeight: 900, fontSize: 13,
                boxShadow: d.done ? '0 2px 0 #0F7A38' : 'none',
              }}>
                {d.done ? (
                  <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8 L7 12 L13 4" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : d.today ? '今' : ''}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: d.today ? DL.primary : DL.slateLight, fontFamily: DL.fontJp }}>{d.d}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 20px 0' }}>
        <button
          onClick={() => navigate('create')}
          style={{
            width: '100%',
            background: '#fff',
            border: `2px dashed ${DL.primary}`,
            borderRadius: 20,
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer',
            fontFamily: DL.fontJp,
            textAlign: 'left',
          }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: DL.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 3px 0 ${DL.primaryShadow}`,
            flexShrink: 0,
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 4 V18 M4 11 H18" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: DL.navy }}>新しい学習コースを作る</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: DL.slate, marginTop: 2 }}>目標を入力 → AIがコースを設計</div>
          </div>
        </button>
      </div>

      <TabBar active="home" />
    </Phone>
  );
}

// Hero carousel — swipeable lesson cards.
function LessonCarousel() {
  const { navigate } = useNav();
  const lessons = [
    {
      day: 12, status: 'today', eyebrow: '今日のレッスン',
      title: ['競合分析の基本', 'フレームワーク'],
      summary: '3C・4P・SWOTを使い分けて、市場のスキマを見つける方法。今日は3Cから始めよう。',
      cta: '今日の学びを始める →',
      color: DL.primary, shadow: DL.primaryShadow,
      chip: { bg: '#FFEDD5', dot: DL.fire, fg: DL.fireDark, label: 'DAY 12 / 30' },
      blob: '#FFE4D1',
      planId: 'side-business',
    },
    {
      day: 13, status: 'tomorrow', eyebrow: '今日のレッスン',
      title: ['顧客インタビュー', 'の作り方'],
      summary: '5人に聞くだけで仮説の8割は検証できる。質問リストを準備しよう。',
      cta: '今日の学びを始める →',
      color: DL.mint, shadow: DL.mintShadow,
      chip: { bg: '#DCFCE7', dot: DL.mint, fg: DL.mintDark, label: 'DAY 13 / 30' },
      blob: '#D1FAE5',
      planId: 'interview',
    },
    {
      day: 14, status: 'soon', eyebrow: '今日のレッスン',
      title: ['価格設定の', 'やさしい考え方'],
      summary: 'コスト基準・市場基準・価値基準。3つの軸でブレずに値段を決める。',
      cta: '今日の学びを始める →',
      color: '#A855F7', shadow: '#7E22CE',
      chip: { bg: '#EDE9FE', dot: '#A855F7', fg: '#6D28D9', label: 'DAY 14 / 30' },
      blob: '#EDE9FE',
      planId: 'pricing',
    },
  ];

  const [idx, setIdx] = React.useState(0);
  const [shift, setShift] = React.useState(0);
  const viewportRef = React.useRef(null);
  const trackRef = React.useRef(null);

  // Center the active card by measuring it directly — no fragile %/px math.
  const recenter = React.useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const card = track.children[idx];
    if (!card) return;
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    setShift(viewport.clientWidth / 2 - cardCenter);
  }, [idx]);

  React.useLayoutEffect(() => { recenter(); }, [recenter]);
  React.useEffect(() => {
    if (!viewportRef.current) return;
    const ro = new ResizeObserver(recenter);
    ro.observe(viewportRef.current);
    return () => ro.disconnect();
  }, [recenter]);

  const startX = React.useRef(null);
  const moved = React.useRef(false);
  const onStart = (e) => {
    startX.current = (e.touches ? e.touches[0] : e).clientX;
    moved.current = false;
  };
  const onMove = (e) => {
    if (startX.current == null) return;
    const x = (e.touches ? e.touches[0] : e).clientX;
    if (Math.abs(x - startX.current) > 8) moved.current = true;
  };
  const onEnd = (e) => {
    if (startX.current == null) return;
    const x = (e.changedTouches ? e.changedTouches[0] : e).clientX;
    const dx = x - startX.current;
    if (dx > 40 && idx > 0) setIdx(idx - 1);
    else if (dx < -40 && idx < lessons.length - 1) setIdx(idx + 1);
    startX.current = null;
  };
  return (
    <div style={{ paddingTop: 20 }}>
      <div
        ref={viewportRef}
        onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={() => { startX.current = null; }}
        onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
        style={{ overflow: 'hidden', position: 'relative', padding: '0 0 4px' }}>
        <div ref={trackRef} style={{
          display: 'flex',
          gap: 12,
          padding: '0 36px',
          transform: `translateX(${shift}px)`,
          transition: 'transform 320ms cubic-bezier(.2,.7,.3,1)',
        }}>
          {lessons.map((l, i) => (
            <div key={i} style={{
              flex: '0 0 calc(100% - 48px)', boxSizing: 'border-box',
              transition: 'opacity 220ms, transform 220ms',
              opacity: i === idx ? 1 : 0.55,
              transform: i === idx ? 'scale(1)' : 'scale(0.96)',
            }}>
              <div style={{
                background: '#fff',
                borderRadius: 24,
                padding: '18px 20px 22px',
                border: `1.5px solid ${DL.border}`,
                boxShadow: '0 4px 0 #F0E2CD',
                position: 'relative',
                overflow: 'hidden',
                opacity: l.status === 'soon' ? 0.95 : 1,
              }}>
                <div style={{
                  position: 'absolute', top: -40, right: -30,
                  width: 120, height: 120, borderRadius: '50%',
                  background: `radial-gradient(circle, ${l.blob} 0%, ${l.blob} 60%, transparent 70%)`,
                  opacity: 0.7,
                }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: l.chip.bg, borderRadius: 999,
                    padding: '4px 10px',
                    fontSize: 11, fontWeight: 900, color: l.chip.fg,
                    letterSpacing: 0.5,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: l.chip.dot }} />
                    {l.chip.label}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: DL.slate, fontFamily: DL.fontJp }}>
                    ⏱ 約10分
                  </div>
                </div>
                <div style={{ marginTop: 14, fontSize: 11, fontWeight: 800, color: DL.slateLight, letterSpacing: 1, fontFamily: DL.fontJp }}>
                  {l.eyebrow}
                </div>
                <div style={{
                  marginTop: 4, fontSize: 23, fontWeight: 900, color: DL.navy,
                  fontFamily: DL.fontJp, lineHeight: 1.25, letterSpacing: -0.3,
                }}>
                  {l.title[0]}<br />{l.title[1]}
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: DL.slate, lineHeight: 1.6, fontFamily: DL.fontJp }}>
                  {l.summary}
                </div>
                <div style={{ marginTop: 18 }}>
                  <PushButton
                    color={l.color} shadow={l.shadow} fontSize={16}
                    onClick={() => { if (!moved.current) navigate('article', { planId: l.planId, day: l.day }); }}>
                    {l.cta}
                  </PushButton>
                </div>
                <div
                  onClick={() => { if (!moved.current) navigate('roadmap', { planId: l.planId }); }}
                  style={{
                    marginTop: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    paddingTop: 12, borderTop: `1px dashed ${DL.border}`,
                    cursor: 'pointer',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: l.chip.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 4 Q8 4 8 8 Q8 12 13 12" stroke={l.chip.fg} strokeWidth="2" strokeLinecap="round" fill="none" />
                        <circle cx="3" cy="4" r="1.6" fill={l.chip.fg} />
                        <circle cx="13" cy="12" r="1.6" fill={l.chip.fg} />
                      </svg>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: DL.navy, fontFamily: DL.fontJp }}>
                      このコースのロードマップ
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M7 4 L13 10 L7 16" stroke={l.chip.fg} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
        {lessons.map((_, i) => (
          <div key={i} onClick={() => setIdx(i)} style={{
            width: i === idx ? 22 : 7, height: 7, borderRadius: 999,
            background: i === idx ? DL.primary : '#E5DCC8',
            transition: 'all 200ms', cursor: 'pointer',
          }} />
        ))}
      </div>
    </div>
  );
}

window.HomeScreen = HomeScreen;

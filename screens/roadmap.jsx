// Screen 2 — Roadmap (90-day winding path)
function RoadmapScreen() {
  const { navigate } = useNav();
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const w = i + 1;
    let state = 'future';
    if (w <= 2) state = 'done';
    else if (w === 3) state = 'current';
    return { w, state };
  });

  return (
    <Phone>
      <StatusBar/>
      <div style={{ padding: '4px 20px 10px', paddingRight: 76 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div onClick={() => navigate('home')} style={{
            width: 38, height: 38, borderRadius: 12,
            background: '#fff', border: `1.5px solid ${DL.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 3 L4 8 L10 13" stroke={DL.navy} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: DL.slateLight, letterSpacing: 1 }}>90日コース</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: DL.navy, fontFamily: DL.fontJp, marginTop: 2 }}>副業を始める</div>
          </div>
        </div>
        <div style={{
          background: '#fff', borderRadius: 14, padding: '10px 14px',
          border: `1.5px solid ${DL.border}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, fontFamily: DL.fontJp, marginBottom: 6 }}>
            <span style={{ color: DL.slate }}>達成度</span>
            <span style={{ color: DL.primary }}>13% <span style={{ color: DL.slateLight, fontWeight: 700 }}>(12/90日)</span></span>
          </div>
          <div style={{ height: 8, background: '#F5EDDF', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: '13%', height: '100%', background: `linear-gradient(90deg, ${DL.primary}, ${DL.fire})`, borderRadius: 999 }}/>
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute', top: 200, bottom: 0, left: 0, right: 0,
        overflowY: 'auto',
        backgroundImage: `radial-gradient(circle, #E8DCC4 1.2px, transparent 1.5px)`,
        backgroundSize: '20px 20px',
      }}>
        <div style={{ padding: '18px 0 100px', position: 'relative' }}>
          <PhaseLabel label="基礎編" sub="Week 1–4" color={DL.mint}/>
          {weeks.slice(0, 4).map((w, i) => <Node key={w.w} {...w} idx={i}/>)}

          <PhaseLabel label="実践編" sub="Week 5–8" color={DL.primary} top/>
          {weeks.slice(4, 8).map((w, i) => <Node key={w.w} {...w} idx={i + 4}/>)}

          <PhaseLabel label="応用編" sub="Week 9–12" color="#A855F7" top/>
          {weeks.slice(8, 12).map((w, i) => <Node key={w.w} {...w} idx={i + 8}/>)}
        </div>
      </div>

      <TabBar active="home"/>
    </Phone>
  );
}

function PhaseLabel({ label, sub, color, top }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      margin: top ? '24px 24px 8px' : '0 24px 8px',
      padding: '6px 12px',
      background: '#fff',
      border: `1.5px solid ${color}`,
      borderRadius: 12,
      width: 'fit-content',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: 999, background: color }}/>
      <div style={{ fontSize: 13, fontWeight: 900, color: DL.navy, fontFamily: DL.fontJp }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: DL.slateLight }}>{sub}</div>
    </div>
  );
}

function Node({ w, state, idx }) {
  const { navigate } = useNav();
  const positions = [120, 200, 240, 200, 120, 60, 30, 60];
  const left = positions[idx % positions.length];

  const colors = {
    done: { bg: DL.mint, sh: '#0F7A38', icon: 'check' },
    current: { bg: DL.primary, sh: DL.primaryShadow, icon: 'star' },
    future: { bg: '#E5DCC8', sh: '#C9BFA8', icon: 'lock' },
  };
  const c = colors[state];
  const size = state === 'current' ? 78 : 64;

  return (
    <div style={{ position: 'relative', height: 92 }}>
      <div
        onClick={() => { if (state !== 'future') navigate('article', { week: w }); }}
        style={{
          position: 'absolute', left, top: 4,
          width: size, height: size,
          cursor: state === 'future' ? 'not-allowed' : 'pointer',
        }}>
        {state === 'current' && (
          <div style={{
            position: 'absolute', inset: -8,
            borderRadius: '50%',
            border: `3px solid ${DL.primary}`,
            opacity: 0.3,
            animation: 'dlpulse 2s infinite ease-out',
          }}/>
        )}
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: c.bg,
          boxShadow: `0 5px 0 ${c.sh}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '4px solid #fff',
          boxSizing: 'border-box',
          position: 'relative',
        }}>
          {c.icon === 'check' && (
            <svg width="28" height="28" viewBox="0 0 28 28"><path d="M6 14 L12 20 L22 8" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
          {c.icon === 'star' && (
            <div style={{ fontSize: 12, fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1, fontFamily: DL.fontJp }}>
              <div style={{ fontSize: 22 }}>W{w}</div>
              <div style={{ fontSize: 9, marginTop: 2, opacity: 0.95 }}>進行中</div>
            </div>
          )}
          {c.icon === 'lock' && (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="5" y="10" width="12" height="9" rx="2" fill="#A89F88"/><path d="M7 10 V7 a4 4 0 0 1 8 0 V10" stroke="#A89F88" strokeWidth="2.4" fill="none" strokeLinecap="round"/></svg>
          )}
        </div>
        {state !== 'current' && (
          <div style={{
            position: 'absolute', left: '50%', top: size + 4,
            transform: 'translateX(-50%)',
            fontSize: 10, fontWeight: 800,
            color: state === 'future' ? DL.slateLight : DL.mintDark,
            fontFamily: DL.fontJp, whiteSpace: 'nowrap',
          }}>
            Week {w}
          </div>
        )}
      </div>
    </div>
  );
}

window.RoadmapScreen = RoadmapScreen;

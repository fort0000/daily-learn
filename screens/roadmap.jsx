// Screen 2 — Roadmap (30-day winding path, one node per day)
function RoadmapScreen() {
  const { navigate } = useNav();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = i + 1;
    let state = 'future';
    if (d <= 11) state = 'done';
    else if (d === 12) state = 'current';
    return { d, state };
  });

  return (
    <Phone>
      <StatusBar />
      <div style={{ padding: '4px 20px 10px', paddingRight: 76 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div onClick={() => navigate('home')} style={{
            width: 38, height: 38, borderRadius: 12,
            background: '#fff', border: `1.5px solid ${DL.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 3 L4 8 L10 13" stroke={DL.navy} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: DL.slateLight, letterSpacing: 1 }}>30日コース</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: DL.navy, fontFamily: DL.fontJp, marginTop: 2 }}>副業を始める</div>
          </div>
        </div>
        <div style={{
          background: '#fff', borderRadius: 14, padding: '10px 14px',
          border: `1.5px solid ${DL.border}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, fontFamily: DL.fontJp, marginBottom: 6 }}>
            <span style={{ color: DL.slate }}>達成度</span>
            <span style={{ color: DL.primary }}>13% <span style={{ color: DL.slateLight, fontWeight: 700 }}>(12/30日)</span></span>
          </div>
          <div style={{ height: 8, background: '#F5EDDF', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: '13%', height: '100%', background: `linear-gradient(90deg, ${DL.primary}, ${DL.fire})`, borderRadius: 999 }} />
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
          {days.map((d, i) => <Node key={d.d} {...d} idx={i} />)}
        </div>
      </div>

      <TabBar active="home" />
    </Phone>
  );
}

function Node({ d, state, idx }) {
  const { navigate } = useNav();
  const positions = [110, 160, 200, 230, 240, 230, 200, 160, 110, 60, 30, 20, 30, 60];
  const left = positions[idx % positions.length];

  const colors = {
    done: { bg: DL.mint, sh: '#0F7A38', icon: 'check' },
    current: { bg: DL.primary, sh: DL.primaryShadow, icon: 'star' },
    future: { bg: '#E5DCC8', sh: '#C9BFA8', icon: 'lock' },
  };
  const c = colors[state];
  const size = state === 'current' ? 56 : 44;
  // Reduce label clutter on a 30-node path: show the Day label only on
  // milestone days (every 10) and on the last completed day.
  const showLabel = state !== 'current' && (d % 10 === 0 || d === 11 || d === 1);

  return (
    <div style={{ position: 'relative', height: 60 }}>
      <div
        onClick={() => { if (state !== 'future') navigate('article', { day: d }); }}
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
          }} />
        )}
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: c.bg,
          boxShadow: `0 4px 0 ${c.sh}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '3px solid #fff',
          boxSizing: 'border-box',
          position: 'relative',
        }}>
          {c.icon === 'check' && (
            <svg width="20" height="20" viewBox="0 0 28 28"><path d="M6 14 L12 20 L22 8" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
          {c.icon === 'star' && (
            <div style={{ fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1, fontFamily: DL.fontJp }}>
              <div style={{ fontSize: 16 }}>D{d}</div>
              <div style={{ fontSize: 8, marginTop: 2, opacity: 0.95 }}>進行中</div>
            </div>
          )}
          {c.icon === 'lock' && (
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none"><rect x="5" y="10" width="12" height="9" rx="2" fill="#A89F88" /><path d="M7 10 V7 a4 4 0 0 1 8 0 V10" stroke="#A89F88" strokeWidth="2.4" fill="none" strokeLinecap="round" /></svg>
          )}
        </div>
        {showLabel && (
          <div style={{
            position: 'absolute', left: '50%', top: size + 2,
            transform: 'translateX(-50%)',
            fontSize: 9, fontWeight: 800,
            color: state === 'future' ? DL.slateLight : DL.mintDark,
            fontFamily: DL.fontJp, whiteSpace: 'nowrap',
          }}>
            Day {d}
          </div>
        )}
      </div>
    </div>
  );
}

window.RoadmapScreen = RoadmapScreen;

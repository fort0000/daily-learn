// Shared bits for DailyLearn — palette, mascot, hamburger menu, phone wrapper.

const DL = {
  bg: '#FFFBF5',
  cream: '#FFF5E6',
  card: '#FFFFFF',
  primary: '#FF7A45',
  primaryDark: '#E85D2C',
  primaryShadow: '#C8431A',
  mint: '#22C55E',
  mintDark: '#16A34A',
  mintShadow: '#0F7A38',
  fire: '#F97316',
  fireDark: '#EA580C',
  yellow: '#FACC15',
  navy: '#0F172A',
  slate: '#475569',
  slateLight: '#94A3B8',
  border: '#F1E8DC',
  divider: '#EFE6D8',
  font: '"Nunito", "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif',
  fontJp: '"Hiragino Sans", "Noto Sans JP", system-ui, sans-serif',
};

const NavContext = React.createContext({ route: { name: 'home' }, navigate: () => {} });
const useNav = () => React.useContext(NavContext);

// Mascot — rounded creature with glasses, drawn from primitives.
function Mascot({ size = 64 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" style={{ display: 'block' }}>
      <ellipse cx="36" cy="92" rx="9" ry="4" fill="#F59E0B"/>
      <ellipse cx="64" cy="92" rx="9" ry="4" fill="#F59E0B"/>
      <ellipse cx="50" cy="58" rx="32" ry="34" fill="#7DD3A8"/>
      <ellipse cx="50" cy="64" rx="20" ry="22" fill="#C8F0D8"/>
      <ellipse cx="38" cy="38" rx="10" ry="6" fill="#A7E3C2" opacity="0.7"/>
      <circle cx="40" cy="50" r="9" fill="#FFFBF5" stroke="#0F172A" strokeWidth="2.5"/>
      <circle cx="60" cy="50" r="9" fill="#FFFBF5" stroke="#0F172A" strokeWidth="2.5"/>
      <line x1="49" y1="50" x2="51" y2="50" stroke="#0F172A" strokeWidth="2.5"/>
      <circle cx="40" cy="50" r="3" fill="#0F172A"/>
      <circle cx="60" cy="50" r="3" fill="#0F172A"/>
      <circle cx="41" cy="49" r="1" fill="#fff"/>
      <circle cx="61" cy="49" r="1" fill="#fff"/>
      <path d="M47 60 L53 60 L50 65 Z" fill="#F59E0B"/>
      <circle cx="28" cy="58" r="3.5" fill="#FF9F8A" opacity="0.6"/>
      <circle cx="72" cy="58" r="3.5" fill="#FF9F8A" opacity="0.6"/>
      <path d="M44 22 Q50 14 56 22 Q53 24 50 23 Q47 24 44 22 Z" fill="#5BB585"/>
    </svg>
  );
}

// 3D pressable button with depth shadow
function PushButton({ children, color = DL.primary, shadow = DL.primaryShadow, height = 60, fontSize = 17, full = true, fg = '#fff', icon, onClick }) {
  return (
    <div onClick={onClick} style={{
      width: full ? '100%' : 'auto',
      borderRadius: 999,
      background: shadow,
      padding: '0 0 5px',
      boxSizing: 'border-box',
      cursor: 'pointer',
    }}>
      <div style={{
        background: color,
        borderRadius: 999,
        height,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8,
        color: fg,
        fontWeight: 800,
        fontSize,
        letterSpacing: 0.2,
        fontFamily: DL.font,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
      }}>
        {icon}{children}
      </div>
    </div>
  );
}

// Flame icon — original drawing
function Flame({ size = 28, on = true }) {
  const s = size;
  const gradId = `fl${size}`;
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FCD34D"/>
          <stop offset="0.5" stopColor="#FB923C"/>
          <stop offset="1" stopColor="#EA580C"/>
        </linearGradient>
      </defs>
      <path d="M16 2 C13 7, 8 9, 8 16 C8 23, 12 29, 16 29 C20 29, 24 23, 24 16 C24 12, 21 11, 20 7 C18 10, 17 8, 16 2 Z"
        fill={on ? `url(#${gradId})` : '#D6D3D1'}/>
      <path d="M16 13 C14.5 16, 13 18, 13 21 C13 24, 14.5 26, 16 26 C17.5 26, 19 24, 19 21 C19 19, 18 18, 17.5 16 C17 17.5, 16.5 17, 16 13 Z"
        fill={on ? '#FEF3C7' : '#F5F5F4'} opacity="0.9"/>
    </svg>
  );
}

// Hamburger menu (top-right). Default: just the 44×44 button.
// Per design feedback, only Home + Profile are exposed here; Roadmap and Coach
// are reached from in-context links (carousel cards / article).
// On desktop the sidebar replaces this — hidden via the .dl-tabbar class.
function TabBar({ active = 'home' }) {
  const [open, setOpen] = React.useState(false);
  const { navigate } = useNav();
  const items = [
    { id: 'home', label: 'ホーム', sub: '今日のレッスン' },
    { id: 'profile', label: 'プロフィール', sub: '記録・バッジ' },
  ];
  return (
    <div className="dl-tabbar" style={{
      position: 'absolute', top: 14, right: 16, zIndex: 30,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
    }}>
      <div onClick={() => setOpen(o => !o)} style={{
        width: 44, height: 44, borderRadius: 14,
        background: open ? DL.primary : '#fff',
        border: `1.5px solid ${open ? DL.primary : DL.border}`,
        boxShadow: open ? `0 3px 0 ${DL.primaryShadow}` : '0 3px 0 #F0E2CD',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
      }}>
        {open ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2 L12 12 M12 2 L2 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
            <rect x="0" y="0" width="20" height="2.5" rx="1.25" fill={DL.navy}/>
            <rect x="0" y="5.75" width="20" height="2.5" rx="1.25" fill={DL.navy}/>
            <rect x="0" y="11.5" width="20" height="2.5" rx="1.25" fill={DL.navy}/>
          </svg>
        )}
      </div>
      {open && (
        <div style={{
          background: '#fff',
          borderRadius: 18,
          border: `1.5px solid ${DL.border}`,
          boxShadow: '0 8px 0 #F0E2CD, 0 12px 32px rgba(15,23,42,0.08)',
          padding: 6,
          width: 220,
        }}>
          {items.map((t) => {
            const isActive = active === t.id;
            return (
              <div key={t.id}
                onClick={() => { setOpen(false); navigate(t.id); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: isActive ? '#FFEDD5' : 'transparent',
                  cursor: 'pointer',
                }}>
                <div style={{
                  width: 8, height: 8, borderRadius: 999,
                  background: isActive ? DL.primary : '#E5DCC8',
                  flexShrink: 0,
                }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: isActive ? DL.fireDark : DL.navy, fontFamily: DL.fontJp, lineHeight: 1.1 }}>{t.label}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: DL.slateLight, fontFamily: DL.fontJp, marginTop: 2 }}>{t.sub}</div>
                </div>
                {isActive && (
                  <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 7 L6 10 L11 4" stroke={DL.primary} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Top spacer (the prototype removed the iOS status bar but kept this for layout).
function StatusBar() {
  return <div style={{ height: 16 }}/>;
}

// Desktop sidebar — hidden on mobile via CSS. Same nav items as the
// hamburger (Home + Profile), with brand + streak indicator.
function Sidebar() {
  const { route, navigate } = useNav();
  const items = [
    {
      id: 'home', label: 'ホーム', sub: '今日のレッスン',
      icon: (active) => (
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <path d="M3 11 L11 3 L19 11 V19 a1 1 0 0 1 -1 1 H14 V14 H8 V20 H4 a1 1 0 0 1 -1 -1 Z"
            fill={active ? '#fff' : 'none'} stroke={active ? '#fff' : DL.navy} strokeWidth="2.2" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: 'profile', label: 'プロフィール', sub: '記録・バッジ',
      icon: (active) => (
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="8" r="4" fill={active ? '#fff' : 'none'} stroke={active ? '#fff' : DL.navy} strokeWidth="2.2"/>
          <path d="M3 20 C3 15 7 13 11 13 C15 13 19 15 19 20" fill={active ? '#fff' : 'none'} stroke={active ? '#fff' : DL.navy} strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      ),
    },
  ];
  return (
    <aside className="dl-sidebar">
      <div className="dl-brand">
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: '#FEF3C7', border: `2px solid ${DL.yellow}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Mascot size={32}/>
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, color: DL.navy, fontFamily: DL.fontJp, lineHeight: 1.1 }}>DailyLearn</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: DL.slateLight, fontFamily: DL.fontJp, marginTop: 3 }}>毎日10分のマイクロ学習</div>
        </div>
      </div>

      <nav className="dl-nav">
        {items.map((t) => {
          const isActive = route.name === t.id;
          return (
            <button
              key={t.id}
              onClick={() => navigate(t.id)}
              className={`dl-nav-item${isActive ? ' active' : ''}`}>
              <span className="dl-nav-icon">{t.icon(isActive)}</span>
              <span className="dl-nav-text">
                <span className="dl-nav-label">{t.label}</span>
                <span className="dl-nav-sub">{t.sub}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div style={{ flex: 1 }}/>

      <div className="dl-streak-card">
        <Flame size={36}/>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: DL.fireDark, letterSpacing: 1, fontFamily: DL.fontJp }}>連続記録</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: DL.fire, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>12</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: DL.slate, fontFamily: DL.fontJp }}>日連続</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Phone screen wrapper — fills the stage (390×844 on desktop, full viewport on mobile)
function Phone({ children, bg = DL.bg }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: bg,
      position: 'relative',
      overflow: 'hidden',
      fontFamily: DL.font,
      color: DL.navy,
    }}>
      {children}
    </div>
  );
}

Object.assign(window, { DL, NavContext, useNav, Mascot, PushButton, Flame, TabBar, StatusBar, Phone, Sidebar });

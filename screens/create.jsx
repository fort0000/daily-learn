// Screen 6 — Create new learning course
function CreateScreen() {
  const { navigate } = useNav();
  const [field, setField] = React.useState('');
  const [level, setLevel] = React.useState('beginner');
  const [goal, setGoal] = React.useState('');

  const levels = [
    { id: 'novice', label: '全くの初心者', sub: 'これから始める', emoji: '🌱' },
    { id: 'beginner', label: '基礎を知っている', sub: '入門書は読んだ', emoji: '📖' },
    { id: 'intermediate', label: '実務経験あり', sub: '何度か手を動かした', emoji: '🛠️' },
    { id: 'advanced', label: '上級者', sub: '人に教えられる', emoji: '🎓' },
  ];

  const canSubmit = field.trim().length > 0 && goal.trim().length > 0;

  return (
    <Phone>
      <StatusBar />
      <div style={{
        padding: '8px 16px 12px', paddingRight: 76,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div onClick={() => navigate('home')} style={{
          width: 38, height: 38, borderRadius: 12,
          background: '#fff', border: `1.5px solid ${DL.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 3 L4 8 L10 13" stroke={DL.navy} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: DL.slateLight, letterSpacing: 1 }}>NEW COURSE</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: DL.navy, fontFamily: DL.fontJp, marginTop: 1 }}>新しい学習コース</div>
        </div>
      </div>

      <div style={{
        position: 'absolute', top: 70, bottom: 0, left: 0, right: 0,
        overflowY: 'auto',
        padding: '4px 20px 120px',
      }}>
        <div style={{ marginBottom: 18 }}>
          <h1 style={{
            fontSize: 22, fontWeight: 900, color: DL.navy,
            fontFamily: DL.fontJp, lineHeight: 1.3, margin: '0 0 6px',
            letterSpacing: -0.3,
          }}>
            何を学びたい？
          </h1>
          <div style={{ fontSize: 12, color: DL.slate, fontFamily: DL.fontJp, lineHeight: 1.5 }}>
            3つ答えるだけで、AIが30日のコースを設計します。
          </div>
        </div>

        <Field label="📚 分野" hint="例: 副業, 投資, プログラミング, 英会話">
          <input
            value={field}
            onChange={(e) => setField(e.target.value)}
            placeholder="学びたい分野を入力"
            style={inputStyle}
          />
        </Field>

        <Field label="🎯 自分の状態" hint="今のレベルにいちばん近いものを1つ選んでください">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {levels.map((l) => {
              const active = level === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLevel(l.id)}
                  style={{
                    width: '100%',
                    background: active ? '#FFF7ED' : '#fff',
                    border: `2px solid ${active ? DL.primary : DL.border}`,
                    borderRadius: 16,
                    padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer',
                    fontFamily: DL.fontJp,
                    textAlign: 'left',
                    boxShadow: active ? `0 3px 0 ${DL.primary}40` : 'none',
                    transition: 'all 120ms',
                  }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: active ? DL.primary : '#F5EDDF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                    flexShrink: 0,
                  }}>
                    {l.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: DL.navy }}>{l.label}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: DL.slate, marginTop: 1 }}>{l.sub}</div>
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: `2px solid ${active ? DL.primary : '#E5DCC8'}`,
                    background: active ? DL.primary : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {active && (
                      <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6 L5 9 L10 3" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="🏁 ゴール" hint="30日後にどうなっていたい？具体的なほどコースの精度が上がります">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="例: 月3万円の副業収入を作る / 簡単なWebアプリを公開する"
            rows={3}
            style={{ ...inputStyle, resize: 'none', fontFamily: DL.fontJp, lineHeight: 1.5 }}
          />
        </Field>
      </div>

      <div style={{
        position: 'absolute', bottom: 24, left: 16, right: 16, zIndex: 20,
      }}>
        <div style={{ opacity: canSubmit ? 1 : 0.45, pointerEvents: canSubmit ? 'auto' : 'none' }}>
          <PushButton
            color={DL.primary} shadow={DL.primaryShadow} fontSize={16}
            onClick={() => {
              // Prototype: just go back home. Real impl would create a plan.
              navigate('home');
            }}>
            ✨ コースを作成する
          </PushButton>
        </div>
      </div>

      <TabBar active="home" />
    </Phone>
  );
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#fff',
  border: `1.5px solid ${DL.border}`,
  borderRadius: 14,
  padding: '12px 14px',
  fontSize: 14,
  fontWeight: 700,
  color: DL.navy,
  fontFamily: DL.fontJp,
  outline: 'none',
};

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: DL.navy, fontFamily: DL.fontJp, marginBottom: 4 }}>
        {label}
      </div>
      {hint && (
        <div style={{ fontSize: 11, fontWeight: 700, color: DL.slate, fontFamily: DL.fontJp, marginBottom: 10, lineHeight: 1.5 }}>
          {hint}
        </div>
      )}
      {children}
    </div>
  );
}

window.CreateScreen = CreateScreen;

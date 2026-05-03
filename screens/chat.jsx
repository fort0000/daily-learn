// Screen 4 — Chat / Tutor mode
function ChatScreen() {
  const { navigate } = useNav();
  const messages = [
    { from: 'bot', text: '読み終えたね、お疲れさま！3Cで一番気になったところはどこ？' },
    { from: 'user', text: '副業のアイデアはあるけど、競合をどう調べたらいいか分からない' },
    { from: 'bot', text: 'いい質問だね。まず3つの視点で見てみよう:\n\n1️⃣ 同じ問題を解いている人\n2️⃣ 別の方法で解いている人\n3️⃣ 何もしていない人(現状維持)' },
  ];

  const chips = ['自分の場合は?', 'もっと例が欲しい', 'わからない言葉がある'];

  return (
    <Phone bg="#FFFBF5">
      <StatusBar/>
      <div style={{
        padding: '4px 16px 12px', paddingRight: 76,
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: `1px solid ${DL.border}`,
      }}>
        <div onClick={() => navigate('article')} style={{
          width: 38, height: 38, borderRadius: 12,
          background: '#fff', border: `1.5px solid ${DL.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 3 L4 8 L10 13" stroke={DL.navy} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: '#FEF3C7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2px solid ${DL.yellow}`,
          flexShrink: 0,
        }}>
          <Mascot size={36}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: DL.navy, fontFamily: DL.fontJp }}>コーチに聞いてみよう</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: DL.mintDark, fontFamily: DL.fontJp, display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: DL.mint }}/>
            オンライン
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute', top: 70, bottom: 132, left: 0, right: 0,
        overflowY: 'auto',
        backgroundImage: `radial-gradient(circle, #F0E2CD 1px, transparent 1.4px)`,
        backgroundSize: '16px 16px',
        padding: '16px 14px 8px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, color: DL.slateLight, fontFamily: DL.fontJp, letterSpacing: 1 }}>
            ─── 今日のセッション ───
          </div>
          {messages.map((m, i) => <Bubble2 key={i} m={m}/>)}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Mascot size={28}/>
            </div>
            <div style={{
              background: '#fff', borderRadius: '18px 18px 18px 4px',
              padding: '12px 14px', display: 'flex', gap: 4,
              border: `1px solid ${DL.border}`,
            }}>
              <Dot/><Dot d={0.2}/><Dot d={0.4}/>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, padding: '0 14px 10px' }}>
        <div style={{ display: 'flex', gap: 8, overflow: 'hidden', marginBottom: 10, flexWrap: 'nowrap' }}>
          {chips.map((c, i) => (
            <div key={i} style={{
              background: '#fff', border: `1.5px solid ${DL.primary}`,
              borderRadius: 999, padding: '7px 12px',
              fontSize: 11, fontWeight: 800, color: DL.primary,
              fontFamily: DL.fontJp, whiteSpace: 'nowrap',
              boxShadow: `0 2px 0 ${DL.primaryShadow}`,
              cursor: 'pointer',
            }}>
              💬 {c}
            </div>
          ))}
        </div>
        <div style={{
          background: '#fff', borderRadius: 999,
          border: `1.5px solid ${DL.border}`,
          padding: '6px 6px 6px 18px',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 2px 0 #F0E2CD',
        }}>
          <div style={{ flex: 1, fontSize: 13, color: DL.slateLight, fontFamily: DL.fontJp }}>メッセージを入力...</div>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: DL.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 2px 0 ${DL.primaryShadow}`,
            cursor: 'pointer',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 8 L14 2 L10 14 L8 9 Z" fill="#fff"/></svg>
          </div>
        </div>
      </div>

      <TabBar active="home"/>
    </Phone>
  );
}

function Bubble2({ m }) {
  if (m.from === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          background: DL.primary, color: '#fff',
          borderRadius: '18px 18px 4px 18px',
          padding: '10px 14px', maxWidth: '78%',
          fontSize: 13, lineHeight: 1.5, fontFamily: DL.fontJp,
          fontWeight: 600,
          boxShadow: `0 2px 0 ${DL.primaryShadow}`,
        }}>
          {m.text}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Mascot size={28}/>
      </div>
      <div style={{
        background: '#fff', color: DL.navy,
        borderRadius: '18px 18px 18px 4px',
        padding: '10px 14px', maxWidth: '78%',
        fontSize: 13, lineHeight: 1.6, fontFamily: DL.fontJp,
        fontWeight: 600, whiteSpace: 'pre-wrap',
        border: `1px solid ${DL.border}`,
      }}>
        {m.text}
      </div>
    </div>
  );
}

function Dot({ d = 0 }) {
  return <div style={{
    width: 7, height: 7, borderRadius: 999, background: DL.slateLight,
    animation: `dlblink 1.2s ${d}s infinite`,
  }}/>;
}

window.ChatScreen = ChatScreen;

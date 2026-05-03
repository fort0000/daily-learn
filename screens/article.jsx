// Screen 3 — Article reading view
function ArticleScreen() {
  const { navigate } = useNav();
  return (
    <Phone bg="#FFFBF5">
      <StatusBar/>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#F5EDDF', zIndex: 10 }}>
        <div style={{ width: '34%', height: '100%', background: DL.primary }}/>
      </div>
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
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 3 L4 8 L10 13" stroke={DL.navy} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: DL.slateLight, letterSpacing: 1 }}>DAY 12</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: DL.navy, fontFamily: DL.fontJp, marginTop: 1 }}>競合分析の基本</div>
        </div>
      </div>

      <div style={{
        position: 'absolute', top: 70, bottom: 0, left: 0, right: 0,
        overflowY: 'auto',
        padding: '0 18px 100px',
      }}>
        <div style={{
          height: 150, borderRadius: 20,
          background: 'linear-gradient(135deg, #FFE4D1 0%, #FFD4B8 100%)',
          position: 'relative', overflow: 'hidden',
          marginBottom: 18,
        }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 180, height: 110 }}>
              <Bubble c="#FF7A45" label="Customer" x={0} y={20}/>
              <Bubble c="#22C55E" label="Company" x={70} y={0}/>
              <Bubble c="#F97316" label="Competitor" x={140} y={20}/>
            </div>
          </div>
          <div style={{
            position: 'absolute', top: 12, left: 14,
            background: 'rgba(255,255,255,0.85)',
            padding: '4px 10px', borderRadius: 999,
            fontSize: 10, fontWeight: 900, color: DL.fireDark, letterSpacing: 0.5,
          }}>
            FRAMEWORK · 3C
          </div>
        </div>

        <h1 style={{
          fontSize: 24, fontWeight: 900, color: DL.navy,
          fontFamily: DL.fontJp, lineHeight: 1.3, margin: '0 0 8px',
          letterSpacing: -0.3,
        }}>
          競合分析の基本フレームワーク
        </h1>
        <div style={{ fontSize: 12, color: DL.slate, fontFamily: DL.fontJp, marginBottom: 20 }}>
          約10分で読めます · 3つのポイント
        </div>

        <div style={{
          background: '#FFF7ED', borderRadius: 18,
          border: `1.5px solid #FED7AA`,
          padding: '14px 16px', marginBottom: 18,
        }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: DL.fireDark, fontFamily: DL.fontJp, marginBottom: 10 }}>
            📌 今日の3つのポイント
          </div>
          {[
            'Customer(顧客)から始める',
            '自社と競合は「比較」する',
            'スキマを探す視点を持つ',
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', alignItems: 'center' }}>
              <div style={{
                width: 22, height: 22, borderRadius: 999, background: DL.primary,
                color: '#fff', fontSize: 11, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: DL.navy, fontFamily: DL.fontJp, lineHeight: 1.5 }}>{t}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 15, lineHeight: 1.8, color: DL.navy, fontFamily: DL.fontJp, margin: '0 0 14px' }}>
          副業を始めるとき、最初にぶつかる壁は「<strong style={{ background: '#DCFCE7', padding: '0 4px', borderRadius: 4 }}>誰に何を売るか</strong>」です。3Cはこの問いに答える最も基本的な道具です。
        </p>

        <div style={{
          background: '#F0FDF4',
          borderRadius: 14,
          padding: '12px 14px',
          marginBottom: 14,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <div style={{ fontSize: 18 }}>💡</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: DL.navy, fontFamily: DL.fontJp }}>
            <strong>ヒント:</strong> 順番が大事。Customer → Competitor → Company。
          </div>
        </div>

        <p style={{ fontSize: 15, lineHeight: 1.8, color: DL.navy, fontFamily: DL.fontJp, margin: '0 0 14px' }}>
          顧客のニーズを把握せずに競合を見ても意味がありません。まず「困っている人」を…
        </p>

        <div style={{
          background: '#fff',
          borderRadius: 18, padding: '14px 16px',
          border: `1.5px solid ${DL.border}`,
          marginTop: 8,
        }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: DL.navy, fontFamily: DL.fontJp, marginBottom: 8 }}>
            ✅ 今日のアクション
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              border: `2.5px solid ${DL.mint}`,
              flexShrink: 0, marginTop: 1,
            }}/>
            <div style={{ fontSize: 13, color: DL.slate, fontFamily: DL.fontJp, lineHeight: 1.6, fontWeight: 600 }}>
              自分が始めたい副業の「想定顧客」を3人、紙に書き出してみる。
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => navigate('chat')}
            style={{
              width: '100%',
              background: '#fff',
              border: `1.5px solid ${DL.border}`,
              borderRadius: 18,
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
              cursor: 'pointer',
              fontFamily: DL.fontJp,
              textAlign: 'left',
              boxShadow: '0 3px 0 #F0E2CD',
            }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: DL.mint,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 0 #0F7A38',
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <path d="M3 5 Q3 3 5 3 H17 Q19 3 19 5 V13 Q19 15 17 15 H10 L6 19 V15 H5 Q3 15 3 13 Z" fill="#fff"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: DL.navy }}>わからないところを質問</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: DL.slate, marginTop: 2 }}>
                AIコーチに今すぐ聞く →
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M7 4 L13 10 L7 16" stroke={DL.mintDark} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 24, left: 16, right: 16, zIndex: 20,
      }}>
        <PushButton color={DL.mint} shadow={DL.mintShadow} fontSize={16} onClick={() => navigate('home')}>
          ✓ 読み終わった!
        </PushButton>
      </div>

      <TabBar active="home"/>
    </Phone>
  );
}

function Bubble({ c, label, x, y }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      width: 64, height: 64, borderRadius: '50%',
      background: c, opacity: 0.85,
      border: '3px solid #fff',
      color: '#fff', fontSize: 10, fontWeight: 900,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', lineHeight: 1.1,
    }}>
      {label}
    </div>
  );
}

window.ArticleScreen = ArticleScreen;

// Screen 5 — Profile / Stats
function ProfileScreen() {
  const stats = [
    { label: '総学習日数', value: '47', unit: '日', color: DL.primary, bg: '#FFEDD5' },
    { label: '完了レッスン', value: '38', unit: '本', color: DL.mintDark, bg: '#DCFCE7' },
    { label: '学んだトピック', value: '24', unit: '件', color: '#7C3AED', bg: '#EDE9FE' },
    { label: '解いたクイズ', value: '142', unit: '問', color: '#0EA5E9', bg: '#E0F2FE' },
  ];
  const badges = [
    { icon: '🎯', label: '目標設定', unlocked: true, color: DL.primary },
    { icon: '🔥', label: '7日連続', unlocked: true, color: DL.fire },
    { icon: '📚', label: '初学習', unlocked: true, color: DL.mint },
    { icon: '💎', label: '30日達成', unlocked: false },
    { icon: '🏆', label: '90日完走', unlocked: false },
  ];

  const heatColors = ['#F5EDDF', '#FED7AA', '#FDBA74', '#FB923C', '#EA580C'];

  return (
    <Phone>
      <StatusBar/>
      <div style={{
        position: 'absolute', top: 16, bottom: 0, left: 0, right: 0,
        overflowY: 'auto',
        paddingBottom: 24,
      }}>
        <div style={{ padding: '4px 20px 0', paddingRight: 76, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: '#FEF3C7',
            border: `3px solid ${DL.yellow}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Mascot size={48}/>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: DL.navy, fontFamily: DL.fontJp }}>たけし</div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              marginTop: 4, padding: '3px 9px',
              background: 'linear-gradient(90deg, #FACC15, #F59E0B)',
              borderRadius: 999,
              fontSize: 11, fontWeight: 900, color: '#78350F',
              fontFamily: DL.fontJp,
            }}>
              ⭐ Lv.5 学習者
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 20px 0' }}>
          <div style={{
            background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
            borderRadius: 22,
            border: `1.5px solid #FED7AA`,
            padding: '16px 18px',
            display: 'flex', alignItems: 'center', gap: 14,
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 3px 0 #F0E2CD',
          }}>
            <Flame size={62}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: DL.fireDark, letterSpacing: 1, fontFamily: DL.fontJp }}>
                連続記録
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: DL.fire, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>12</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: DL.slate, fontFamily: DL.fontJp }}>日連続</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: DL.slate, fontFamily: DL.fontJp, marginTop: 4 }}>
                最長記録 <span style={{ color: DL.navy, fontWeight: 900 }}>28日</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 20px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {stats.map((s, i) => (
              <div key={i} style={{
                background: s.bg, borderRadius: 16, padding: '12px 14px',
                border: `1.5px solid ${s.color}30`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: DL.slate, fontFamily: DL.fontJp }}>{s.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: s.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: DL.slate, fontFamily: DL.fontJp }}>{s.unit}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '14px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: DL.navy, fontFamily: DL.fontJp }}>バッジ</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: DL.primary, fontFamily: DL.fontJp }}>3 / 12 →</div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            {badges.map((b, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: b.unlocked ? '#fff' : '#F5EDDF',
                  border: `2px solid ${b.unlocked ? (b.color || DL.primary) : '#E5DCC8'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24,
                  opacity: b.unlocked ? 1 : 0.4,
                  filter: b.unlocked ? 'none' : 'grayscale(1)',
                  boxShadow: b.unlocked ? `0 3px 0 ${b.color || DL.primary}40` : 'none',
                }}>
                  {b.unlocked ? b.icon : '🔒'}
                </div>
                <div style={{ fontSize: 9, fontWeight: 800, color: b.unlocked ? DL.navy : DL.slateLight, fontFamily: DL.fontJp, textAlign: 'center' }}>
                  {b.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '14px 20px 0' }}>
          <div style={{
            background: '#fff', borderRadius: 18, padding: '12px 14px',
            border: `1.5px solid ${DL.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: DL.navy, fontFamily: DL.fontJp }}>過去12週間</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: DL.slateLight, fontFamily: DL.fontJp }}>少 → 多</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
              {Array.from({ length: 12 * 7 }).map((_, i) => {
                const lvl = [0,0,1,2,1,3,2,4,3,2,4,3,1,2,3,4,2,3,4,3,2,4,3,4][i % 24];
                return (
                  <div key={i} style={{
                    aspectRatio: '1',
                    background: heatColors[lvl],
                    borderRadius: 3,
                  }}/>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <TabBar active="profile"/>
    </Phone>
  );
}

window.ProfileScreen = ProfileScreen;

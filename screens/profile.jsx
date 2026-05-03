// Screen 5 — Profile / Stats
function SettingsSection({ title, children }) {
  const arr = React.Children.toArray(children);
  return (
    <div style={{ padding: '20px 20px 0' }}>
      <div style={{
        fontSize: 11, fontWeight: 900, color: DL.slateLight, fontFamily: DL.fontJp,
        letterSpacing: 1, marginBottom: 6, paddingLeft: 4,
      }}>
        {title}
      </div>
      <div style={{
        background: '#fff', borderRadius: 16,
        border: `1.5px solid ${DL.border}`,
        overflow: 'hidden',
      }}>
        {arr.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div style={{ height: 1, background: DL.divider, marginLeft: 14 }} />}
            {child}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function SettingsRow({ label, value, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
      cursor: 'pointer',
    }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: DL.navy, fontFamily: DL.fontJp }}>{label}</div>
      <div style={{ flex: 1 }} />
      {value && (
        <div style={{ fontSize: 12, fontWeight: 700, color: DL.slate, fontFamily: DL.fontJp }}>{value}</div>
      )}
      <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
        <path d="M1.5 1.5 L6 6 L1.5 10.5" stroke={DL.slateLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function ProfileScreen() {
  const { navigate } = useNav();
  const stats = [
    { label: '総学習日数', value: '47', unit: '日', color: DL.primary, bg: '#FFEDD5' },
    { label: '完了レッスン', value: '38', unit: '本', color: DL.mintDark, bg: '#DCFCE7' },
  ];
  const badges = [
    { icon: '🎯', label: '目標設定', unlocked: true, color: DL.primary },
    { icon: '🔥', label: '7日連続', unlocked: true, color: DL.fire },
    { icon: '📚', label: '初学習', unlocked: true, color: DL.mint },
    { icon: '💎', label: '30日達成', unlocked: false },
    { icon: '🏆', label: '90日達成', unlocked: false },
  ];

  return (
    <Phone>
      <StatusBar />
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
            <Mascot size={48} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: DL.navy, fontFamily: DL.fontJp }}>たけし</div>
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
            <Flame size={62} />
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

        <SettingsSection title="アカウント">
          <SettingsRow label="プロフィール" value="名前・メール・パスワード" onClick={() => navigate('account')} />
        </SettingsSection>

        <SettingsSection title="サブスクリプション">
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              padding: '4px 10px', borderRadius: 999,
              background: 'linear-gradient(90deg, #FACC15, #F59E0B)',
              fontSize: 11, fontWeight: 900, color: '#78350F', fontFamily: DL.fontJp,
            }}>
              無料プラン
            </div>
            <div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: DL.slate, fontFamily: DL.fontJp }}>
              1日1レッスン
            </div>
            <div style={{ fontSize: 12, fontWeight: 900, color: DL.primary, fontFamily: DL.fontJp }}>変更 →</div>
          </div>
        </SettingsSection>

        <SettingsSection title="その他">
          <SettingsRow label="利用規約" />
          <SettingsRow label="プライバシーポリシー" />
        </SettingsSection>

        <div style={{ padding: '20px 20px 0' }}>
          <div style={{
            padding: '14px',
            borderRadius: 14,
            border: `1.5px solid #FECACA`,
            background: '#fff',
            textAlign: 'center',
            fontSize: 13, fontWeight: 900, color: '#DC2626', fontFamily: DL.fontJp,
            cursor: 'pointer',
          }}>
            ログアウト
          </div>
        </div>

      </div>

      <TabBar active="profile" />
    </Phone>
  );
}

window.ProfileScreen = ProfileScreen;

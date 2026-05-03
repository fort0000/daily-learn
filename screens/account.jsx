// Screen 7 — Account / Login info edit (single page for name, email, password)
function AccountScreen() {
  const { navigate } = useNav();
  const [name, setName] = React.useState('たけし');
  const [email, setEmail] = React.useState('unilab23f@gmail.com');
  const [currentPw, setCurrentPw] = React.useState('');
  const [newPw, setNewPw] = React.useState('');
  const [confirmPw, setConfirmPw] = React.useState('');

  const pwTouched = currentPw.length > 0 || newPw.length > 0 || confirmPw.length > 0;
  const pwValid = !pwTouched || (currentPw.length >= 8 && newPw.length >= 8 && newPw === confirmPw);
  const canSave = name.trim().length > 0 && email.includes('@') && pwValid;

  return (
    <Phone>
      <StatusBar/>
      <div style={{
        padding: '8px 16px 12px', paddingRight: 76,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div onClick={() => navigate('profile')} style={{
          width: 38, height: 38, borderRadius: 12,
          background: '#fff', border: `1.5px solid ${DL.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 3 L4 8 L10 13" stroke={DL.navy} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: DL.slateLight, letterSpacing: 1 }}>ACCOUNT</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: DL.navy, fontFamily: DL.fontJp, marginTop: 1 }}>アカウント情報</div>
        </div>
      </div>

      <div style={{
        position: 'absolute', top: 70, bottom: 0, left: 0, right: 0,
        overflowY: 'auto',
        padding: '4px 20px 120px',
      }}>
        <AccountField label="名前">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="表示名"
            style={accountInputStyle}
          />
        </AccountField>

        <AccountField label="メールアドレス" hint="ログインに使うメールアドレス">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={accountInputStyle}
          />
        </AccountField>

        <div style={{
          marginTop: 6, marginBottom: 14,
          fontSize: 11, fontWeight: 800, color: DL.slateLight,
          fontFamily: DL.fontJp, letterSpacing: 1, paddingLeft: 4,
        }}>
          パスワード変更（任意）
        </div>

        <AccountField label="現在のパスワード">
          <input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            placeholder="••••••••"
            style={accountInputStyle}
          />
        </AccountField>

        <AccountField label="新しいパスワード" hint="8文字以上">
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="••••••••"
            style={accountInputStyle}
          />
        </AccountField>

        <AccountField label="新しいパスワード（確認）">
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="••••••••"
            style={{
              ...accountInputStyle,
              border: `1.5px solid ${pwTouched && confirmPw && newPw !== confirmPw ? '#FCA5A5' : DL.border}`,
            }}
          />
          {pwTouched && confirmPw && newPw !== confirmPw && (
            <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', fontFamily: DL.fontJp, marginTop: 6 }}>
              新しいパスワードが一致しません
            </div>
          )}
        </AccountField>
      </div>

      <div style={{
        position: 'absolute', bottom: 24, left: 16, right: 16, zIndex: 20,
      }}>
        <div style={{ opacity: canSave ? 1 : 0.45, pointerEvents: canSave ? 'auto' : 'none' }}>
          <PushButton
            color={DL.primary} shadow={DL.primaryShadow} fontSize={16}
            onClick={() => navigate('profile')}>
            保存する
          </PushButton>
        </div>
      </div>

      <TabBar active="profile"/>
    </Phone>
  );
}

const accountInputStyle = {
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

function AccountField({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: DL.navy, fontFamily: DL.fontJp, marginBottom: 6 }}>
        {label}
      </div>
      {children}
      {hint && (
        <div style={{ fontSize: 11, fontWeight: 700, color: DL.slate, fontFamily: DL.fontJp, marginTop: 6, lineHeight: 1.5 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

window.AccountScreen = AccountScreen;

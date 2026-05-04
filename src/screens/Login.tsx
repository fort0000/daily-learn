import { useState, type ReactNode } from 'react';
import { DL } from '../lib/dl';
import { Phone } from '../components/Phone';
import { StatusBar } from '../components/StatusBar';
import { PushButton } from '../components/PushButton';
import { AppIcon } from '../components/AppIcon';
import {
  signInWithOAuth,
  signInWithPassword,
  signUpWithPassword,
  type OAuthProvider,
} from '../lib/auth';

type Mode = 'signin' | 'signup';

const inputClass =
  'w-full box-border bg-white border-[1.5px] border-dl-border rounded-2xl px-3.5 py-3 text-sm font-bold text-dl-navy font-jp outline-none';

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pending, setPending] = useState<null | 'email' | OAuthProvider>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const passwordValid = password.length >= 8;
  const emailValid = email.includes('@');
  const nameValid = mode === 'signin' || displayName.trim().length > 0;
  const canSubmit = emailValid && passwordValid && nameValid && pending === null;

  const handleEmailSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setInfo(null);
    setPending('email');
    try {
      if (mode === 'signin') {
        const { error } = await signInWithPassword(email, password);
        if (error) throw error;
      } else {
        const { data, error } = await signUpWithPassword(
          email,
          password,
          displayName.trim(),
        );
        if (error) throw error;
        if (!data.session) {
          setInfo('確認メールを送信しました。メール内のリンクから登録を完了してください。');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setPending(null);
    }
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    setError(null);
    setInfo(null);
    setPending(provider);
    try {
      const { error } = await signInWithOAuth(provider);
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインを開始できませんでした');
      setPending(null);
    }
  };

  return (
    <Phone>
      <StatusBar />
      <div className="absolute top-4 bottom-0 left-0 right-0 overflow-y-auto px-5 pb-8">
        <div className="pt-2 flex flex-col items-center gap-2">
          <AppIcon size={72} />

          <div className="text-[10px] font-extrabold text-dl-slate-light tracking-[0.18em]">
            DAILY LEARN
          </div>
          <div className="text-[20px] font-black text-dl-navy font-jp">
            {mode === 'signin' ? 'ログイン' : '新規登録'}
          </div>
          <div className="text-[12px] font-bold text-dl-slate font-jp text-center leading-[1.6]">
            {mode === 'signin'
              ? 'メールまたはソーシャルアカウントで続ける'
              : 'メールアドレスで新しいアカウントを作る'}
          </div>
        </div>

        <div className="pt-6 flex flex-col gap-2.5">
          <OAuthButton
            label="Google で続ける"
            color="#fff"
            fg={DL.navy}
            border="#E5DCC8"
            onClick={() => handleOAuth('google')}
            disabled={pending !== null}
            icon={<GoogleMark />}
          />
          <OAuthButton
            label="GitHub で続ける"
            color="#1F2937"
            fg="#fff"
            border="#1F2937"
            onClick={() => handleOAuth('github')}
            disabled={pending !== null}
            icon={<GithubMark />}
          />
        </div>

        <div className="pt-5 flex items-center gap-2.5">
          <div className="flex-1 h-px bg-dl-divider" />
          <div className="text-[10px] font-extrabold text-dl-slate-light font-jp tracking-wider">
            またはメールで
          </div>
          <div className="flex-1 h-px bg-dl-divider" />
        </div>

        <div className="pt-4 flex flex-col gap-2.5">
          {mode === 'signup' && (
            <Field label="表示名">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="たけし"
                className={inputClass}
              />
            </Field>
          )}
          <Field label="メールアドレス">
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </Field>
          <Field label="パスワード" hint="8文字以上">
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </Field>
        </div>

        {error && (
          <div className="mt-3 px-3.5 py-2.5 rounded-2xl border-[1.5px] border-[#FCA5A5] bg-[#FEF2F2] text-[12px] font-bold text-[#B91C1C] font-jp leading-[1.5]">
            {error}
          </div>
        )}
        {info && (
          <div className="mt-3 px-3.5 py-2.5 rounded-2xl border-[1.5px] border-[#FED7AA] bg-[#FFF7ED] text-[12px] font-bold text-[#9A3412] font-jp leading-[1.5]">
            {info}
          </div>
        )}

        <div className="pt-5">
          <div
            className={`${canSubmit ? 'opacity-100 pointer-events-auto' : 'opacity-45 pointer-events-none'}`}
          >
            <PushButton
              color={DL.primary}
              shadow={DL.primaryShadow}
              fontSize={16}
              onClick={handleEmailSubmit}
            >
              {pending === 'email'
                ? '通信中…'
                : mode === 'signin'
                  ? 'ログイン'
                  : '新規登録'}
            </PushButton>
          </div>
        </div>

        <div className="pt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setInfo(null);
            }}
            className="text-[12px] font-extrabold text-dl-primary font-jp"
          >
            {mode === 'signin'
              ? 'アカウントを作成する →'
              : '← 既にアカウントをお持ちの方'}
          </button>
        </div>
      </div>
    </Phone>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-black text-dl-navy font-jp mb-1.5">{label}</div>
      {children}
      {hint && (
        <div className="text-[11px] font-bold text-dl-slate font-jp mt-1 leading-[1.5]">
          {hint}
        </div>
      )}
    </div>
  );
}

function OAuthButton({
  label,
  color,
  fg,
  border,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  color: string;
  fg: string;
  border: string;
  icon: ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-full px-5 h-[52px] flex items-center justify-center gap-2.5 font-extrabold font-jp text-[14px] disabled:opacity-50"
      style={{
        background: color,
        color: fg,
        border: `1.5px solid ${border}`,
      }}
    >
      <span className="w-[18px] h-[18px] flex items-center justify-center">{icon}</span>
      {label}
    </button>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.79 2.72v2.26h2.9c1.7-1.56 2.69-3.87 2.69-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.96A8.997 8.997 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A8.997 8.997 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}

function GithubMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="#fff">
      <path
        fillRule="evenodd"
        d="M9 0a9 9 0 0 0-2.85 17.54c.45.08.61-.2.61-.43 0-.21-.01-.91-.01-1.65-2.23.41-2.81-.54-2.99-1.04-.1-.26-.54-1.04-.93-1.25-.32-.17-.78-.59-.01-.6.72-.01 1.24.66 1.41.94.83 1.39 2.15.99 2.68.76.08-.6.32-1 .59-1.23-2.07-.23-4.24-1.04-4.24-4.61 0-1.02.36-1.85.95-2.51-.1-.23-.41-1.18.09-2.45 0 0 .77-.25 2.53.95.74-.21 1.53-.31 2.32-.31.79 0 1.58.1 2.32.31 1.76-1.2 2.53-.95 2.53-.95.5 1.27.18 2.22.09 2.45.59.66.95 1.49.95 2.51 0 3.59-2.18 4.38-4.26 4.61.34.29.63.85.63 1.72 0 1.24-.01 2.24-.01 2.55 0 .23.17.51.62.43A9 9 0 0 0 9 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

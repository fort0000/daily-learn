import { useState, type ReactNode } from 'react';
import { DL } from '../lib/dl';
import { useNav } from '../lib/nav';
import { Phone } from '../components/Phone';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { PushButton } from '../components/PushButton';

const inputClass =
  'w-full box-border bg-white border-[1.5px] border-dl-border rounded-2xl px-3.5 py-3 text-sm font-bold text-dl-navy font-jp outline-none';

export function AccountScreen() {
  const { navigate } = useNav();
  const [name, setName] = useState('たけし');
  const [email, setEmail] = useState('unilab23f@gmail.com');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const pwTouched = currentPw.length > 0 || newPw.length > 0 || confirmPw.length > 0;
  const pwValid = !pwTouched || (currentPw.length >= 8 && newPw.length >= 8 && newPw === confirmPw);
  const canSave = name.trim().length > 0 && email.includes('@') && pwValid;
  const confirmMismatch = pwTouched && confirmPw && newPw !== confirmPw;

  return (
    <Phone>
      <StatusBar />
      <div className="pt-2 px-4 pb-3 pr-[76px] flex items-center gap-2.5">
        <div
          onClick={() => navigate('profile')}
          className="w-[38px] h-[38px] rounded-xl bg-white border-[1.5px] border-dl-border flex items-center justify-center cursor-pointer shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path
              d="M10 3 L4 8 L10 13"
              stroke={DL.navy}
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-[10px] font-extrabold text-dl-slate-light tracking-wider">PROFILE</div>
          <div className="text-[13px] font-black text-dl-navy font-jp mt-px">プロフィール</div>
        </div>
      </div>

      <div className="absolute top-[70px] bottom-0 left-0 right-0 overflow-y-auto pt-1 px-5 pb-[120px]">
        <AccountField label="名前">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="表示名"
            className={inputClass}
          />
        </AccountField>

        <AccountField label="メールアドレス" hint="ログインに使うメールアドレス">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </AccountField>

        <div className="mt-1.5 mb-3.5 text-[11px] font-extrabold text-dl-slate-light font-jp tracking-wider pl-1">
          パスワード変更（任意）
        </div>

        <AccountField label="現在のパスワード">
          <input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
          />
        </AccountField>

        <AccountField label="新しいパスワード" hint="8文字以上">
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
          />
        </AccountField>

        <AccountField label="新しいパスワード（確認）">
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="••••••••"
            className={`w-full box-border bg-white rounded-2xl px-3.5 py-3 text-sm font-bold text-dl-navy font-jp outline-none border-[1.5px] ${confirmMismatch ? 'border-[#FCA5A5]' : 'border-dl-border'
              }`}
          />
          {confirmMismatch && (
            <div className="text-[11px] font-bold text-[#DC2626] font-jp mt-1.5">
              新しいパスワードが一致しません
            </div>
          )}
        </AccountField>
      </div>

      <div className="absolute bottom-6 left-4 right-4 z-20">
        <div
          className={`${canSave ? 'opacity-100 pointer-events-auto' : 'opacity-45 pointer-events-none'}`}
        >
          <PushButton color={DL.primary} shadow={DL.primaryShadow} fontSize={16} onClick={() => navigate('profile')}>
            保存する
          </PushButton>
        </div>
      </div>

      <TabBar active="profile" />
    </Phone>
  );
}

function AccountField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <div className="text-xs font-black text-dl-navy font-jp mb-1.5">{label}</div>
      {children}
      {hint && (
        <div className="text-[11px] font-bold text-dl-slate font-jp mt-1.5 leading-[1.5]">{hint}</div>
      )}
    </div>
  );
}

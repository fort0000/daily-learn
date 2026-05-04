import { useEffect, useState, type ReactNode } from 'react';
import { DL } from '../lib/dl';
import { useNav } from '../lib/nav';
import { Phone } from '../components/Phone';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { PushButton } from '../components/PushButton';
import {
  reauthenticateWithPassword,
  updateAuthEmail,
  updateAuthPassword,
  updateProfileDisplayName,
  useProfile,
  useSession,
} from '../lib/auth';

const inputClass =
  'w-full box-border bg-white border-[1.5px] border-dl-border rounded-2xl px-3.5 py-3 text-sm font-bold text-dl-navy font-jp outline-none';

export function AccountScreen() {
  const { navigate } = useNav();
  const session = useSession();
  const userId = session.session?.user.id ?? null;
  const sessionEmail = session.session?.user.email ?? '';
  const { profile } = useProfile(userId);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setName(profile.display_name);
  }, [profile]);

  useEffect(() => {
    if (sessionEmail) setEmail(sessionEmail);
  }, [sessionEmail]);

  const pwTouched = currentPw.length > 0 || newPw.length > 0 || confirmPw.length > 0;
  const pwValid =
    !pwTouched || (currentPw.length >= 8 && newPw.length >= 8 && newPw === confirmPw);
  const canSave =
    name.trim().length > 0 && email.includes('@') && pwValid && !saving && !!userId;
  const confirmMismatch = pwTouched && confirmPw && newPw !== confirmPw;

  const handleSave = async () => {
    if (!canSave || !userId || !profile) return;
    setError(null);
    setInfo(null);
    setSaving(true);
    const messages: string[] = [];
    try {
      if (name.trim() !== profile.display_name) {
        await updateProfileDisplayName(userId, name.trim());
      }

      if (email.trim() && email.trim() !== sessionEmail) {
        const { error } = await updateAuthEmail(email.trim());
        if (error) throw error;
        messages.push(
          'メールアドレスの変更には新旧両方への確認メールを送りました。リンクをクリックすると反映されます。',
        );
      }

      if (pwTouched) {
        const reauth = await reauthenticateWithPassword(currentPw);
        if (reauth.error) throw reauth.error;
        const { error } = await updateAuthPassword(newPw);
        if (error) throw error;
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
        messages.push('パスワードを更新しました。');
      }

      if (messages.length === 0) {
        navigate('profile');
        return;
      }
      setInfo(messages.join(' '));
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

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

        <AccountField
          label="メールアドレス"
          hint="変更すると確認メールが届きます。リンクをクリックするまで反映されません。"
        >
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
      </div>

      <div className="absolute bottom-6 left-4 right-4 z-20">
        <div
          className={`${canSave ? 'opacity-100 pointer-events-auto' : 'opacity-45 pointer-events-none'}`}
        >
          <PushButton color={DL.primary} shadow={DL.primaryShadow} fontSize={16} onClick={handleSave}>
            {saving ? '保存中…' : '保存する'}
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

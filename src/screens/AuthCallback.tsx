import { useEffect, useState } from 'react';
import { DL } from '../lib/dl';
import { Phone } from '../components/Phone';
import { StatusBar } from '../components/StatusBar';
import { AppIcon } from '../components/AppIcon';
import { supabase } from '../lib/supabase';

const STUCK_TIMEOUT_MS = 10_000;

export function AuthCallbackScreen() {
  const [stuck, setStuck] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const errorDesc =
      url.searchParams.get('error_description') ?? url.searchParams.get('error');
    if (errorDesc) {
      setError(errorDesc);
      return;
    }

    const code = url.searchParams.get('code');
    if (code) {
      // supabase-js may auto-exchange via detectSessionInUrl; calling again
      // can race or yield a "code already used" error. Try our exchange, then
      // verify via getSession before surfacing an error.
      supabase.auth.exchangeCodeForSession(window.location.href).then(async ({ error }) => {
        if (!error) return;
        const { data } = await supabase.auth.getSession();
        if (!data.session) setError(error.message);
      });
    }

    const timer = setTimeout(() => setStuck(true), STUCK_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const restart = () => {
    window.history.replaceState({}, document.title, '/');
    window.location.reload();
  };

  return (
    <Phone>
      <StatusBar />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <AppIcon size={72} />
        {error ? (
          <>
            <div className="text-[14px] font-black text-[#B91C1C] font-jp">
              ログインに失敗しました
            </div>
            <div className="text-[12px] font-bold text-dl-slate font-jp leading-[1.6]">
              {error}
            </div>
            <button
              type="button"
              onClick={restart}
              className="mt-2 text-[12px] font-extrabold font-jp"
              style={{ color: DL.primary }}
            >
              ログイン画面に戻る
            </button>
          </>
        ) : stuck ? (
          <>
            <div className="text-[14px] font-black text-dl-navy font-jp">
              時間がかかっています
            </div>
            <div className="text-[12px] font-bold text-dl-slate font-jp leading-[1.6]">
              ページを再読み込みするか、ログイン画面からやり直してください。
            </div>
            <button
              type="button"
              onClick={restart}
              className="mt-2 text-[12px] font-extrabold font-jp"
              style={{ color: DL.primary }}
            >
              ログイン画面に戻る
            </button>
          </>
        ) : (
          <>
            <div className="text-[14px] font-black text-dl-navy font-jp">
              ログイン処理中…
            </div>
            <div className="text-[12px] font-bold text-dl-slate font-jp leading-[1.6]">
              数秒お待ちください。
            </div>
          </>
        )}
      </div>
    </Phone>
  );
}

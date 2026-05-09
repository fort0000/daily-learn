import { Link } from 'react-router-dom';
import { useSession } from '../lib/auth';
import { AppIcon } from '../components/AppIcon';

// TODO: 本格的な LP リニューアル予定。現状はプレースホルダ実装。
export function LandingScreen() {
  const session = useSession();
  const isSignedIn = session.status === 'signed-in';

  return (
    <div className="w-full h-full bg-dl-bg overflow-y-auto">
      <div className="max-w-[560px] mx-auto px-6 pt-16 pb-12 flex flex-col items-center text-center">
        <AppIcon size={96} rounded="rounded-[28px]" />
        <h1 className="mt-6 text-[28px] font-black text-dl-navy font-jp leading-tight">
          DailyLearn
        </h1>
        <p className="mt-3 text-[15px] font-bold text-dl-slate font-jp leading-relaxed">
          毎日10分のマイクロ学習で、
          <br />
          知りたいことを30日間でやりきる。
        </p>

        <div className="mt-10 flex flex-col gap-3 w-full max-w-[320px]">
          {isSignedIn ? (
            <Link
              to="/home"
              className="block w-full py-3.5 rounded-[14px] bg-dl-primary text-white font-black text-[15px] font-jp shadow-[0_3px_0_#C8431A] active:translate-y-[1px] active:shadow-[0_2px_0_#C8431A] transition-transform"
            >
              アプリを開く
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="block w-full py-3.5 rounded-[14px] bg-dl-primary text-white font-black text-[15px] font-jp shadow-[0_3px_0_#C8431A] active:translate-y-[1px] active:shadow-[0_2px_0_#C8431A] transition-transform"
              >
                無料で始める
              </Link>
              <Link
                to="/login"
                className="block w-full py-3.5 rounded-[14px] bg-white border-[1.5px] border-dl-border text-dl-navy font-black text-[15px] font-jp"
              >
                ログイン
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { DL } from '../lib/dl';
import { useNav } from '../lib/nav';
import { Phone } from '../components/Phone';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { PushButton } from '../components/PushButton';

export function ArticleScreen() {
  const { navigate } = useNav();
  return (
    <Phone bg="#FFFBF5">
      <StatusBar />
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#F5EDDF] z-10">
        <div className="w-[34%] h-full bg-dl-primary" />
      </div>
      <div className="pt-2 px-4 pb-3 pr-[76px] flex items-center gap-2.5">
        <div
          onClick={() => navigate('home')}
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
          <div className="text-[10px] font-extrabold text-dl-slate-light tracking-wider">DAY 12</div>
          <div className="text-[13px] font-black text-dl-navy font-jp mt-px">競合分析の基本</div>
        </div>
      </div>

      <div className="absolute top-[70px] bottom-0 left-0 right-0 overflow-y-auto px-[18px] pb-8">
        <div className="h-[150px] rounded-[20px] relative overflow-hidden mb-[18px] bg-gradient-to-br from-[#FFE4D1] to-[#FFD4B8]">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-[180px] h-[110px]">
              <Bubble c="#FF7A45" label="Customer" x={0} y={20} />
              <Bubble c="#22C55E" label="Company" x={70} y={0} />
              <Bubble c="#F97316" label="Competitor" x={140} y={20} />
            </div>
          </div>
          <div className="absolute top-3 left-3.5 bg-white/85 px-2.5 py-1 rounded-full text-[10px] font-black text-dl-fire-dark tracking-[0.5px]">
            FRAMEWORK · 3C
          </div>
        </div>

        <h1 className="text-2xl font-black text-dl-navy font-jp leading-[1.3] mt-0 mx-0 mb-2 tracking-[-0.3px]">
          競合分析の基本フレームワーク
        </h1>
        <div className="text-xs text-dl-slate font-jp mb-5">約10分で読めます · 3つのポイント</div>

        <div className="bg-[#FFF7ED] rounded-[18px] border-[1.5px] border-[#FED7AA] px-4 py-3.5 mb-[18px]">
          <div className="text-[13px] font-black text-dl-fire-dark font-jp mb-2.5">
            📌 今日の3つのポイント
          </div>
          {['Customer(顧客)から始める', '自社と競合は「比較」する', 'スキマを探す視点を持つ'].map((t, i) => (
            <div key={i} className="flex gap-2.5 py-1.5 items-center">
              <div className="w-[22px] h-[22px] rounded-full bg-dl-primary text-white text-[11px] font-black flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <div className="text-[13px] font-bold text-dl-navy font-jp leading-[1.5]">{t}</div>
            </div>
          ))}
        </div>

        <p className="text-[15px] leading-[1.8] text-dl-navy font-jp mt-0 mx-0 mb-3.5">
          副業を始めるとき、最初にぶつかる壁は「
          <strong className="bg-[#DCFCE7] px-1 rounded">誰に何を売るか</strong>
          」です。3Cはこの問いに答える最も基本的な道具です。
        </p>

        <div className="bg-[#F0FDF4] rounded-2xl px-3.5 py-3 mb-3.5 flex gap-2.5 items-start">
          <div className="text-lg">💡</div>
          <div className="text-[13px] leading-[1.6] text-dl-navy font-jp">
            <strong>ヒント:</strong> 順番が大事。Customer → Competitor → Company。
          </div>
        </div>

        <p className="text-[15px] leading-[1.8] text-dl-navy font-jp mt-0 mx-0 mb-3.5">
          顧客のニーズを把握せずに競合を見ても意味がありません。まず「困っている人」を…
        </p>

        <div className="bg-white rounded-[18px] px-4 py-3.5 border-[1.5px] border-dl-border mt-2">
          <div className="text-[13px] font-black text-dl-navy font-jp mb-2">✅ 今日のアクション</div>
          <div className="flex gap-2.5 items-start">
            <div className="w-[22px] h-[22px] rounded-md border-[2.5px] border-dl-mint shrink-0 mt-px" />
            <div className="text-[13px] text-dl-slate font-jp leading-[1.6] font-semibold">
              自分が始めたい副業の「想定顧客」を3人、紙に書き出してみる。
            </div>
          </div>
        </div>

        <div className="mt-7">
          <PushButton color={DL.mint} shadow={DL.mintShadow} fontSize={16} onClick={() => navigate('home')}>
            ✓ 読み終わった!
          </PushButton>
        </div>
      </div>

      <div
        onClick={() => navigate('chat')}
        title="AIコーチに質問"
        className="absolute bottom-6 right-[18px] z-25 w-[58px] h-[58px] rounded-full bg-dl-mint flex items-center justify-center cursor-pointer shadow-[0_5px_0_#0F7A38,0_10px_24px_rgba(15,23,42,0.18)]"
      >
        <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
          <path d="M3 5 Q3 3 5 3 H17 Q19 3 19 5 V13 Q19 15 17 15 H10 L6 19 V15 H5 Q3 15 3 13 Z" fill="#fff" />
        </svg>
      </div>

      <TabBar active="home" />
    </Phone>
  );
}

type BubbleProps = { c: string; label: string; x: number; y: number };

function Bubble({ c, label, x, y }: BubbleProps) {
  return (
    <div
      className="absolute w-16 h-16 rounded-full opacity-85 border-[3px] border-white text-white text-[10px] font-black flex items-center justify-center text-center leading-[1.1]"
      style={{ left: x, top: y, background: c }}
    >
      {label}
    </div>
  );
}

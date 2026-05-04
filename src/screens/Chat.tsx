import { DL } from '../lib/dl';
import { useNav } from '../lib/nav';
import { Phone } from '../components/Phone';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { Mascot } from '../components/Mascot';

type Message = { from: 'bot' | 'user'; text: string };

export function ChatScreen() {
  const { navigate } = useNav();
  const messages: Message[] = [
    { from: 'bot', text: '読み終えたね、お疲れさま！3Cで一番気になったところはどこ？' },
    { from: 'user', text: '副業のアイデアはあるけど、競合をどう調べたらいいか分からない' },
    {
      from: 'bot',
      text: 'いい質問だね。まず3つの視点で見てみよう:\n\n1️⃣ 同じ問題を解いている人\n2️⃣ 別の方法で解いている人\n3️⃣ 何もしていない人(現状維持)',
    },
  ];

  const chips = ['自分の場合は?', 'もっと例が欲しい', 'わからない言葉がある'];

  return (
    <Phone bg="#FFFBF5">
      <StatusBar />
      <div className="pt-1 px-4 pb-3 pr-[76px] flex items-center gap-3 border-b border-dl-border">
        <div
          onClick={() => navigate('article')}
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
        <div className="w-11 h-11 rounded-full bg-[#FEF3C7] flex items-center justify-center border-2 border-dl-yellow shrink-0">
          <Mascot size={36} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black text-dl-navy font-jp">コーチに聞いてみよう</div>
          <div className="text-[11px] font-bold text-dl-mint-dark font-jp flex items-center gap-1 mt-px">
            <span className="w-1.5 h-1.5 rounded-full bg-dl-mint" />
            オンライン
          </div>
        </div>
      </div>

      <div
        className="absolute top-[70px] bottom-[132px] left-0 right-0 overflow-y-auto px-3.5 pt-4 pb-2"
        style={{
          backgroundImage: `radial-gradient(circle, #F0E2CD 1px, transparent 1.4px)`,
          backgroundSize: '16px 16px',
        }}
      >
        <div className="flex flex-col gap-3">
          <div className="text-center text-[10px] font-extrabold text-dl-slate-light font-jp tracking-wider">
            ─── 今日のセッション ───
          </div>
          {messages.map((m, i) => (
            <Bubble2 key={i} m={m} />
          ))}
          <div className="flex gap-2 items-end">
            <div className="w-8 h-8 rounded-full bg-[#FEF3C7] flex items-center justify-center shrink-0">
              <Mascot size={28} />
            </div>
            <div className="bg-white rounded-[18px_18px_18px_4px] px-3.5 py-3 flex gap-1 border border-dl-border">
              <Dot />
              <Dot d={0.2} />
              <Dot d={0.4} />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 px-3.5 pb-2.5">
        <div className="flex gap-2 overflow-hidden mb-2.5 flex-nowrap">
          {chips.map((c, i) => (
            <div
              key={i}
              className="bg-white border-[1.5px] border-dl-primary rounded-full px-3 py-[7px] text-[11px] font-extrabold text-dl-primary font-jp whitespace-nowrap shadow-[0_2px_0_#C8431A] cursor-pointer"
            >
              💬 {c}
            </div>
          ))}
        </div>
        <div className="bg-white rounded-full border-[1.5px] border-dl-border pl-[18px] pr-1.5 py-1.5 flex items-center gap-2 shadow-[0_2px_0_#F0E2CD]">
          <div className="flex-1 text-[13px] text-dl-slate-light font-jp">メッセージを入力...</div>
          <div className="w-[38px] h-[38px] rounded-full bg-dl-primary flex items-center justify-center shadow-[0_2px_0_#C8431A] cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M2 8 L14 2 L10 14 L8 9 Z" fill="#fff" />
            </svg>
          </div>
        </div>
      </div>

      <TabBar active="home" />
    </Phone>
  );
}

function Bubble2({ m }: { m: Message }) {
  if (m.from === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-dl-primary text-white rounded-[18px_18px_4px_18px] px-3.5 py-2.5 max-w-[78%] text-[13px] leading-[1.5] font-jp font-semibold shadow-[0_2px_0_#C8431A]">
          {m.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2 items-end">
      <div className="w-8 h-8 rounded-full bg-[#FEF3C7] flex items-center justify-center shrink-0">
        <Mascot size={28} />
      </div>
      <div className="bg-white text-dl-navy rounded-[18px_18px_18px_4px] px-3.5 py-2.5 max-w-[78%] text-[13px] leading-[1.6] font-jp font-semibold whitespace-pre-wrap border border-dl-border">
        {m.text}
      </div>
    </div>
  );
}

function Dot({ d = 0 }: { d?: number }) {
  return (
    <div
      className="w-[7px] h-[7px] rounded-full bg-dl-slate-light animate-dlblink"
      style={{ animationDelay: `${d}s` }}
    />
  );
}

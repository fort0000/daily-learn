import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DL } from '../lib/dl';
import { Phone } from '../components/Phone';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { AppIcon } from '../components/AppIcon';
import {
  fetchChatMessages,
  sendChatMessage,
  subscribeToChatMessages,
  type ChatMessage,
} from '../lib/db';
import { useProfile, useSession } from '../lib/auth';

type Props = {
  // When provided, the screen runs in "embedded" mode: it uses the given
  // lesson id directly, the back button calls onClose instead of routing,
  // and the TabBar is hidden (the host page provides chrome).
  embeddedLessonId?: string;
  onClose?: () => void;
};

export function ChatScreen({ embeddedLessonId, onClose }: Props = {}) {
  const navigate = useNavigate();
  const params = useParams();
  const embedded = embeddedLessonId !== undefined;
  const lessonId = embedded ? embeddedLessonId ?? null : params.lessonId ?? null;
  const session = useSession();
  const userId = session.session?.user.id ?? null;
  const { profile } = useProfile(userId);
  const isFree = profile?.plan === 'free';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Initial fetch + Realtime subscription. Inserts arrive via the channel
  // (both the user message inserted by chat-send and the assistant reply),
  // so the local state mostly mirrors the table.
  useEffect(() => {
    if (!lessonId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchChatMessages(lessonId)
      .then((rows) => {
        if (active) setMessages(rows);
      })
      .catch((e) => {
        console.error('[Chat] fetchChatMessages failed:', e);
        if (active) setError(e instanceof Error ? e.message : '読み込みに失敗しました');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsub = subscribeToChatMessages(lessonId, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    return () => {
      active = false;
      unsub();
    };
  }, [lessonId]);

  // Pin to the bottom on every message change.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, sending]);

  const handleSend = async (text?: string) => {
    if (!lessonId || sending) return;
    const content = (text ?? draft).trim();
    if (!content) return;
    setSending(true);
    setError(null);
    setDraft('');
    try {
      const { user, assistant } = await sendChatMessage(lessonId, content);
      // Realtime usually beats us here, but de-dupe defensively.
      setMessages((prev) => {
        const existing = new Set(prev.map((m) => m.id));
        const next = [...prev];
        if (!existing.has(user.id)) next.push(user);
        if (!existing.has(assistant.id)) next.push(assistant);
        return next.sort((a, b) => a.created_at.localeCompare(b.created_at));
      });
    } catch (e) {
      console.error('[Chat] sendChatMessage failed:', e);
      setError(e instanceof Error ? e.message : '送信に失敗しました');
      setDraft(content); // restore so the user can retry
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const canSend = !!lessonId && !sending && !isFree && draft.trim().length > 0;

  return (
    <Phone bg="#FFFBF5">
      <StatusBar />
      <div className={`pt-1 px-4 pb-3 ${embedded ? '' : 'pr-[76px]'} flex items-center gap-3 border-b border-dl-border`}>
        <div
          onClick={() => {
            if (embedded) {
              onClose?.();
              return;
            }
            if (lessonId) navigate(`/lessons/${lessonId}`, { replace: true });
            else navigate(-1);
          }}
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
        <AppIcon size={44} rounded="rounded-2xl" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black text-dl-navy font-jp">AIアシスタント</div>
          <div className="text-[11px] font-bold text-dl-mint-dark font-jp flex items-center gap-1 mt-px">
            <span className="w-1.5 h-1.5 rounded-full bg-dl-mint" />
            オンライン
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="absolute top-[70px] bottom-[88px] left-0 right-0 overflow-y-auto px-3.5 pt-4 pb-2"
        style={{
          backgroundImage: `radial-gradient(circle, #F0E2CD 1px, transparent 1.4px)`,
          backgroundSize: '16px 16px',
        }}
      >
        <div className="flex flex-col gap-3">
          <div className="text-center text-[10px] font-extrabold text-dl-slate-light font-jp tracking-wider">
            ─── 今日のセッション ───
          </div>
          {!lessonId && (
            <Notice text="レッスンが指定されていません。アシスタントを使うには、まずレッスンを開いてください。" />
          )}
          {lessonId && loading && <Notice text="読み込み中…" />}
          {lessonId && !loading && messages.length === 0 && (
            <Bubble
              m={{
                role: 'assistant',
                content:
                  'こんにちは!今日のレッスンで気になったところや、もっと知りたい点があれば気軽に聞いてください。',
              }}
            />
          )}
          {messages.map((m) => (
            <Bubble key={m.id} m={m} />
          ))}
          {sending && <TypingBubble />}
          {error && (
            <div className="px-3.5 py-2.5 rounded-2xl border-[1.5px] border-[#FCA5A5] bg-[#FEF2F2] text-[12px] font-bold text-[#B91C1C] font-jp leading-[1.5]">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 px-3.5 pb-2.5">
        {isFree && (
          <div className="mb-2 px-3.5 py-2 rounded-2xl bg-[#FEF3C7] border-[1.5px] border-[#FCD34D] text-[11px] font-extrabold text-[#92400E] font-jp leading-[1.5] text-center">
            AIアシスタントは有料プランで使えます
          </div>
        )}
        <div className="bg-white rounded-full border-[1.5px] border-dl-border pl-[18px] pr-1.5 py-1.5 flex items-center gap-2 shadow-[0_2px_0_#F0E2CD]">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isFree ? '有料プランで使えます' : sending ? '送信中…' : 'メッセージを入力...'}
            disabled={!lessonId || sending || isFree}
            className="flex-1 text-[13px] text-dl-navy font-jp font-semibold outline-none bg-transparent placeholder:text-dl-slate-light"
          />
          <div
            onClick={() => canSend && void handleSend()}
            className={`w-[38px] h-[38px] rounded-full bg-dl-primary flex items-center justify-center shadow-[0_2px_0_#C8431A] ${
              canSend ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed pointer-events-none'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M2 8 L14 2 L10 14 L8 9 Z" fill="#fff" />
            </svg>
          </div>
        </div>
      </div>

      {!embedded && <TabBar active="home" />}
    </Phone>
  );
}

function Bubble({ m }: { m: Pick<ChatMessage, 'role' | 'content'> }) {
  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-dl-primary text-white rounded-[18px_18px_4px_18px] px-3.5 py-2.5 max-w-[78%] text-[13px] leading-[1.5] font-jp font-semibold shadow-[0_2px_0_#C8431A] whitespace-pre-wrap">
          {m.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2 items-end">
      <AppIcon size={32} rounded="rounded-xl" />
      <div className="bg-white text-dl-navy rounded-[18px_18px_18px_4px] px-3.5 py-2.5 max-w-[78%] text-[13px] leading-[1.6] font-jp font-semibold whitespace-pre-wrap border border-dl-border">
        {m.content}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex gap-2 items-end">
      <AppIcon size={32} rounded="rounded-xl" />
      <div className="bg-white rounded-[18px_18px_18px_4px] px-3.5 py-3 flex gap-1 border border-dl-border">
        <Dot />
        <Dot d={0.2} />
        <Dot d={0.4} />
      </div>
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div className="text-center text-[12px] font-bold text-dl-slate font-jp">{text}</div>
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

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DL } from '../lib/dl';
import { Phone } from '../components/Phone';
import { StatusBar } from '../components/StatusBar';
import { PushButton } from '../components/PushButton';
import { LessonRenderer } from '../components/LessonRenderer';
import { CompleteModal } from '../components/CompleteModal';
import { ChatScreen } from './Chat';
import {
  PlanLimitError,
  fetchLesson,
  fetchTotalCompleted,
  getCachedLessonBody,
  getStreak,
  markLessonComplete,
  requestLessonGeneration,
  requestLessonPrefetchNext,
  requestLessonRead,
  type Lesson,
} from '../lib/db';
import { isLessonBody, type LessonBody } from '../lib/lessonBody';
import { useProfile, useSession } from '../lib/auth';

export function ArticleScreen() {
  const navigate = useNavigate();
  const params = useParams();
  const lessonId = params.lessonId ?? null;
  const session = useSession();
  const userId = session.session?.user.id ?? null;
  const { profile } = useProfile(userId);

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  // Chat overlay: `mounted` keeps the panel in the tree so the close
  // animation can run; `visible` drives the clip-path reveal.
  const [chatMounted, setChatMounted] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);

  const openChat = () => {
    if (!lesson) return;
    setChatMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setChatVisible(true)));
  };
  const closeChat = () => {
    setChatVisible(false);
    setTimeout(() => setChatMounted(false), 460);
  };
  // True only while requestLessonGeneration is running (body was actually
  // missing). During requestLessonRead we still show a placeholder, but the
  // copy is "loading" rather than "generating".
  const [actuallyGenerating, setActuallyGenerating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completeModal, setCompleteModal] = useState<{
    streak: number;
    daysCompleted: number;
  } | null>(null);

  useEffect(() => {
    if (!lessonId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchLesson(lessonId)
      .then((l) => {
        if (!active) return;
        // Hydrate body from the in-memory cache so a Chat ↔ Article round-trip
        // doesn't flash the "loading" placeholder while requestLessonRead races.
        if (l) {
          const cached = getCachedLessonBody(l.id);
          if (cached !== undefined) {
            setLesson({ ...l, body: cached });
            return;
          }
        }
        setLesson(l);
      })
      .catch((e) => {
        console.error('[Article] fetchLesson failed:', e);
        if (active) setError(e.message ?? '読み込みに失敗しました');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [lessonId]);

  // Plan gate: free + day > 10 → bounce to /upgrade. Skip until both lesson
  // and profile are loaded so we don't flash the gate before we know the plan.
  useEffect(() => {
    if (!lesson || !profile) return;
    if (profile.plan === 'free' && lesson.day > 10) {
      navigate('/upgrade', { replace: true });
    }
  }, [lesson, profile, navigate]);

  // Load body via the gated Edge Function (the body column is REVOKE'd from
  // authenticated, so direct SELECT can't return it). lessons-read is a fast
  // path when the row already has body; lessons-generate produces it on the
  // first open.
  useEffect(() => {
    if (!lesson || lesson.body != null || generating) return;
    if (profile?.plan === 'free' && lesson.day > 10) return; // gate redirect handles this
    let active = true;
    setGenerating(true);
    setActuallyGenerating(false);
    setError(null);

    const handlePlanLimit = (e: PlanLimitError) => {
      if (e.code === 'PLAN_LIMIT_LESSONS') {
        navigate('/upgrade', { replace: true });
      } else {
        setError(e.message);
      }
    };

    // Try the read-only path first; fall back to generation only if body is
    // genuinely missing (lessons-read returns body=null in that case).
    requestLessonRead(lesson.id)
      .then(async (body) => {
        if (!active) return;
        if (body !== null) {
          setLesson((prev) => (prev ? { ...prev, body } : prev));
          return;
        }
        // body is null in the DB — kick generation.
        if (active) setActuallyGenerating(true);
        const generated = await requestLessonGeneration(lesson.id);
        if (!active) return;
        setLesson((prev) =>
          prev ? { ...prev, body: generated, generated_at: new Date().toISOString() } : prev,
        );
      })
      .catch((e) => {
        if (e instanceof PlanLimitError) return handlePlanLimit(e);
        console.error('[Article] body fetch/generate failed:', e);
        if (active) setError(e instanceof Error ? e.message : '本文の取得に失敗しました');
      })
      .finally(() => {
        if (active) {
          setGenerating(false);
          setActuallyGenerating(false);
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id, lesson?.body, profile?.plan]);

  const handleComplete = async () => {
    if (!lesson || completing || lesson.completed_at) return;
    setCompleting(true);
    try {
      await markLessonComplete(lesson.id);
      // Fire-and-forget — server-side checks frontier conditions itself.
      void requestLessonPrefetchNext(lesson.id);
      // Reflect the new completed_at locally so the button state is correct
      // if the user closes the modal back to the article instead of going home.
      setLesson((prev) =>
        prev ? { ...prev, completed_at: new Date().toISOString() } : prev,
      );
      // Best-effort stats fetch for the celebration. If it fails, fall back
      // to lesson.day so the modal still has reasonable numbers.
      const [streakRes, totalRes] = await Promise.allSettled([
        getStreak(),
        fetchTotalCompleted(),
      ]);
      const streak =
        streakRes.status === 'fulfilled' ? streakRes.value.current : lesson.day;
      const daysCompleted =
        totalRes.status === 'fulfilled' ? totalRes.value : lesson.day;
      setCompleteModal({ streak, daysCompleted });
    } catch (e) {
      console.error('[Article] markLessonComplete failed:', e);
      setError(e instanceof Error ? e.message : '完了の記録に失敗しました');
      setCompleting(false);
    }
  };

  const body = lesson?.body && isLessonBody(lesson.body) ? (lesson.body as LessonBody) : null;

  return (
    <Phone bg="#FFFBF5">
      <StatusBar />
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#F5EDDF] z-10">
        <div
          className="h-full bg-dl-primary transition-[width] duration-300"
          style={{ width: lesson ? `${Math.round((lesson.day / 30) * 100)}%` : '0%' }}
        />
      </div>
      <div className="pt-2 px-4 pb-3 pr-[76px] flex items-center gap-2.5">
        <div
          onClick={() => navigate(-1)}
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
          <div className="text-[10px] font-extrabold text-dl-slate-light tracking-wider">
            {lesson ? `DAY ${lesson.day}` : 'DAY -'}
          </div>
          <div className="text-[13px] font-black text-dl-navy font-jp mt-px truncate">
            {lesson?.title ?? (loading ? '読み込み中…' : 'レッスンが見つかりません')}
          </div>
        </div>
      </div>

      <div className="absolute top-[70px] bottom-0 left-0 right-0 overflow-y-auto px-[18px] pb-8">
        {loading ? (
          <Skeleton />
        ) : !lesson ? (
          <NotFound onBack={() => navigate('/home')} />
        ) : (
          <ArticleBody
            lesson={lesson}
            body={body}
            generating={generating}
            actuallyGenerating={actuallyGenerating}
          />
        )}

        {error && (
          <div className="mt-4 px-3.5 py-2.5 rounded-2xl border-[1.5px] border-[#FCA5A5] bg-[#FEF2F2] text-[12px] font-bold text-[#B91C1C] font-jp leading-[1.5]">
            {error}
          </div>
        )}

        {lesson && (
          <div className="mt-7">
            {lesson.completed_at ? (
              <PushButton color={DL.slate} shadow="#1f2a3b" fontSize={16} onClick={() => navigate('/home')}>
                ✓ 完了済み — ホームへ
              </PushButton>
            ) : (
              <div className={completing || generating ? 'opacity-60 pointer-events-none' : ''}>
                <PushButton
                  color={DL.mint}
                  shadow={DL.mintShadow}
                  fontSize={16}
                  onClick={handleComplete}
                >
                  {completing ? '記録中…' : '✓ 読み終わった!'}
                </PushButton>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating chat FAB. Morphs between bubble (closed) and book / back-to-lesson
          (open). When closed, idle-bobs and shows a pulsing ring to draw attention.
          The chat overlay reveals from the FAB position via a circular clip-path. */}
      <div
        onClick={() => {
          if (!lesson) return;
          if (chatVisible) closeChat();
          else openChat();
        }}
        title={chatVisible ? 'レッスンに戻る' : 'AIアシスタントに質問'}
        className={`absolute bottom-6 right-[18px] z-[60] w-[58px] h-[58px] rounded-full flex items-center justify-center ${
          lesson ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed pointer-events-none'
        }`}
        style={{
          background: chatVisible ? DL.navy : DL.mint,
          boxShadow: chatVisible
            ? '0 4px 0 #1E293B, 0 8px 20px rgba(15,23,42,0.35)'
            : '0 5px 0 #0F7A38, 0 10px 24px rgba(15,23,42,0.18)',
          // Lift the button while chat is open so it clears the input/send row.
          transform: chatVisible ? 'translateY(-68px)' : 'translateY(0)',
          transition:
            'background 320ms ease, box-shadow 320ms ease, transform 320ms cubic-bezier(.34,1.56,.64,1)',
          animation: !chatMounted && lesson ? 'dlFabBob 2.4s ease-in-out infinite' : 'none',
        }}
      >
        {/* Chat-bubble icon — visible when closed */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transition: 'opacity 220ms ease, transform 320ms cubic-bezier(.34,1.56,.64,1)',
            opacity: chatVisible ? 0 : 1,
            transform: chatVisible ? 'rotate(-90deg) scale(0.6)' : 'rotate(0) scale(1)',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 22 22" fill="none">
            <path d="M3 5 Q3 3 5 3 H17 Q19 3 19 5 V13 Q19 15 17 15 H10 L6 19 V15 H5 Q3 15 3 13 Z" fill="#fff" />
          </svg>
        </div>
        {/* Book / back-to-lesson icon — visible when chat is open */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transition: 'opacity 220ms ease, transform 320ms cubic-bezier(.34,1.56,.64,1)',
            opacity: chatVisible ? 1 : 0,
            transform: chatVisible ? 'rotate(0) scale(1)' : 'rotate(90deg) scale(0.6)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 4 H17 Q19 4 19 6 V20 L12 17 L5 20 Z"
              stroke="#fff"
              strokeWidth="2.4"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
        {/* Pulsing ring when closed */}
        {!chatVisible && lesson && (
          <div
            className="absolute -inset-1 rounded-full pointer-events-none"
            style={{
              border: `2px solid ${DL.mint}`,
              opacity: 0.6,
              animation: 'dlFabPulse 1.8s ease-out infinite',
            }}
          />
        )}
      </div>

      {/* Chat overlay — circle clip-path reveal from the FAB position.
          Origin matches the FAB center: ~47px from right, ~53px from bottom. */}
      {chatMounted && lesson && (
        <div
          className="absolute inset-0 z-[55]"
          style={{
            clipPath: chatVisible
              ? 'circle(140% at calc(100% - 47px) calc(100% - 53px))'
              : 'circle(0px at calc(100% - 47px) calc(100% - 53px))',
            WebkitClipPath: chatVisible
              ? 'circle(140% at calc(100% - 47px) calc(100% - 53px))'
              : 'circle(0px at calc(100% - 47px) calc(100% - 53px))',
            transition:
              'clip-path 460ms cubic-bezier(.4,0,.2,1), -webkit-clip-path 460ms cubic-bezier(.4,0,.2,1)',
            pointerEvents: chatVisible ? 'auto' : 'none',
          }}
        >
          <ChatScreen embeddedLessonId={lesson.id} />
        </div>
      )}

      <style>{`
        @keyframes dlFabBob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
        @keyframes dlFabPulse {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>

      {completeModal && lesson && (
        <CompleteModal
          day={lesson.day}
          title={lesson.title}
          streak={completeModal.streak}
          daysCompleted={completeModal.daysCompleted}
          onClose={() =>
            navigate('/home', { state: { focusCourseId: lesson.course_id } })
          }
        />
      )}
    </Phone>
  );
}

function ArticleBody({
  lesson,
  body,
  generating,
  actuallyGenerating,
}: {
  lesson: Lesson;
  body: LessonBody | null;
  generating: boolean;
  actuallyGenerating: boolean;
}) {
  return (
    <>
      <h1 className="text-2xl font-black text-dl-navy font-jp leading-[1.3] mt-2 mx-0 mb-2 tracking-[-0.3px]">
        {lesson.title}
      </h1>
      <div className="text-xs text-dl-slate font-jp mb-5">DAY {lesson.day} / 30 · 約10分</div>

      {body ? (
        <LessonRenderer body={body} />
      ) : generating ? (
        <Generating summary={lesson.summary} actuallyGenerating={actuallyGenerating} />
      ) : (
        // Body load failed (e.g. non-LessonBody legacy JSON or generation
        // error). Show summary so the user has something while we retry.
        <div className="bg-white rounded-[18px] px-4 py-3.5 border-[1.5px] border-dl-border">
          <div className="text-[13px] font-black text-dl-navy font-jp mb-2">📝 概要</div>
          <div className="text-[14px] leading-[1.7] text-dl-navy font-jp">{lesson.summary}</div>
        </div>
      )}
    </>
  );
}

function Generating({
  summary,
  actuallyGenerating,
}: {
  summary: string;
  actuallyGenerating: boolean;
}) {
  return (
    <>
      <div className="bg-white rounded-[18px] px-4 py-3.5 border-[1.5px] border-dl-border mb-3.5">
        <div className="text-[13px] font-black text-dl-navy font-jp mb-2">📝 概要</div>
        <div className="text-[14px] leading-[1.7] text-dl-navy font-jp">{summary}</div>
      </div>
      <div className="bg-[#FFF7ED] rounded-2xl px-3.5 py-3 border-[1.5px] border-[#FED7AA] flex items-center gap-2.5">
        <div className="flex gap-1">
          <span className="w-[7px] h-[7px] rounded-full bg-dl-fire-dark animate-dlblink" />
          <span
            className="w-[7px] h-[7px] rounded-full bg-dl-fire-dark animate-dlblink"
            style={{ animationDelay: '0.2s' }}
          />
          <span
            className="w-[7px] h-[7px] rounded-full bg-dl-fire-dark animate-dlblink"
            style={{ animationDelay: '0.4s' }}
          />
        </div>
        <div className="text-[12px] font-extrabold text-dl-fire-dark font-jp leading-[1.5]">
          {actuallyGenerating ? 'レッスンを生成中…(約20〜30秒)' : 'レッスンをロード中…'}
        </div>
      </div>
    </>
  );
}

function Skeleton() {
  return (
    <div className="pt-3 space-y-3">
      <div className="h-7 bg-white rounded-xl animate-pulse" />
      <div className="h-4 w-1/2 bg-white rounded-xl animate-pulse" />
      <div className="h-24 bg-white rounded-2xl animate-pulse" />
    </div>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="pt-10 text-center">
      <div className="text-sm font-extrabold text-dl-navy font-jp">レッスンが見つかりません</div>
      <div className="text-[12px] font-bold text-dl-slate font-jp mt-1.5">
        URLが古いか、コースが削除された可能性があります。
      </div>
      <div className="mt-5 inline-block">
        <PushButton color={DL.primary} shadow={DL.primaryShadow} fontSize={14} onClick={onBack}>
          ホームへ戻る
        </PushButton>
      </div>
    </div>
  );
}

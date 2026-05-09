import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DL } from '../lib/dl';
import { Phone } from '../components/Phone';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { PushButton } from '../components/PushButton';
import { LessonRenderer } from '../components/LessonRenderer';
import {
  fetchLesson,
  markLessonComplete,
  requestLessonGeneration,
  requestLessonPrefetchNext,
  type Lesson,
} from '../lib/db';
import { isLessonBody, type LessonBody } from '../lib/lessonBody';

export function ArticleScreen() {
  const navigate = useNavigate();
  const params = useParams();
  const lessonId = params.lessonId ?? null;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // If the lesson row exists but body is null, kick the Realtime generation
  // path. The Edge Function persists body+generated_at; we update local state
  // with the returned body so we don't need a second fetch.
  useEffect(() => {
    if (!lesson || lesson.body != null || generating) return;
    let active = true;
    setGenerating(true);
    setError(null);
    requestLessonGeneration(lesson.id)
      .then((body) => {
        if (!active) return;
        setLesson((prev) => (prev ? { ...prev, body, generated_at: new Date().toISOString() } : prev));
      })
      .catch((e) => {
        console.error('[Article] requestLessonGeneration failed:', e);
        if (active) setError(e instanceof Error ? e.message : '本文の生成に失敗しました');
      })
      .finally(() => {
        if (active) setGenerating(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id, lesson?.body]);

  const handleComplete = async () => {
    if (!lesson || completing || lesson.completed_at) return;
    setCompleting(true);
    try {
      await markLessonComplete(lesson.id);
      // Fire-and-forget — server-side checks frontier conditions itself.
      void requestLessonPrefetchNext(lesson.id);
      navigate('/home');
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
          <ArticleBody lesson={lesson} body={body} generating={generating} />
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

      <div
        onClick={() => lesson && navigate(`/lessons/${lesson.id}/chat`, { replace: true })}
        title="AIアシスタントに質問"
        className={`absolute bottom-6 right-[18px] z-25 w-[58px] h-[58px] rounded-full bg-dl-mint flex items-center justify-center shadow-[0_5px_0_#0F7A38,0_10px_24px_rgba(15,23,42,0.18)] ${
          lesson ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed pointer-events-none'
        }`}
      >
        <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
          <path d="M3 5 Q3 3 5 3 H17 Q19 3 19 5 V13 Q19 15 17 15 H10 L6 19 V15 H5 Q3 15 3 13 Z" fill="#fff" />
        </svg>
      </div>

      <TabBar active="home" />
    </Phone>
  );
}

function ArticleBody({
  lesson,
  body,
  generating,
}: {
  lesson: Lesson;
  body: LessonBody | null;
  generating: boolean;
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
        <Generating summary={lesson.summary} />
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

function Generating({ summary }: { summary: string }) {
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
          本文を生成中…(約20〜30秒)
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

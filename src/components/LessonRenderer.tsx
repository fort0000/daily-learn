import { Fragment, type ReactNode } from 'react';
import type { LessonBody, LessonBlock, LessonHero } from '../lib/lessonBody';

// Renders a structured LessonBody. Block order is preserved as-is — no
// reordering. Inline ==highlight== and **bold** are the only supported
// inline marks (anything else is rendered as plain text).

export function LessonRenderer({ body }: { body: LessonBody }) {
  return (
    <>
      <Hero hero={body.hero} />
      <Points points={body.points} />
      <div className="space-y-3.5">
        {body.blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </div>
    </>
  );
}

function Hero({ hero }: { hero: LessonHero }) {
  return (
    <div className="bg-white rounded-[20px] px-4 py-4 border-[1.5px] border-dl-border mb-3.5 relative overflow-hidden">
      <div className="text-[10px] font-extrabold tracking-[0.18em] text-dl-primary font-jp">
        {hero.theme}
      </div>
      <div className="mt-2 h-[68px] flex items-center justify-center">
        <HeroVisual visual={hero.visual} />
      </div>
    </div>
  );
}

function HeroVisual({ visual }: { visual: LessonHero['visual'] }) {
  if (visual === 'bubbles') {
    return (
      <svg width="160" height="60" viewBox="0 0 160 60" aria-hidden>
        <circle cx="30" cy="30" r="22" fill="#FFE4D5" />
        <circle cx="80" cy="30" r="22" fill="#FFD0B8" />
        <circle cx="130" cy="30" r="22" fill="#FFBA9A" />
      </svg>
    );
  }
  if (visual === 'chart') {
    return (
      <svg width="160" height="60" viewBox="0 0 160 60" aria-hidden>
        <polyline
          points="8,52 40,40 72,28 104,18 136,8 152,4"
          fill="none"
          stroke="#FF7A45"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="8" y1="52" x2="152" y2="52" stroke="#F1E8DC" strokeWidth="2" />
      </svg>
    );
  }
  if (visual === 'icon') {
    return (
      <div className="w-[56px] h-[56px] rounded-2xl bg-dl-cream flex items-center justify-center text-3xl">
        💡
      </div>
    );
  }
  return null;
}

function Points({ points }: { points: [string, string, string] }) {
  return (
    <div className="bg-white rounded-[18px] px-4 py-3.5 border-[1.5px] border-dl-border mb-3.5">
      <div className="text-[13px] font-black text-dl-navy font-jp mb-2.5">
        📌 今日の3つのポイント
      </div>
      <ol className="space-y-2 list-none pl-0">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="shrink-0 w-[22px] h-[22px] rounded-full bg-dl-primary text-white text-[11px] font-extrabold flex items-center justify-center mt-px">
              {i + 1}
            </span>
            <span className="text-[14px] leading-[1.65] text-dl-navy font-jp font-bold">
              {renderInline(p)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Block({ block }: { block: LessonBlock }) {
  if (block.type === 'paragraph') {
    return (
      <p className="text-[14px] leading-[1.85] text-dl-navy font-jp font-semibold m-0">
        {renderInline(block.markdown)}
      </p>
    );
  }
  if (block.type === 'tip') {
    return (
      <div className="bg-[#FFF7ED] rounded-2xl px-3.5 py-3 border-[1.5px] border-[#FED7AA]">
        <div className="text-[11px] font-extrabold text-dl-fire-dark font-jp tracking-wider mb-1">
          💡 ヒント
        </div>
        <div className="text-[13px] leading-[1.7] text-dl-navy font-jp font-semibold">
          {renderInline(block.text)}
        </div>
      </div>
    );
  }
  return (
    <div className="bg-[#ECFDF5] rounded-2xl px-3.5 py-3 border-[1.5px] border-[#A7F3D0]">
      <div className="text-[11px] font-extrabold text-dl-mint-dark font-jp tracking-wider mb-1">
        ✅ 今日のアクション
      </div>
      <div className="text-[13px] leading-[1.7] text-dl-navy font-jp font-semibold">
        {renderInline(block.text)}
      </div>
    </div>
  );
}

// Mini Markdown: ==highlight== → <mark>, **bold** → <strong>. Anything else
// is rendered verbatim. We intentionally don't run a real MD parser so the
// LessonBody contract stays narrow (no headings, no lists inside paragraphs).
function renderInline(text: string): ReactNode {
  // Tokenize into segments. We do two passes: first split on ==…==, then
  // each non-highlight segment is split on **…**.
  const out: ReactNode[] = [];
  const HIGHLIGHT = /==([^=]+)==/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = HIGHLIGHT.exec(text)) !== null) {
    if (match.index > lastIdx) {
      out.push(<Fragment key={key++}>{renderBold(text.slice(lastIdx, match.index), key)}</Fragment>);
    }
    out.push(
      <mark
        key={key++}
        className="bg-[#FFE6A8] text-dl-navy rounded px-1 py-px not-italic"
      >
        {renderBold(match[1], key)}
      </mark>,
    );
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) {
    out.push(<Fragment key={key++}>{renderBold(text.slice(lastIdx), key)}</Fragment>);
  }
  return out;
}

function renderBold(text: string, baseKey: number): ReactNode {
  const out: ReactNode[] = [];
  const BOLD = /\*\*([^*]+)\*\*/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = baseKey * 1000;
  while ((match = BOLD.exec(text)) !== null) {
    if (match.index > lastIdx) {
      out.push(<Fragment key={key++}>{text.slice(lastIdx, match.index)}</Fragment>);
    }
    out.push(<strong key={key++} className="font-black text-dl-navy">{match[1]}</strong>);
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) {
    out.push(<Fragment key={key++}>{text.slice(lastIdx)}</Fragment>);
  }
  return out;
}

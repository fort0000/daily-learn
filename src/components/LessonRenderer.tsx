import { Fragment, type ReactNode } from 'react';
import type { LessonBody, LessonBlock, LessonReference } from '../lib/lessonBody';

// Renders a structured LessonBody. Block order is preserved as-is — no
// reordering. Inline ==highlight== and **bold** are the only supported
// inline marks (anything else is rendered as plain text).

export function LessonRenderer({ body }: { body: LessonBody }) {
  // Auto-number headings: the model writes the title only ("複利は…の仕組み"),
  // and we prepend "1.", "2.", … based on heading position. This keeps the
  // body data clean and makes inserting/removing sections re-flow cleanly.
  const headingNumbers = computeHeadingNumbers(body.blocks);
  return (
    <>
      <Points points={body.points} />
      <div className="space-y-3.5">
        {body.blocks.map((b, i) =>
          b.type === 'heading' ? (
            <Heading key={i} index={headingNumbers[i]} text={b.text} />
          ) : (
            <Block key={i} block={b} />
          ),
        )}
      </div>
      {body.references && body.references.length > 0 && (
        <References references={body.references} />
      )}
    </>
  );
}

function computeHeadingNumbers(blocks: LessonBlock[]): number[] {
  const out: number[] = [];
  let n = 0;
  for (const b of blocks) {
    if (b.type === 'heading') {
      n += 1;
      out.push(n);
    } else {
      out.push(0);
    }
  }
  return out;
}

function Heading({ index, text }: { index: number; text: string }) {
  return (
    <h2 className="text-[17px] font-black text-dl-navy font-jp leading-[1.45] mt-5 mb-1 tracking-[-0.2px]">
      <span className="text-dl-primary mr-1.5 tabular-nums">{index}.</span>
      {renderInline(text)}
    </h2>
  );
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

function Block({ block }: { block: Exclude<LessonBlock, { type: 'heading' }> }) {
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

function References({ references }: { references: LessonReference[] }) {
  return (
    <div className="mt-5 bg-white rounded-[18px] px-4 py-3.5 border-[1.5px] border-dl-border">
      <div className="text-[13px] font-black text-dl-navy font-jp mb-2.5">
        📎 参考文献
      </div>
      <ol className="space-y-2 list-none pl-0">
        {references.map((r, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="shrink-0 text-[11px] font-extrabold text-dl-slate font-jp mt-[3px] tabular-nums">
              [{i + 1}]
            </span>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] leading-[1.6] text-dl-primary font-jp font-semibold underline decoration-dotted underline-offset-2 break-all hover:opacity-80"
            >
              {r.title}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Mini Markdown: ==highlight== → <mark>, **bold** → <strong>. Anything else
// is rendered verbatim. We intentionally don't run a real MD parser so the
// LessonBody contract stays narrow (no headings, no lists inside paragraphs).
//
// Both marks are matched in a SINGLE regex alternation, then we recurse into
// the captured inner text so nesting works (e.g. **==X==** or ==**X**==).
// The previous two-pass approach split highlights first and orphaned the **
// markers when bold wrapped a highlight, producing literal `**` in output.
function renderInline(rawText: string): ReactNode {
  // Strip any <cite …>/</cite> wrapper tags that the Anthropic web_search
  // path occasionally bleeds into paragraph text. Server also strips, but we
  // keep this guard so legacy rows already in the DB render cleanly.
  const text = rawText.replace(/<\/?cite\b[^>]*>/gi, '');
  return tokenizeMarks(text, { v: 0 });
}

// Shared key counter passed by reference so recursive calls don't collide.
type KeyCounter = { v: number };

function tokenizeMarks(text: string, key: KeyCounter): ReactNode[] {
  const out: ReactNode[] = [];
  // Group 1 = bold inner, Group 2 = highlight inner, Group 3 = bare URL.
  // URLs stop at whitespace, common Japanese brackets, or punctuation that's
  // almost always the *outer* sentence's terminator (。、, .) — not the
  // URL's content. We also exclude `()` to avoid swallowing the closing
  // paren of a wrapping `（…）`. Non-greedy on bold/highlight so the
  // shortest valid pair wins when multiple are on the same line.
  const RE =
    /\*\*([^*]+?)\*\*|==([^=]+?)==|(https?:\/\/[^\s<>「」『』()（）、。,]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = RE.exec(text)) !== null) {
    if (m.index > last) {
      out.push(<Fragment key={key.v++}>{text.slice(last, m.index)}</Fragment>);
    }
    if (m[1] !== undefined) {
      out.push(
        <strong key={key.v++} className="font-black text-dl-navy">
          {tokenizeMarks(m[1], key)}
        </strong>,
      );
    } else if (m[2] !== undefined) {
      out.push(
        <mark
          key={key.v++}
          className="bg-[#FFE6A8] text-dl-navy rounded px-1 py-px not-italic"
        >
          {tokenizeMarks(m[2], key)}
        </mark>,
      );
    } else {
      // Bare URL — strip trailing punctuation that the regex permitted but
      // which is almost certainly part of the surrounding prose.
      const raw = m[3]!;
      const trimmed = raw.replace(/[)）」』』.,!?;:]+$/, '');
      const trailing = raw.slice(trimmed.length);
      out.push(
        <a
          key={key.v++}
          href={trimmed}
          target="_blank"
          rel="noopener noreferrer"
          className="text-dl-primary underline decoration-dotted underline-offset-2 break-all hover:opacity-80"
        >
          {trimmed}
        </a>,
      );
      if (trailing) {
        out.push(<Fragment key={key.v++}>{trailing}</Fragment>);
      }
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    out.push(<Fragment key={key.v++}>{text.slice(last)}</Fragment>);
  }
  return out;
}

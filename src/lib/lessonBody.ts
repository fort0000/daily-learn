// LessonBody — frontend mirror of the structured lesson body contract.
// Server-side source of truth (Zod + JSON Schema) lives in
// supabase/functions/_shared/lessonBody.ts. Keep these two in lockstep when
// the LessonBody schema changes.

export type LessonBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; markdown: string }
  | { type: 'tip'; text: string }
  | { type: 'action'; text: string };

export type LessonReference = {
  title: string;
  url: string;
};

export type LessonBody = {
  v: 1;
  points: [string, string, string];
  blocks: LessonBlock[];
  // Optional on the type so legacy rows (no references) and any historical
  // shape with `hero` still pass isLessonBody. New generations always include
  // a non-empty array.
  references?: LessonReference[];
};

// Light runtime validation — defends the renderer against legacy rows or
// hand-edited DB content. Throws if the shape is wrong. Note: pre-Phase-5b
// rows include a `hero` field which we now silently ignore.
export function isLessonBody(value: unknown): value is LessonBody {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.v !== 1) return false;
  if (!Array.isArray(v.points) || v.points.length !== 3) return false;
  if (!v.points.every((p: unknown) => typeof p === 'string')) return false;
  if (!Array.isArray(v.blocks)) return false;
  for (const b of v.blocks) {
    if (!b || typeof b !== 'object') return false;
    const block = b as Record<string, unknown>;
    if (block.type === 'paragraph') {
      if (typeof block.markdown !== 'string') return false;
    } else if (
      block.type === 'tip' ||
      block.type === 'action' ||
      block.type === 'heading'
    ) {
      if (typeof block.text !== 'string') return false;
    } else {
      return false;
    }
  }
  if (v.references !== undefined) {
    if (!Array.isArray(v.references)) return false;
    for (const r of v.references) {
      if (!r || typeof r !== 'object') return false;
      const ref = r as Record<string, unknown>;
      if (typeof ref.title !== 'string' || typeof ref.url !== 'string') return false;
    }
  }
  return true;
}

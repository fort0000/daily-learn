// LessonBody — frontend mirror of the structured lesson body contract.
// Server-side source of truth (Zod + JSON Schema) lives in
// supabase/functions/_shared/lessonBody.ts. Keep these two in lockstep when
// the LessonBody schema changes.

export type LessonHero = {
  theme: string;
  visual: 'bubbles' | 'chart' | 'icon' | 'none';
};

export type LessonBlock =
  | { type: 'paragraph'; markdown: string }
  | { type: 'tip'; text: string }
  | { type: 'action'; text: string };

export type LessonBody = {
  v: 1;
  hero: LessonHero;
  points: [string, string, string];
  blocks: LessonBlock[];
};

// Light runtime validation — defends the renderer against legacy rows or
// hand-edited DB content. Throws if the shape is wrong.
export function isLessonBody(value: unknown): value is LessonBody {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.v !== 1) return false;
  if (!v.hero || typeof v.hero !== 'object') return false;
  const hero = v.hero as Record<string, unknown>;
  if (typeof hero.theme !== 'string') return false;
  if (!['bubbles', 'chart', 'icon', 'none'].includes(hero.visual as string)) return false;
  if (!Array.isArray(v.points) || v.points.length !== 3) return false;
  if (!v.points.every((p: unknown) => typeof p === 'string')) return false;
  if (!Array.isArray(v.blocks)) return false;
  for (const b of v.blocks) {
    if (!b || typeof b !== 'object') return false;
    const block = b as Record<string, unknown>;
    if (block.type === 'paragraph') {
      if (typeof block.markdown !== 'string') return false;
    } else if (block.type === 'tip' || block.type === 'action') {
      if (typeof block.text !== 'string') return false;
    } else {
      return false;
    }
  }
  return true;
}

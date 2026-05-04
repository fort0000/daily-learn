import type { ReactNode } from 'react';
import { DL } from '../lib/dl';

type Props = { children: ReactNode; bg?: string };

// Phone screen wrapper — fills the stage (full viewport on mobile, sandbox on desktop).
export function Phone({ children, bg = DL.bg }: Props) {
  return (
    <div
      className="relative w-full h-full overflow-hidden font-sans text-dl-navy"
      style={{ background: bg }}
    >
      {children}
    </div>
  );
}

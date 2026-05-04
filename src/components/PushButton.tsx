import type { ReactNode } from 'react';
import { DL } from '../lib/dl';

type Props = {
  children: ReactNode;
  color?: string;
  shadow?: string;
  height?: number;
  fontSize?: number;
  full?: boolean;
  fg?: string;
  icon?: ReactNode;
  onClick?: () => void;
};

export function PushButton({
  children,
  color = DL.primary,
  shadow = DL.primaryShadow,
  height = 60,
  fontSize = 17,
  full = true,
  fg = '#fff',
  icon,
  onClick,
}: Props) {
  return (
    <div
      onClick={onClick}
      className={`${full ? 'w-full' : 'w-auto'} rounded-full pb-[5px] box-border cursor-pointer`}
      style={{ background: shadow }}
    >
      <div
        className="rounded-full flex items-center justify-center gap-2 font-extrabold tracking-[0.2px] font-sans shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
        style={{
          background: color,
          height,
          color: fg,
          fontSize,
        }}
      >
        {icon}
        {children}
      </div>
    </div>
  );
}

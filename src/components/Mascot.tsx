type Props = { size?: number };

export function Mascot({ size = 64 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }}>
      <ellipse cx="36" cy="92" rx="9" ry="4" fill="#F59E0B" />
      <ellipse cx="64" cy="92" rx="9" ry="4" fill="#F59E0B" />
      <ellipse cx="50" cy="58" rx="32" ry="34" fill="#7DD3A8" />
      <ellipse cx="50" cy="64" rx="20" ry="22" fill="#C8F0D8" />
      <ellipse cx="38" cy="38" rx="10" ry="6" fill="#A7E3C2" opacity="0.7" />
      <circle cx="40" cy="50" r="9" fill="#FFFBF5" stroke="#0F172A" strokeWidth="2.5" />
      <circle cx="60" cy="50" r="9" fill="#FFFBF5" stroke="#0F172A" strokeWidth="2.5" />
      <line x1="49" y1="50" x2="51" y2="50" stroke="#0F172A" strokeWidth="2.5" />
      <circle cx="40" cy="50" r="3" fill="#0F172A" />
      <circle cx="60" cy="50" r="3" fill="#0F172A" />
      <circle cx="41" cy="49" r="1" fill="#fff" />
      <circle cx="61" cy="49" r="1" fill="#fff" />
      <path d="M47 60 L53 60 L50 65 Z" fill="#F59E0B" />
      <circle cx="28" cy="58" r="3.5" fill="#FF9F8A" opacity="0.6" />
      <circle cx="72" cy="58" r="3.5" fill="#FF9F8A" opacity="0.6" />
      <path d="M44 22 Q50 14 56 22 Q53 24 50 23 Q47 24 44 22 Z" fill="#5BB585" />
    </svg>
  );
}

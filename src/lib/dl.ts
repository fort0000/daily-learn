// DL palette & font tokens.
// Mirrors the colors defined in tailwind.config.ts so existing inline styles
// keep working while screens are migrated to Tailwind utilities one-by-one.
export const DL = {
  bg: '#FFFBF5',
  cream: '#FFF5E6',
  card: '#FFFFFF',
  primary: '#FF7A45',
  primaryDark: '#E85D2C',
  primaryShadow: '#C8431A',
  mint: '#22C55E',
  mintDark: '#16A34A',
  mintShadow: '#0F7A38',
  fire: '#F97316',
  fireDark: '#EA580C',
  yellow: '#FACC15',
  navy: '#0F172A',
  slate: '#475569',
  slateLight: '#94A3B8',
  border: '#F1E8DC',
  divider: '#EFE6D8',
  font: '"Nunito", "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif',
  fontJp: '"Hiragino Sans", "Noto Sans JP", system-ui, sans-serif',
} as const;

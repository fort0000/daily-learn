import type { Config } from 'tailwindcss';

// DL palette — single source of truth for Tailwind utilities.
// Inline `style` usages in screens will be migrated screen-by-screen
// to use these classes (per direction.md "1画面=1PR" rule).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dl: {
          bg: '#FFFBF5',
          cream: '#FFF5E6',
          card: '#FFFFFF',
          primary: '#FF7A45',
          'primary-dark': '#E85D2C',
          'primary-shadow': '#C8431A',
          mint: '#22C55E',
          'mint-dark': '#16A34A',
          'mint-shadow': '#0F7A38',
          fire: '#F97316',
          'fire-dark': '#EA580C',
          yellow: '#FACC15',
          navy: '#0F172A',
          slate: '#475569',
          'slate-light': '#94A3B8',
          border: '#F1E8DC',
          divider: '#EFE6D8',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'Hiragino Sans', 'Noto Sans JP', 'system-ui', 'sans-serif'],
        jp: ['Hiragino Sans', 'Noto Sans JP', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        dlblink: {
          '0%, 80%, 100%': { opacity: '0.3' },
          '40%': { opacity: '1' },
        },
        dlpulse: {
          '0%': { transform: 'scale(1)', opacity: '0.5' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
        dlfade: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        dlblink: 'dlblink 1.2s infinite',
        dlpulse: 'dlpulse 2s infinite ease-out',
        dlfade: 'dlfade 240ms cubic-bezier(.2,.7,.3,1)',
      },
    },
  },
  plugins: [],
} satisfies Config;

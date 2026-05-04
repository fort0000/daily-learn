type Props = { size?: number; on?: boolean };

export function Flame({ size = 28, on = true }: Props) {
  const gradId = `fl${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FCD34D" />
          <stop offset="0.5" stopColor="#FB923C" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      <path
        d="M16 2 C13 7, 8 9, 8 16 C8 23, 12 29, 16 29 C20 29, 24 23, 24 16 C24 12, 21 11, 20 7 C18 10, 17 8, 16 2 Z"
        fill={on ? `url(#${gradId})` : '#D6D3D1'}
      />
      <path
        d="M16 13 C14.5 16, 13 18, 13 21 C13 24, 14.5 26, 16 26 C17.5 26, 19 24, 19 21 C19 19, 18 18, 17.5 16 C17 17.5, 16.5 17, 16 13 Z"
        fill={on ? '#FEF3C7' : '#F5F5F4'}
        opacity="0.9"
      />
    </svg>
  );
}

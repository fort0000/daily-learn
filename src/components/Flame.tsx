type Props = { size?: number; on?: boolean };

export function Flame({ size = 28, on = true }: Props) {
  return (
    <img
      src="/icon-192.png"
      alt=""
      width={size}
      height={size}
      style={{
        display: 'block',
        width: size,
        height: size,
        opacity: on ? 1 : 0.45,
        filter: on ? undefined : 'grayscale(1)',
      }}
    />
  );
}

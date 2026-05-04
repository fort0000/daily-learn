type Props = {
  size?: number;
  /** Tailwind/CSS rounding. Defaults to a soft squircle. */
  rounded?: string;
};

export function AppIcon({ size = 64, rounded = 'rounded-2xl' }: Props) {
  return (
    <img
      src="/icon-192.png"
      alt="DailyLearn"
      width={size}
      height={size}
      className={`block ${rounded}`}
      style={{ width: size, height: size }}
    />
  );
}

// Top spacer. With viewport-fit=cover, iOS draws the system status bar
// (time / Wi-Fi / battery) on top of our content in PWA standalone, so the
// spacer expands to env(safe-area-inset-top) when that's larger than the
// baseline 1rem gap. In Safari browser the inset is 0 and we keep the
// original 16px gap below the URL bar.
export function StatusBar() {
  return <div style={{ height: 'max(1rem, env(safe-area-inset-top))' }} />;
}

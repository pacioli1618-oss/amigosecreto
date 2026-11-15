// AmigoSecreto mark: a gift box with a question mark — a present from someone you don't know yet.
// Same geometry as app/icon.svg, the PWA icons in public/icons/ and the link-preview image.
// The wordmark is live text in the app font, so it stays crisp and is read by screen readers.

export const LOGO_PATHS = {
  /** Lid, split in two so the ribbon reads as the gap between them. */
  lidLeft: {x: 10, y: 22, width: 20.5, height: 10, rx: 3},
  lidRight: {x: 33.5, y: 22, width: 20.5, height: 10, rx: 3},
  box: {x: 14, y: 33.5, width: 36, height: 22.5, rx: 3.5},
  bowLeft: 'M32 21c-2.6-7.6-12-10.4-12.6-4.6C18.9 21 26.4 21.3 32 21z',
  bowRight: 'M32 21c2.6-7.6 12-10.4 12.6-4.6C45.1 21 37.6 21.3 32 21z',
  question: 'M27.6 41.2a4.6 4.6 0 1 1 6.6 4.1c-1.3.6-2.2 1.5-2.2 2.9v.6',
  dot: {cx: 32, cy: 52.3, r: 1.9},
} as const;

export function LogoSymbol({size = 28}: {size?: number}) {
  const p = LOGO_PATHS;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <g fill="var(--brand)">
        <rect {...p.lidLeft} />
        <rect {...p.lidRight} />
        <rect {...p.box} />
        <path d={p.bowLeft} />
        <path d={p.bowRight} />
      </g>
      <path d={p.question} fill="none" stroke="var(--on-brand)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle {...p.dot} fill="var(--on-brand)" />
    </svg>
  );
}

/** Horizontal logo: symbol + "amigo" in ink and "secreto" in brand red. */
export function Logo() {
  return (
    <span style={{display: 'inline-flex', alignItems: 'center', gap: 8}}>
      <LogoSymbol />
      <span style={{fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em'}}>
        amigo<span style={{color: 'var(--brand)'}}>secreto</span>
      </span>
    </span>
  );
}

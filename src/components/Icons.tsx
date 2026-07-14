type IconProps = { className?: string };

export function IconRain({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M8 18v2M12 17v3M16 18v2" strokeLinecap="round" />
      <path d="M7 15a5 5 0 0 1 1.2-9.8A6 6 0 0 1 19 9.5 3.5 3.5 0 0 1 18 16H8.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconOcean({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M3 12c2 0 2-1.5 4-1.5S9 12 11 12s2-1.5 4-1.5S17 12 19 12s2-1.5 4-1.5" strokeLinecap="round" />
      <path d="M3 16c2 0 2-1.5 4-1.5S9 16 11 16s2-1.5 4-1.5S17 16 19 16s2-1.5 4-1.5" strokeLinecap="round" />
      <path d="M3 8c2 0 2-1.5 4-1.5S9 8 11 8s2-1.5 4-1.5S17 8 19 8s2-1.5 4-1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconNoise({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 12h2l1.5-4 2 8L12 8l2 8 1.5-4H20" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTone({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 5v2M12 17v2M5 12h2M17 12h2M7.05 7.05l1.4 1.4M15.55 15.55l1.4 1.4M7.05 16.95l1.4-1.4M15.55 8.45l1.4-1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconFire({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 21c-3.6 0-6-2.3-6-5.6 0-2.6 1.7-4.4 3-6.1.9-1.2 1.6-2.5 1.6-4.3 2.4 1.2 3.4 3 3.2 5.2 1.2-.4 2-1.2 2.3-2.5 1.6 1.7 1.9 4.4 1.9 5.8 0 4.4-2.4 7.5-6 7.5Z" strokeLinejoin="round" />
      <path d="M12 21c-1.6 0-2.7-1.2-2.7-2.9 0-1.6 1.2-2.6 2.7-4.1 1.5 1.5 2.7 2.5 2.7 4.1 0 1.7-1.1 2.9-2.7 2.9Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconWind({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M3 8h11a2.5 2.5 0 1 0-2.5-2.5" strokeLinecap="round" />
      <path d="M3 12h15a2.5 2.5 0 1 1-2.5 2.5" strokeLinecap="round" />
      <path d="M3 16h8a2 2 0 1 1-2 2" strokeLinecap="round" />
    </svg>
  );
}

export function IconCricket({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 3a5 5 0 0 0-5 5v1a5 5 0 0 0 10 0V8a5 5 0 0 0-5-5Z" />
      <path d="M12 14v4M8 21l4-3 4 3M4 6l3 2M20 6l-3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconStream({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 6c3 0 3 2 6 2s3-2 6-2 3 2 4 2" strokeLinecap="round" />
      <path d="M4 12c3 0 3 2 6 2s3-2 6-2 3 2 4 2" strokeLinecap="round" />
      <path d="M4 18c3 0 3 2 6 2s3-2 6-2 3 2 4 2" strokeLinecap="round" />
      <circle cx="8" cy="9.5" r="0.5" fill="currentColor" />
      <circle cx="16" cy="15.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function soundIcon(id: string) {
  if (id === "rain") return IconRain;
  if (id === "ocean") return IconOcean;
  if (id === "theta") return IconTone;
  if (id === "fire") return IconFire;
  if (id === "wind") return IconWind;
  if (id === "crickets") return IconCricket;
  if (id === "stream") return IconStream;
  return IconNoise;
}

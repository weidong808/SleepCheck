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

export function soundIcon(id: string) {
  if (id === "rain") return IconRain;
  if (id === "ocean") return IconOcean;
  if (id === "theta") return IconTone;
  return IconNoise;
}

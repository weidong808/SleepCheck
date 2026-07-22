import {
  HABITCHECK_URL,
  READINESS_URL,
  RETIRECHECK_URL,
  SITE_SERIES_NAME,
} from "@/lib/brand";

const SIBLINGS = [
  { name: "HabitCheck", href: HABITCHECK_URL },
  { name: "Readiness", href: READINESS_URL },
  { name: "RetireCheck", href: RETIRECHECK_URL },
] as const;

/** Compact series framing under Tonight / About first paint. */
export function SeriesAppsStrip({
  className = "",
  bordered = true,
}: {
  className?: string;
  bordered?: boolean;
}) {
  return (
    <nav
      aria-label={`Also in ${SITE_SERIES_NAME}`}
      className={`${bordered ? "border-t border-border/70 pt-4" : ""} ${className}`.trim()}
    >
      <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
        Also in {SITE_SERIES_NAME}
      </p>
      <ul className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-muted">
        {SIBLINGS.map((app, i) => (
          <li key={app.href} className="flex items-center gap-x-1">
            {i > 0 ? <span aria-hidden>·</span> : null}
            <a
              href={app.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/85 underline-offset-2 transition-colors hover:text-accent hover:underline"
            >
              {app.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

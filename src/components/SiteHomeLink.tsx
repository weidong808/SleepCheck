import Image from "next/image";
import {
  SITE_HOME_LABEL,
  SITE_HOME_URL,
  SITE_SERIES_NAME,
  WS_MARK_SRC,
} from "@/lib/brand";

type SiteHomeLinkProps = {
  /** Compact = mark + domain (header). Full = mark + series label (footer). */
  variant?: "compact" | "full";
  className?: string;
  markSize?: number;
};

/** Parent-brand link back to weidong-shi.com — same mark as the personal site. */
export function SiteHomeLink({
  variant = "compact",
  className = "",
  markSize = 18,
}: SiteHomeLinkProps) {
  return (
    <a
      href={SITE_HOME_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${SITE_HOME_LABEL} — ${SITE_SERIES_NAME}`}
      className={`inline-flex items-center gap-2 transition-colors hover:text-foreground ${className}`}
    >
      <Image
        src={WS_MARK_SRC}
        alt=""
        width={markSize}
        height={markSize}
        unoptimized
        className="shrink-0 rounded"
        style={{ width: markSize, height: markSize }}
      />
      <span className="inline-flex min-w-0 flex-col leading-tight">
        <span>{SITE_HOME_LABEL}</span>
        {variant === "full" ? (
          <span className="mt-0.5 font-mono text-[10px] tracking-[0.14em] text-muted uppercase">
            {SITE_SERIES_NAME}
          </span>
        ) : null}
      </span>
    </a>
  );
}

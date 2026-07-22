import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SeriesAppsStrip } from "@/components/SeriesAppsStrip";
import { SiteHomeLink } from "@/components/SiteHomeLink";
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
  LINKEDIN_ARTICLE_LABEL,
  LINKEDIN_ARTICLE_URL,
  SITE_CASE_STUDY_LABEL,
  SITE_CASE_STUDY_URL,
  SITE_INSIGHT_LABEL,
  SITE_INSIGHT_URL,
  SITE_SERIES_NAME,
} from "@/lib/brand";

export const metadata: Metadata = {
  title: `About · ${APP_NAME}`,
  description: APP_DESCRIPTION,
};

export default function AboutPage() {
  return (
    <main id="main" className="shell max-w-2xl">
      <div className="overflow-hidden border border-border">
        <Image
          src="/og.png"
          alt={`${APP_NAME} — ${APP_TAGLINE}`}
          width={1200}
          height={630}
          priority
          className="h-auto w-full"
        />
      </div>

      <p className="eyebrow mt-6">
        {SITE_SERIES_NAME} · {APP_NAME}
      </p>
      <h1 className="display mt-3 text-4xl text-foreground sm:text-5xl">
        {APP_TAGLINE}
      </h1>

      <div className="mt-6 space-y-4 text-base leading-relaxed text-muted sm:mt-7 sm:space-y-5">
        <p className="text-foreground/90">{APP_DESCRIPTION}</p>
        <p>
          Soundscapes are studio-quality ambience loops rendered offline and
          played locally — layer rain, fire, wind, waves, and more, or mix your
          own. Stories are written content read with your device&apos;s built-in
          speech voice — not a cloud AI narration service. Preferences stay in
          local storage on this device. There is no account and no server-side
          sleep data.
        </p>
        <p>
          <span className="text-foreground">Wellness disclaimer:</span>{" "}
          SleepCheck is a relaxation tool for general wellness. It is not
          medical advice and does not diagnose or treat sleep disorders. If you
          have ongoing sleep problems, talk with a qualified clinician.{" "}
          <Link
            href="/privacy"
            className="text-foreground underline-offset-2 hover:underline"
          >
            Privacy
          </Link>
          .
        </p>
      </div>

      <div className="mt-7 flex flex-wrap gap-3 sm:mt-8">
        <Link href="/" className="btn btn-primary">
          Open SleepCheck
        </Link>
        <a
          href={SITE_CASE_STUDY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
        >
          {SITE_CASE_STUDY_LABEL} ↗
        </a>
        <a
          href={SITE_INSIGHT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
        >
          {SITE_INSIGHT_LABEL} ↗
        </a>
        <a
          href={LINKEDIN_ARTICLE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
        >
          {LINKEDIN_ARTICLE_LABEL} ↗
        </a>
        <SiteHomeLink
          variant="full"
          markSize={22}
          className="btn btn-secondary"
        />
      </div>

      <SeriesAppsStrip className="mt-8" />

      <footer className="mt-10 flex flex-col gap-3 border-t border-border pt-5 pb-2 text-xs text-muted sm:mt-12 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Weidong Shi. All rights reserved.</p>
        <p className="font-mono tracking-wide uppercase">
          {SITE_SERIES_NAME} · Built with Next.js · Deployed on Vercel
        </p>
      </footer>
    </main>
  );
}

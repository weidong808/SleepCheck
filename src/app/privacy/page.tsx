import type { Metadata } from "next";
import Link from "next/link";
import { SiteHomeLink } from "@/components/SiteHomeLink";
import {
  APP_NAME,
  APP_URL,
  SITE_HOME_URL,
  SITE_SERIES_NAME,
} from "@/lib/brand";

export const metadata: Metadata = {
  title: `Privacy · ${APP_NAME}`,
  description: `How ${APP_NAME} handles on-device preferences, wellness framing, and page analytics.`,
};

export default function PrivacyPage() {
  return (
    <main id="main" className="shell max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="touch-target inline-flex items-center text-sm text-muted transition-colors hover:text-foreground"
        >
          ← Back to {APP_NAME}
        </Link>
        <SiteHomeLink
          variant="compact"
          markSize={18}
          className="touch-target text-sm text-muted"
        />
      </div>

      <p className="eyebrow mt-10">
        {SITE_SERIES_NAME} · {APP_NAME}
      </p>
      <h1 className="display mt-4 text-4xl text-foreground sm:text-5xl">
        Privacy
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted">
        What stays on your device, what we do not collect, and how page analytics
        work.
      </p>

      <div className="mt-10 space-y-8 text-base leading-relaxed text-muted">
        <section>
          <h2 className="text-lg text-foreground">On-device preferences</h2>
          <p className="mt-2">
            Mix levels, scenes, timer settings, and streak data stay in this
            browser&apos;s local storage. There is no account and no cloud sleep
            database. Uninstalling the app or clearing site data removes those
            preferences.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">Audio and stories</h2>
          <p className="mt-2">
            Soundscapes play locally in the browser. Stories use your
            device&apos;s built-in speech synthesis — not a cloud narration API.
            {APP_NAME} does not use a microphone or wearable to track sleep.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">Analytics</h2>
          <p className="mt-2">
            The live site at{" "}
            <a
              href={APP_URL}
              className="text-foreground underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {APP_URL.replace("https://", "")}
            </a>{" "}
            may record privacy-friendly page views via Vercel Analytics. Sleep
            preferences and mix data are not sent as analytics events.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">Wellness framing</h2>
          <p className="mt-2">
            {APP_NAME} is a relaxation tool for general wellness. It is not
            medical advice and does not diagnose or treat sleep disorders.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">Related</h2>
          <p className="mt-2">
            Parent site:{" "}
            <a
              href={SITE_HOME_URL}
              className="text-foreground underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              weidong-shi.com
            </a>
            . Product background: <Link href="/about" className="text-foreground underline-offset-2 hover:underline">About</Link>.
          </p>
        </section>
      </div>

      <div className="mt-10">
        <Link href="/" className="btn btn-primary">
          Open {APP_NAME}
        </Link>
      </div>

      <footer className="mt-14 flex flex-col gap-3 border-t border-border pt-5 pb-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Weidong Shi. All rights reserved.</p>
        <p className="font-mono tracking-wide uppercase">
          {SITE_SERIES_NAME} · Privacy
        </p>
      </footer>
    </main>
  );
}

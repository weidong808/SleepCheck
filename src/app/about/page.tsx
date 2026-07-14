import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
  SITE_HOME_URL,
} from "@/lib/brand";

export const metadata: Metadata = {
  title: `About · ${APP_NAME}`,
  description: APP_DESCRIPTION,
};

export default function AboutPage() {
  return (
    <main className="shell max-w-2xl">
      <Link
        href="/"
        className="text-sm text-muted transition-colors hover:text-foreground"
      >
        ← Back to {APP_NAME}
      </Link>

      <div className="mt-8 overflow-hidden border border-border">
        <Image
          src="/og.png"
          alt={`${APP_NAME} — ${APP_TAGLINE}`}
          width={1200}
          height={630}
          priority
          className="h-auto w-full"
        />
      </div>

      <p className="eyebrow mt-10">{APP_NAME}</p>
      <h1 className="display mt-4 text-4xl text-foreground sm:text-5xl">
        {APP_TAGLINE}
      </h1>

      <div className="mt-8 space-y-5 text-base leading-relaxed text-muted">
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
          have ongoing sleep problems, talk with a qualified clinician.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/" className="btn btn-primary">
          Open SleepCheck
        </Link>
        <a
          href={SITE_HOME_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
        >
          weidong-shi.com
        </a>
      </div>
    </main>
  );
}

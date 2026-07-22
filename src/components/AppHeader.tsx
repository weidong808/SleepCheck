"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHomeLink } from "@/components/SiteHomeLink";
import { APP_NAME, APP_TAGLINE, SITE_SERIES_NAME } from "@/lib/brand";

const NAV: { href: string; label: string; exact?: boolean }[] = [
  { href: "/", label: "Tonight", exact: true },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
];

const navIdle =
  "rounded-md px-2.5 py-1.5 text-muted transition-colors duration-160 hover:text-foreground";
const navActive =
  "rounded-md px-2.5 py-1.5 font-medium text-foreground shadow-[inset_0_-2px_0_0_var(--accent)]";

type AppHeaderProps = {
  /** Optional trailing control (e.g. streak) rendered before primary links. */
  trailing?: ReactNode;
};

export function AppHeader({ trailing }: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-[var(--header-bg)] pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1080px] items-center justify-between gap-4 px-[max(1.25rem,env(safe-area-inset-left,0px))] pr-[max(1.25rem,env(safe-area-inset-right,0px))] sm:px-5">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2.5"
          aria-label={`${APP_NAME} home`}
        >
          <Image
            src="/icon-192.png"
            alt=""
            width={36}
            height={36}
            priority
            className="h-9 w-9 shrink-0 rounded-lg border border-border transition-colors group-hover:border-accent/50"
          />
          <span className="min-w-0">
            <span className="display block truncate text-lg leading-none text-foreground transition-colors group-hover:text-accent sm:text-xl">
              {APP_NAME}
            </span>
            <span className="mt-1 block truncate font-mono text-[10px] tracking-[0.14em] text-muted uppercase">
              {SITE_SERIES_NAME} · {APP_TAGLINE}
            </span>
          </span>
        </Link>

        <nav
          className="flex shrink-0 items-center gap-0.5 text-sm sm:gap-1"
          aria-label="Primary"
        >
          {trailing}
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? navActive : navIdle}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <SiteHomeLink
            variant="compact"
            markSize={18}
            className="ml-0.5 hidden text-muted sm:inline-flex"
          />
        </nav>
      </div>
    </header>
  );
}

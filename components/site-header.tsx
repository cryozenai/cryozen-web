"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "@/components/logo";
import { GitHubIcon } from "@/components/icons";
import { primaryButton } from "@/components/ui";
import { githubUrl, nav } from "@/lib/site";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Anything that navigates closes the sheet, so a route change never leaves it
  // hanging open.
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-hairline/70 bg-ground/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 lg:px-8">
        <Link href="/" aria-label="CryoZen home" className="shrink-0">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => {
            const active = !("external" in item) && pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                {...("external" in item && item.external
                  ? { target: "_blank", rel: "noreferrer" }
                  : {})}
                className={`rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
                  active ? "text-core" : "text-muted hover:text-core"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="CryoZen on GitHub"
            className="hidden rounded-md p-2 text-muted transition-colors duration-150 hover:text-core sm:inline-flex"
          >
            <GitHubIcon className="size-5" />
          </a>
          <Link
            href="/download"
            className={`${primaryButton} hidden px-4 py-2 sm:inline-flex`}
          >
            Download
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex rounded-md p-2 text-ink md:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              className="size-5"
              aria-hidden="true"
            >
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <nav id="mobile-nav" className="border-t border-hairline bg-ground/95 md:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col px-6 py-3">
            {nav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                {...("external" in item && item.external
                  ? { target: "_blank", rel: "noreferrer" }
                  : {})}
                onClick={close}
                className="rounded-md px-2 py-3 text-sm text-ink hover:text-core"
              >
                {item.label}
              </Link>
            ))}
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md px-2 py-3 text-sm text-ink hover:text-core"
            >
              GitHub
            </a>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

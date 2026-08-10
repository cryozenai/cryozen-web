"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { PlatformId } from "@/lib/platforms";
import { PlatformIcon } from "@/components/platform-icon";

export type DownloadLinks = Record<PlatformId, string>;

/**
 * Best-effort client detection. Mobile browsers get no desktop suggestion:
 * Android reports "Linux" and there is nothing for them to install.
 */
function detectPlatform(): PlatformId | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return null;
  if (/Mac/i.test(ua)) return "macos";
  if (/Win/i.test(ua)) return "windows";
  if (/Linux|X11|CrOS/i.test(ua)) return "linux";
  return null;
}

const labels: Record<PlatformId, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
  docker: "Docker",
};

/** The user agent never changes under us, so there is nothing to subscribe to. */
const subscribe = () => () => {};
const serverSnapshot = () => null;

export function DownloadCta({
  links,
  sizes,
}: {
  links: DownloadLinks;
  sizes: Partial<Record<PlatformId, string | null>>;
}) {
  // Null on the server and during hydration, then the detected platform.
  const platform = useSyncExternalStore(subscribe, detectPlatform, serverSnapshot);

  const size = platform ? sizes[platform] : null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {platform ? (
          <a
            href={links[platform]}
            className="inline-flex items-center justify-center gap-2.5 rounded-lg bg-primary px-6 py-3.5 text-sm font-semibold text-base shadow-[0_0_50px_-12px_var(--color-primary)] transition-colors duration-150 hover:bg-glow"
          >
            <PlatformIcon platform={platform} className="size-5" />
            Download for {labels[platform]}
          </a>
        ) : (
          <Link
            href="/download"
            className="inline-flex items-center justify-center gap-2.5 rounded-lg bg-primary px-6 py-3.5 text-sm font-semibold text-base shadow-[0_0_50px_-12px_var(--color-primary)] transition-colors duration-150 hover:bg-glow"
          >
            Download CryoZen
          </Link>
        )}

        <Link
          href="/download"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-hairline bg-surface/80 px-6 py-3.5 text-sm font-semibold text-ink transition-colors duration-150 hover:border-primary/50 hover:text-core"
        >
          All platforms
        </Link>
      </div>

      <p className="text-xs text-muted">
        {platform
          ? `${size ? `${size} · ` : ""}Free to download. Runs entirely on your machine.`
          : "Available for macOS, Windows, Linux, and Docker."}
      </p>
    </div>
  );
}

import type { ReactNode } from "react";
import { desktopAddress } from "@/lib/media/address";

/**
 * The window a capture plays in: the three window controls and an address bar
 * showing where the desktop app serves, so a recording reads as the product
 * running on the visitor's own machine rather than as a hosted page.
 *
 * It has no state and no browser APIs, so it renders on the server; it is also
 * safe to render from a client component, which the tour chapter does.
 * `children` are the media. The frame adds no height of its own beyond the
 * title bar, so the media's fixed aspect ratio is what reserves the space.
 */
export function AppFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`panel overflow-hidden rounded-2xl ${className}`}>
      <div className="flex items-center gap-2 border-b border-hairline bg-elevated/60 px-4 py-3">
        {/* Decorative: the controls do nothing, so they are hidden from assistive tech. */}
        <span aria-hidden="true" className="flex gap-2">
          <span className="size-2.5 rounded-full bg-[#2b3a49]" />
          <span className="size-2.5 rounded-full bg-[#2b3a49]" />
          <span className="size-2.5 rounded-full bg-[#2b3a49]" />
        </span>
        <span className="ml-3 min-w-0 truncate font-mono text-[11px] text-muted">{desktopAddress}</span>
      </div>
      {children}
    </div>
  );
}

/**
 * What a frame holds when its recording does not exist yet: the same box the
 * video would occupy, so a page lays out identically before and after the
 * capture lands, with the surface named instead of an empty rectangle.
 */
export function StaticFrame({
  label,
  width = 1280,
  height = 800,
}: {
  label: string;
  width?: number;
  height?: number;
}) {
  return (
    <div
      className="relative grid w-full place-items-center bg-ground"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,color-mix(in_oklab,var(--color-primary)_14%,transparent),transparent)]"
      />
      <p className="relative px-6 text-center text-lg font-semibold tracking-tight text-core text-balance">
        {label}
      </p>
    </div>
  );
}

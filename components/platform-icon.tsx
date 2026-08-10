import type { PlatformId } from "@/lib/platforms";

const paths: Record<PlatformId, React.ReactNode> = {
  // A laptop: the desktop app on a personal machine.
  macos: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="2" />
      <path d="M1.5 19.5h21" strokeLinecap="round" />
    </>
  ),
  // Four panes.
  windows: (
    <>
      <rect x="3" y="3.5" width="8" height="8" rx="1" />
      <rect x="13" y="3.5" width="8" height="8" rx="1" />
      <rect x="3" y="13.5" width="8" height="8" rx="1" />
      <rect x="13" y="13.5" width="8" height="8" rx="1" />
    </>
  ),
  // A shell prompt.
  linux: (
    <>
      <rect x="2.5" y="3.5" width="19" height="17" rx="2.5" />
      <path d="m7 9.5 3 3-3 3M12.5 15.5H17" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // Stacked containers on a hull.
  docker: (
    <>
      <rect x="3" y="11" width="4.5" height="4.5" rx="0.75" />
      <rect x="9" y="11" width="4.5" height="4.5" rx="0.75" />
      <rect x="9" y="6" width="4.5" height="4" rx="0.75" />
      <rect x="15" y="11" width="4.5" height="4.5" rx="0.75" />
      <path
        d="M2 18.5h15c2.5 0 4.2-1.3 5-3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
};

export function PlatformIcon({
  platform,
  className = "size-6",
}: {
  platform: PlatformId;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {paths[platform]}
    </svg>
  );
}

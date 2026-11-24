import type { ReactNode } from "react";
import { monoLabel } from "@/components/home/primitives";
import { SyncedRecording } from "@/components/media/synced-recording";
import type { Capture } from "@/lib/media/types";

/**
 * A recording beside the moments it marks, headed the way the home page and
 * the feature pages label things. `children` sits under the moments and can
 * be rendered on the server.
 */
export function SyncedCapture({
  capture,
  stepsLabel,
  priority = false,
  children,
}: {
  capture: Capture;
  /** The heading over the list of moments. */
  stepsLabel: string;
  priority?: boolean;
  children?: ReactNode;
}) {
  return (
    <SyncedRecording
      capture={capture}
      label={capture.title}
      stepsHeading={<p className={`${monoLabel} text-primary`}>{stepsLabel}</p>}
      priority={priority}
    >
      {children}
    </SyncedRecording>
  );
}

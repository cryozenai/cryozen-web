import type { ReactNode } from "react";
import { AppFrame, StaticFrame } from "@/components/media/app-frame";
import { ProductVideo } from "@/components/media/product-video";
import { ShortenedNote } from "@/components/media/shortened-note";
import type { Capture } from "@/lib/media/types";

/**
 * An app window with a recording in it, or a static frame naming the surface
 * when the recording does not exist yet. The two occupy the same box, so a
 * page lays out identically before and after a recording lands. `children` is
 * the caption under the window.
 */
export function SurfaceFrame({
  capture,
  label,
  priority = false,
  children,
}: {
  capture: Capture | null;
  /** What the static frame says when there is no recording. */
  label: string;
  priority?: boolean;
  children?: ReactNode;
}) {
  return (
    <figure className="min-w-0">
      <AppFrame>
        {capture ? (
          <ProductVideo capture={capture} priority={priority} loop />
        ) : (
          <StaticFrame label={label} />
        )}
      </AppFrame>
      {capture?.realDuration !== undefined || children ? (
        <figcaption className="mt-4 space-y-2">
          {capture ? <ShortenedNote capture={capture} /> : null}
          {children}
        </figcaption>
      ) : null}
    </figure>
  );
}

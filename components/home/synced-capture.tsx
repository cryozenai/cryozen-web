"use client";

import { useRef, useState, type ReactNode } from "react";
import { AppFrame } from "@/components/media/app-frame";
import { ProductVideo, type ProductVideoHandle } from "@/components/media/product-video";
import { ShortenedNote } from "@/components/media/shortened-note";
import { monoLabel } from "@/components/home/primitives";
import { activeStepIndex, formatTimecode } from "@/lib/media/step-sync";
import type { Capture } from "@/lib/media/types";

/**
 * A recording beside the moments it marks: pressing a moment plays from it,
 * and the one on screen is highlighted while the recording runs.
 *
 * `children` is whatever else belongs in the column beside the player, such as
 * a how-to rendered on the server; only the player and its list of moments
 * need the browser. `layout="stacked"` puts the moments under the player, for
 * a frame that has only half the page.
 */
export function SyncedCapture({
  capture,
  stepsLabel,
  layout = "split",
  priority = false,
  autoPlay = true,
  children,
}: {
  capture: Capture;
  /** The heading over the list of moments. */
  stepsLabel: string;
  layout?: "split" | "stacked";
  priority?: boolean;
  autoPlay?: boolean;
  children?: ReactNode;
}) {
  const player = useRef<ProductVideoHandle>(null);
  const [time, setTime] = useState(0);
  // False until something has played, so no moment is marked current on a
  // recording that has not started.
  const [started, setStarted] = useState(false);
  const active = started
    ? activeStepIndex(
        capture.steps.map((step) => step.at),
        time,
      )
    : -1;

  return (
    <div
      className={
        layout === "split"
          ? "grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start"
          : "grid gap-5"
      }
    >
      <div className="min-w-0">
        <AppFrame>
          <ProductVideo
            ref={player}
            capture={capture}
            autoPlay={autoPlay}
            priority={priority}
            loop
            onTimeUpdate={setTime}
            onPlayingChange={(playing) => {
              if (playing) setStarted(true);
            }}
          />
        </AppFrame>
        <ShortenedNote capture={capture} className="mt-3" />
        <details className="mt-3 rounded-lg border border-hairline bg-surface/60 px-4 py-3 text-sm/6 text-muted">
          <summary className="cursor-pointer font-medium text-ink">Transcript: {capture.title}</summary>
          <p className="mt-3 whitespace-pre-line text-pretty">{capture.transcript}</p>
        </details>
      </div>

      <div className="min-w-0 space-y-8">
        {capture.steps.length > 0 ? (
          <div>
            <p className={`${monoLabel} text-primary`}>{stepsLabel}</p>
            <ol className="mt-3 space-y-1">
              {capture.steps.map((step, index) => {
                const current = index === active;
                return (
                  <li key={step.at} aria-current={current ? "step" : undefined}>
                    <button
                      type="button"
                      onClick={() => {
                        setStarted(true);
                        setTime(step.at);
                        player.current?.seek(step.at);
                      }}
                      className={`flex min-h-11 w-full cursor-pointer items-baseline gap-3 rounded-lg border-l-2 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-primary/5 ${
                        current ? "border-primary bg-primary/10" : "border-transparent"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`w-5 shrink-0 font-mono text-xs ${current ? "text-primary" : "text-muted"}`}
                      >
                        {index + 1}
                      </span>
                      <span
                        className={`min-w-0 flex-1 text-sm/6 text-pretty ${
                          current ? "font-semibold text-core" : "font-medium text-ink"
                        }`}
                      >
                        {step.label}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-muted">
                        <span className="sr-only">Play from </span>
                        {formatTimecode(step.at)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

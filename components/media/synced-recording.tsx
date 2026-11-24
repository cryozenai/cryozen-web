"use client";

import { useRef, useState, type ReactNode } from "react";
import { AppFrame, StaticFrame } from "@/components/media/app-frame";
import { ProductVideo, type ProductVideoHandle } from "@/components/media/product-video";
import { ShortenedNote } from "@/components/media/shortened-note";
import { activeStepIndex, chapterTimeline, formatTimecode } from "@/lib/media/step-sync";
import type { TimedStep } from "@/lib/media/step-sync";
import type { Capture } from "@/lib/media/types";

/**
 * A recording beside the moments it marks: pressing a moment plays from it,
 * and the one on screen is highlighted while the recording runs. Under the
 * player sit the shortened-recording note and the transcript.
 *
 * `children` is whatever else belongs in the column beside the player, under
 * the moments; only the player and its list of moments need the browser, so
 * a server page can render the rest. With `capture` null the player is a
 * static frame named by `label`, and there are no moments.
 */
export function SyncedRecording({
  capture,
  label,
  stepsHeading,
  priority = false,
  autoPlay = true,
  className = "",
  playerClassName = "",
  children,
}: {
  capture: Capture | null;
  /** Names the static frame shown when there is no recording. */
  label: string;
  /** The heading over the list of moments. */
  stepsHeading: ReactNode;
  /** The poster is above the fold: fetch it first. */
  priority?: boolean;
  autoPlay?: boolean;
  className?: string;
  playerClassName?: string;
  children?: ReactNode;
}) {
  const player = useRef<ProductVideoHandle>(null);
  const [time, setTime] = useState(0);
  // False until the visitor has seen any playback, so no moment is marked
  // current on a recording that has not started.
  const [started, setStarted] = useState(false);

  const { clip } = chapterTimeline([], capture);
  const active = started ? activeStepIndex(capture?.steps.map((step) => step.at) ?? [], time) : -1;
  const seek = (seconds: number) => {
    setStarted(true);
    setTime(seconds);
    player.current?.seek(seconds);
  };

  return (
    <div className={`grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start ${className}`}>
      <div className={`min-w-0 ${playerClassName}`}>
        <AppFrame>
          {capture ? (
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
          ) : (
            <StaticFrame label={label} />
          )}
        </AppFrame>

        {capture ? <ShortenedNote capture={capture} className="mt-3" /> : null}

        {capture ? (
          <details className="mt-3 rounded-lg border border-hairline bg-surface/60 px-4 py-3 text-sm/6 text-muted">
            <summary className="cursor-pointer font-medium text-ink">
              Transcript: {capture.title}
            </summary>
            <p className="mt-3 whitespace-pre-line text-pretty">{capture.transcript}</p>
          </details>
        ) : null}
      </div>

      <div className="min-w-0 space-y-8">
        {clip.length > 0 ? (
          <div>
            {stepsHeading}
            <StepList steps={clip} active={active} onSeek={seek} />
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

/**
 * A numbered list in which every step with a time is a button that jumps to
 * it. A native button gives Enter, Space, and focus handling for free. The
 * step on screen is marked with `aria-current="step"` and with a bar and a
 * heavier weight, never with colour alone.
 */
export function StepList({
  steps,
  active = -1,
  onSeek,
}: {
  steps: readonly TimedStep[];
  active?: number;
  onSeek?: (seconds: number) => void;
}) {
  return (
    <ol className="mt-3 space-y-1">
      {steps.map((step, index) => {
        const current = index === active;
        const body = (
          <>
            <span
              aria-hidden="true"
              className={`mt-0.5 w-5 shrink-0 font-mono text-xs ${current ? "text-primary" : "text-muted"}`}
            >
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block text-sm/6 text-pretty ${current ? "font-semibold text-core" : "font-medium text-ink"}`}
              >
                {step.title}
              </span>
              {step.detail ? (
                <span className="mt-0.5 block text-sm/6 text-pretty text-muted">{step.detail}</span>
              ) : null}
            </span>
          </>
        );
        const frame = `flex min-h-11 w-full gap-3 rounded-lg border-l-2 px-3 py-2.5 text-left ${
          current ? "border-primary bg-primary/10" : "border-transparent"
        }`;

        const at = step.at;

        return (
          <li key={`${index}-${step.title}`} aria-current={current ? "step" : undefined}>
            {at === null || onSeek === undefined ? (
              <div className={frame}>{body}</div>
            ) : (
              <button
                type="button"
                onClick={() => onSeek(at)}
                className={`${frame} cursor-pointer transition-colors duration-150 hover:bg-primary/5`}
              >
                {body}
                <span className="mt-0.5 shrink-0 font-mono text-xs text-muted">
                  <span className="sr-only">Play from </span>
                  {formatTimecode(at)}
                </span>
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AppFrame, StaticFrame } from "@/components/media/app-frame";
import { ProductVideo, type ProductVideoHandle } from "@/components/media/product-video";
import { textLink } from "@/components/ui";
import { activeStepIndex, chapterTimeline, formatTimecode } from "@/lib/media/step-sync";
import type { TimedStep } from "@/lib/media/step-sync";
import type { Capture } from "@/lib/media/types";
import { docsHref, privacyLabels } from "@/lib/product/types";
import type { Surface } from "@/lib/product/types";

/**
 * One chapter of the tour: the recording of a surface beside the steps to do
 * it yourself, with what it needs, what leaves the machine, and where to read
 * more.
 *
 * Presentational only. Everything it shows comes from the `Surface` and the
 * `Capture` it is handed, so a server page looks both up and passes them in;
 * with `capture` null the chapter is the same layout around a static frame.
 * The section's id is the surface id, which is what makes `/tour#<surface>`
 * a link to it.
 */
export function Chapter({
  surface,
  capture,
  headingLevel = 2,
  priority = false,
  autoPlay = true,
}: {
  surface: Surface;
  capture: Capture | null;
  headingLevel?: 2 | 3;
  /** This chapter's poster is above the fold: fetch it first. */
  priority?: boolean;
  autoPlay?: boolean;
}) {
  const player = useRef<ProductVideoHandle>(null);
  const [time, setTime] = useState(0);
  // False until the visitor has seen any playback, so no step is marked
  // current on a recording that has not started.
  const [started, setStarted] = useState(false);

  const { clip, guide } = chapterTimeline(surface.howTo, capture);
  const active = started ? activeStepIndex(capture?.steps.map((step) => step.at) ?? [], time) : -1;

  const Heading = `h${headingLevel}` as const;
  const SubHeading = `h${headingLevel + 1}` as "h3" | "h4";
  const titleId = `${surface.id}-title`;
  const seek = (seconds: number) => {
    setStarted(true);
    setTime(seconds);
    player.current?.seek(seconds);
  };

  return (
    <section id={surface.id} aria-labelledby={titleId} className="scroll-mt-24">
      <header className="max-w-2xl">
        <Heading
          id={titleId}
          className="text-2xl font-semibold tracking-tight text-core text-balance sm:text-3xl"
        >
          {surface.name}
        </Heading>
        <p className="mt-3 text-lg/7 text-ink text-pretty">{surface.tagline}</p>
        <p className="mt-3 text-base/7 text-muted text-pretty">{surface.summary}</p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <div className="min-w-0">
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
              <StaticFrame label={surface.name} />
            )}
          </AppFrame>

          {capture ? (
            <details className="mt-4 rounded-lg border border-hairline bg-surface/60 px-4 py-3 text-sm/6 text-muted">
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
              <SubHeading className={subHeading}>In this recording</SubHeading>
              <StepList steps={clip} active={active} onSeek={seek} />
            </div>
          ) : null}

          <div>
            <SubHeading className={subHeading}>How to use it</SubHeading>
            <StepList steps={guide} active={-1} onSeek={seek} />
          </div>

          {surface.prerequisites.length > 0 ? (
            <div>
              <SubHeading className={subHeading}>Before you start</SubHeading>
              <ul className="mt-3 space-y-2 text-sm/6 text-muted">
                {surface.prerequisites.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2.5 size-1 shrink-0 rounded-full bg-primary" />
                    <span className="text-pretty">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <SubHeading className={subHeading}>What leaves your machine</SubHeading>
            <p className="mt-3 text-sm/6 text-pretty text-muted">
              <strong className="font-semibold text-core">
                {privacyLabels[surface.privacy.leaves]}.
              </strong>{" "}
              {surface.privacy.detail}
            </p>
          </div>

          {surface.teams ? (
            <div>
              <SubHeading className={subHeading}>On a shared instance</SubHeading>
              <p className="mt-3 text-sm/6 text-pretty text-muted">{surface.teams}</p>
            </div>
          ) : null}

          {surface.docs !== null ? (
            <p className="text-sm/6">
              <Link href={docsHref(surface.docs)} className={textLink}>
                {surface.name} in the docs
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

const subHeading = "text-xs font-medium tracking-[0.14em] text-primary uppercase";

/**
 * A numbered list in which every step the recording shows is a button that
 * jumps to it. A native button gives Enter, Space, and focus handling for
 * free. The step on screen is marked with `aria-current="step"` and with a
 * bar and a heavier weight, never with colour alone.
 */
function StepList({
  steps,
  active,
  onSeek,
}: {
  steps: readonly TimedStep[];
  active: number;
  onSeek: (seconds: number) => void;
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
            {at === null ? (
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

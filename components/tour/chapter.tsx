"use client";

import Link from "next/link";
import { StepList, SyncedRecording } from "@/components/media/synced-recording";
import { textLink } from "@/components/ui";
import { chapterTimeline } from "@/lib/media/step-sync";
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
  const { guide } = chapterTimeline(surface.howTo, capture);

  const Heading = `h${headingLevel}` as const;
  const SubHeading = `h${headingLevel + 1}` as "h3" | "h4";
  const titleId = `${surface.id}-title`;

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

      {/*
       * The column beside the player is several times its height. Pinning the
       * player keeps the recording in view while the steps are read, so
       * pressing a step is seen to do something. The offset clears the site
       * header and the tour's chapter index.
       */}
      <SyncedRecording
        capture={capture}
        label={surface.name}
        stepsHeading={<SubHeading className={subHeading}>In this recording</SubHeading>}
        priority={priority}
        autoPlay={autoPlay}
        className="mt-8"
        playerClassName="lg:sticky lg:top-32"
      >
        <div>
          <SubHeading className={subHeading}>How to use it</SubHeading>
          <StepList steps={guide} />
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
      </SyncedRecording>
    </section>
  );
}

const subHeading = "text-xs font-medium tracking-[0.14em] text-primary uppercase";


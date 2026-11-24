/**
 * Which step of a walkthrough is on screen at a given moment of its recording.
 *
 * Pure and dependency-free so it can be tested without a browser; the tour
 * chapter calls it on every time update of the player.
 */

/**
 * `cues[i]` is the second at which step `i` begins, or null for a step the
 * recording does not show. Returns the index of the step that is active at
 * `time`: the one with the latest cue at or before it. Returns -1 before the
 * first cue, when no step is timed, or when `time` is not a real number.
 *
 * Cues need not be sorted. If two steps share a cue the later one wins, which
 * is what a viewer sees: the second step replaces the first on the same frame.
 */
export function activeStepIndex(cues: readonly (number | null)[], time: number): number {
  if (!Number.isFinite(time)) return -1;
  let active = -1;
  let latest = -Infinity;
  cues.forEach((cue, index) => {
    if (cue !== null && cue <= time && cue >= latest) {
      active = index;
      latest = cue;
    }
  });
  return active;
}

/** `75.4` becomes `1:15`: a cue as a viewer reads it on a player. */
export function formatTimecode(seconds: number): string {
  const whole = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, "0")}`;
}

/** A how-to step as the content model writes it; `at` is seconds into the capture. */
export interface GuideStep {
  title: string;
  detail?: string;
  at?: number;
}

/** A step as a chapter lists it: `at` is null when the recording does not show it. */
export interface TimedStep {
  title: string;
  detail?: string;
  at: number | null;
}

export interface ChapterTimeline {
  /** The moments the recording marks, listed only when the how-to carries no cues of its own. */
  clip: TimedStep[];
  /** The how-to, always listed in full. */
  guide: TimedStep[];
}

/**
 * Decides which list follows the recording.
 *
 * The how-to is written from the product, the recording's own step marks are
 * written by whoever recorded it, and the two are not guaranteed to line up
 * one to one. So nothing is matched by position:
 * - without a recording, the how-to is a plain list;
 * - if the how-to carries cues, it is the synced list and the recording's
 *   marks are not repeated beside it;
 * - otherwise the recording's marks are the synced list and the how-to stays
 *   a plain list under it.
 */
export function chapterTimeline(
  howTo: readonly GuideStep[],
  capture: { steps: readonly { at: number; label: string }[] } | null,
): ChapterTimeline {
  const cued = capture !== null && howTo.some((step) => step.at !== undefined);
  return {
    clip:
      capture === null || cued
        ? []
        : capture.steps.map((step) => ({ title: step.label, at: step.at })),
    guide: howTo.map((step) => ({
      title: step.title,
      ...(step.detail === undefined ? {} : { detail: step.detail }),
      at: cued ? (step.at ?? null) : null,
    })),
  };
}

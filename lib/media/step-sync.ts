/**
 * Which step of a walkthrough is on screen at a given moment of its recording.
 *
 * Pure and dependency-free so it can be tested without a browser; the tour
 * chapter calls it on every time update of the player.
 */

/**
 * `cues[i]` is the second at which step `i` begins. Returns the index of the
 * step that is active at `time`: the one with the latest cue at or before it.
 * Returns -1 before the first cue, when there are no cues, or when `time` is
 * not a real number.
 *
 * Cues need not be sorted. If two steps share a cue the later one wins, which
 * is what a viewer sees: the second step replaces the first on the same frame.
 */
export function activeStepIndex(cues: readonly number[], time: number): number {
  if (!Number.isFinite(time)) return -1;
  let active = -1;
  let latest = -Infinity;
  cues.forEach((cue, index) => {
    if (cue <= time && cue >= latest) {
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

/**
 * `101` becomes `1 min 41 s`: a length of real time in words, for the note
 * that says how long a shortened recording actually took.
 */
export function formatSpan(seconds: number): string {
  const whole = Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0;
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  if (minutes === 0) return `${rest} s`;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}

/** A how-to step as the content model writes it: untimed, because the recording owns timing. */
export interface GuideStep {
  title: string;
  detail?: string;
}

/** A step as a chapter lists it: `at` is null for a how-to step, which is never seekable. */
export interface TimedStep {
  title: string;
  detail?: string;
  at: number | null;
}

export interface ChapterTimeline {
  /** The moments the recording marks: the synced list, empty without a recording. */
  clip: TimedStep[];
  /** The how-to, always listed in full and never synced. */
  guide: TimedStep[];
}

/**
 * Splits a chapter into the list that follows the recording and the list that
 * does not.
 *
 * The how-to is written from the product, the recording's own step marks are
 * written by whoever recorded it, and the two are not guaranteed to line up
 * one to one. So nothing is matched by position: the recording's marks are
 * the only timing, and the how-to stays a plain list under them.
 */
export function chapterTimeline(
  howTo: readonly GuideStep[],
  capture: { steps: readonly { at: number; label: string }[] } | null,
): ChapterTimeline {
  return {
    clip: capture === null ? [] : capture.steps.map((step) => ({ title: step.label, at: step.at })),
    guide: howTo.map((step) => ({
      title: step.title,
      ...(step.detail === undefined ? {} : { detail: step.detail }),
      at: null,
    })),
  };
}

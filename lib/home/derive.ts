/**
 * How the home page, the tour, and the feature pages arrange the surfaces.
 *
 * `lib/product` says what each surface is; this says where it goes: which
 * chapter of the tour, what sits beside it, and which reach of the egress
 * ledger it falls under. Everything is a pure function of the surface list it
 * is handed, so `scripts/home.test.mjs` checks it against worked examples
 * rather than against the live content.
 */
import { getCapture } from "@/lib/media/index";
import type { Capture } from "@/lib/media/types";
import { surfaces } from "@/lib/product/surfaces";
import { groupLabels } from "@/lib/product/types";
import type { PrivacyReach, Surface, SurfaceGroup } from "@/lib/product/types";

/** The order the kinds of work are presented in, on every page. */
export const groupOrder: readonly SurfaceGroup[] = ["converse", "know", "organize", "run", "build"];

/** Narrowest reach first: the ledger reads from "nothing leaves" outward. */
export const reachOrder: readonly PrivacyReach[] = ["nothing", "chosen-provider", "configured-service"];

/** The parts of a surface the arranging logic reads; a full `Surface` fits. */
type Placed = Pick<Surface, "id" | "group">;

export interface TourChapter<S extends Placed = Surface> {
  /** 1-based position in the tour, counted across groups. */
  number: number;
  surface: S;
}

export interface TourGroup<S extends Placed = Surface> {
  group: SurfaceGroup;
  label: string;
  chapters: TourChapter<S>[];
}

/**
 * The tour's chapters: the surfaces gathered by kind of work, in `groupOrder`,
 * each group keeping the order `lib/product` lists its surfaces in. Chapter
 * numbers run on across groups, and a group with no surface is left out.
 */
export function tourGroups<S extends Placed>(all: readonly S[]): TourGroup<S>[] {
  let number = 0;
  return groupOrder
    .map((group) => ({
      group,
      label: groupLabels[group],
      chapters: all
        .filter((surface) => surface.group === group)
        .map((surface) => ({ number: (number += 1), surface })),
    }))
    .filter((entry) => entry.chapters.length > 0);
}

/** Every chapter in the order the tour page shows them. */
export function tourChapters<S extends Placed>(all: readonly S[]): TourChapter<S>[] {
  return tourGroups(all).flatMap((entry) => entry.chapters);
}

/** The chapters before and after a surface in the tour; null at either end or for an unknown id. */
export function tourNeighbors<S extends Placed>(
  all: readonly S[],
  id: string,
): { previous: TourChapter<S> | null; next: TourChapter<S> | null } {
  const chapters = tourChapters(all);
  const at = chapters.findIndex((chapter) => chapter.surface.id === id);
  if (at === -1) return { previous: null, next: null };
  return { previous: chapters[at - 1] ?? null, next: chapters[at + 1] ?? null };
}

/**
 * Up to `limit` surfaces to read next: first the others that do the same kind
 * of work, then, if that is short, the chapters that follow in the tour,
 * wrapping to the start. Never the surface itself, never one twice.
 */
export function relatedSurfaces<S extends Placed>(all: readonly S[], id: string, limit = 3): S[] {
  const ordered = tourChapters(all).map((chapter) => chapter.surface);
  const at = ordered.findIndex((surface) => surface.id === id);
  if (at === -1) return [];
  const self = ordered[at];
  const sameGroup = ordered.filter((surface) => surface.group === self.group && surface !== self);
  const following = [...ordered.slice(at + 1), ...ordered.slice(0, at)].filter(
    (surface) => surface.group !== self.group,
  );
  return [...sameGroup, ...following].slice(0, limit);
}

export interface LedgerRow<S> {
  reach: PrivacyReach;
  surfaces: S[];
}

/**
 * The egress ledger: every surface filed under the furthest its data travels,
 * narrowest reach first. Every reach has a row, even an empty one, so the
 * table always shows all three.
 */
export function egressLedger<S extends { privacy: { leaves: PrivacyReach } }>(
  all: readonly S[],
): LedgerRow<S>[] {
  return reachOrder.map((reach) => ({
    reach,
    surfaces: all.filter((surface) => surface.privacy.leaves === reach),
  }));
}

/**
 * The first of `ids` that has a recording, or null. A slot lists the take it
 * wants and what may stand in for it, so a page gains the preferred recording
 * the moment its files land and never needs a code change to do so.
 */
export function firstCapture(
  ids: readonly string[],
  lookup: (id: string) => Capture | null = getCapture,
): Capture | null {
  for (const id of ids) {
    const capture = lookup(id);
    if (capture !== null) return capture;
  }
  return null;
}

/**
 * A surface as a client component may receive it. `evidence` names files in
 * the private product repository; anything passed to a client component is
 * serialized into the page, so it is emptied first.
 */
export function publicSurface(surface: Surface): Surface {
  return { ...surface, evidence: [] };
}

export const tour = tourGroups(surfaces);

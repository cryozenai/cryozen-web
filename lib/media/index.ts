import { parseManifest } from "@/lib/media/parse";
import rawManifest from "./manifest.json" with { type: "json" };
import type { Capture, CaptureId } from "./types";

/**
 * The recordings that exist, checked at load. Server-side only by convention:
 * a client component takes the one `Capture` it plays as a prop, so the whole
 * manifest never ships to the browser.
 */
export const manifest = parseManifest(rawManifest);

const byId = new Map<string, Capture>(manifest.captures.map((capture) => [capture.id, capture]));

export const captureIds: readonly CaptureId[] = manifest.captures.map((capture) => capture.id);

/**
 * The typed id for a recording, or null if it has not been made yet. This is
 * the only way to get a `CaptureId`, which is what keeps a surface from
 * pointing at a recording that does not exist.
 */
export function findCaptureId(id: string): CaptureId | null {
  return byId.get(id)?.id ?? null;
}

/**
 * The capture with this id, or null. Null is a supported state, not an error:
 * a page whose recording is missing renders a static frame instead of a player.
 */
export function getCapture(id: string | null): Capture | null {
  return id === null ? null : (byId.get(id) ?? null);
}

export type * from "./types";

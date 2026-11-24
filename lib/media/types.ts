/**
 * The media contract between the capture stream, which records the product,
 * and the site, which plays the recordings back.
 *
 * Files live at `public/media/<version>/<capture-id>.{webm,mp4,avif,webp,vtt}`
 * and `lib/media/manifest.json` describes them. Everything here is plain data,
 * so a `Capture` crosses the server/client boundary as a prop.
 */

export type ReleaseVersion = `v${number}.${number}.${number}`;

declare const captureIdBrand: unique symbol;

/**
 * The id of a capture that is in the manifest.
 *
 * A JSON import types every id as `string`, so a literal union cannot be
 * derived from the manifest at compile time. The brand does the same job at
 * the one place it matters: the only way to obtain a `CaptureId` is to ask the
 * loaded manifest for it, so a reference to a recording that was never made
 * cannot be written down.
 */
export type CaptureId = string & { readonly [captureIdBrand]: true };

export interface CapturePoster {
  avif: string;
  webp: string;
}

export interface CaptureSource {
  src: string;
  /** A full MIME type with codecs, so the browser can skip what it cannot play. */
  type: string;
}

export interface CaptureStep {
  /** Seconds into the recording at which this step begins. */
  at: number;
  label: string;
}

export interface Capture {
  id: CaptureId;
  title: string;
  /** Seconds. */
  duration: number;
  /** Intrinsic pixel size; the frame reserves this aspect ratio before anything loads. */
  width: number;
  height: number;
  poster: CapturePoster;
  /** In preference order: the browser plays the first type it supports. */
  sources: readonly CaptureSource[];
  /** A WebVTT file. */
  captions: string;
  /** Ascending by `at`. */
  steps: readonly CaptureStep[];
  /** Plain-text description of everything shown, for people who cannot watch. */
  transcript: string;
}

export interface MediaManifest {
  version: ReleaseVersion;
  /** The app's built-in theme the captures were recorded in; null until there are captures. */
  theme: string | null;
  captures: readonly Capture[];
}

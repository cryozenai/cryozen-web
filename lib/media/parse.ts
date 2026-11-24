import type {
  Capture,
  CaptureId,
  CaptureSource,
  CaptureStep,
  MediaManifest,
  ReleaseVersion,
} from "./types";

/*
 * The manifest is written by another stream and arrives as untyped JSON, so it
 * is checked once, when it is loaded, rather than trusted. A manifest that
 * names a poster outside its own version directory, or a step past the end of
 * its recording, fails the build with the offending capture named, instead of
 * rendering a broken player on a page nobody happens to open.
 */

const VERSION = /^v\d+\.\d+\.\d+$/;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FILE_SEGMENT = /^[a-z0-9][a-z0-9._-]*$/i;

function fail(where: string, problem: string): never {
  throw new Error(`lib/media/manifest.json: ${where}: ${problem}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, where: string): string {
  if (typeof value !== "string" || value.trim() === "") fail(where, "expected a non-empty string");
  return value;
}

function positive(value: unknown, where: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    fail(where, "expected a number greater than zero");
  }
  return value;
}

function isUnder(path: string, directory: string): boolean {
  return (
    path.startsWith(directory) &&
    path.slice(directory.length).split("/").every((segment) => FILE_SEGMENT.test(segment))
  );
}

function mediaPath(value: unknown, where: string, directory: string, extension: string): string {
  const path = text(value, where);
  if (!isUnder(path, directory) || !path.endsWith(extension)) {
    fail(where, `expected a path under ${directory} ending in ${extension}, got ${path}`);
  }
  return path;
}

function parseSource(value: unknown, where: string, directory: string): CaptureSource {
  if (!isRecord(value)) fail(where, "expected an object");
  const type = text(value.type, `${where}.type`);
  if (!type.startsWith("video/")) fail(`${where}.type`, `expected a video MIME type, got ${type}`);
  const src = text(value.src, `${where}.src`);
  if (!isUnder(src, directory)) fail(`${where}.src`, `expected a path under ${directory}, got ${src}`);
  return { src, type };
}

function parseSteps(value: unknown, where: string, duration: number): CaptureStep[] {
  if (!Array.isArray(value)) fail(where, "expected an array");
  let previous = -Infinity;
  return value.map((entry, index) => {
    const at = `${where}[${index}]`;
    if (!isRecord(entry)) fail(at, "expected an object");
    const seconds = entry.at;
    if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0 || seconds > duration) {
      fail(`${at}.at`, `expected seconds between 0 and the duration ${duration}`);
    }
    if (seconds <= previous) fail(`${at}.at`, "steps must be in ascending order");
    previous = seconds;
    return { at: seconds, label: text(entry.label, `${at}.label`) };
  });
}

function parseCapture(value: unknown, index: number, directory: string): Capture {
  const where = `captures[${index}]`;
  if (!isRecord(value)) fail(where, "expected an object");
  const id = text(value.id, `${where}.id`);
  if (!ID.test(id)) fail(`${where}.id`, `expected lowercase words joined by hyphens, got ${id}`);
  const named = `capture "${id}"`;

  const duration = positive(value.duration, `${named}.duration`);
  if (!isRecord(value.poster)) fail(`${named}.poster`, "expected an object");
  if (!Array.isArray(value.sources) || value.sources.length === 0) {
    fail(`${named}.sources`, "expected at least one video source");
  }

  return {
    id: id as CaptureId,
    title: text(value.title, `${named}.title`),
    duration,
    width: positive(value.width, `${named}.width`),
    height: positive(value.height, `${named}.height`),
    poster: {
      avif: mediaPath(value.poster.avif, `${named}.poster.avif`, directory, ".avif"),
      webp: mediaPath(value.poster.webp, `${named}.poster.webp`, directory, ".webp"),
    },
    sources: value.sources.map((source, at) =>
      parseSource(source, `${named}.sources[${at}]`, directory),
    ),
    captions: mediaPath(value.captions, `${named}.captions`, directory, ".vtt"),
    steps: parseSteps(value.steps, `${named}.steps`, duration),
    transcript: text(value.transcript, `${named}.transcript`),
  };
}

/** Validates untyped manifest JSON, throwing an error that names what is wrong. */
export function parseManifest(raw: unknown): MediaManifest {
  if (!isRecord(raw)) fail("root", "expected an object");
  const version = text(raw.version, "version");
  if (!VERSION.test(version)) fail("version", `expected a tag like v1.2.0, got ${version}`);
  if (raw.theme !== null && typeof raw.theme !== "string") {
    fail("theme", "expected the app theme name, or null");
  }
  if (!Array.isArray(raw.captures)) fail("captures", "expected an array");

  const directory = `/media/${version}/`;
  const captures = raw.captures.map((capture, index) => parseCapture(capture, index, directory));

  const seen = new Set<string>();
  for (const capture of captures) {
    if (seen.has(capture.id)) fail(`capture "${capture.id}"`, "duplicate id");
    seen.add(capture.id);
  }
  if (captures.length > 0 && raw.theme === null) {
    fail("theme", "captures are present, so the theme they were recorded in must be named");
  }

  return { version: version as ReleaseVersion, theme: raw.theme, captures };
}

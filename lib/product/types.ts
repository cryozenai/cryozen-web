/**
 * The content model for everything the site says CryoZen does.
 *
 * One `Surface` per capability a user of the pinned release can reach in the
 * app. Home, the tour, the feature pages, the sitemap, and the pricing lists
 * all read these; nothing restates a feature by hand, so a claim is corrected
 * in one place and is checked in one place (`scripts/product.test.mjs`).
 */
import type { CaptureId, ReleaseVersion } from "@/lib/media/types";
import type { GuideStep } from "@/lib/media/step-sync";

export type SurfaceId =
  | "chat"
  | "compare"
  | "agents"
  | "research"
  | "websearch"
  | "documents"
  | "knowledge"
  | "memory"
  | "notes"
  | "mail"
  | "calendar"
  | "automations"
  | "compute"
  | "images"
  | "themes"
  | "coderun"
  | "api"
  | "signin";

export type SurfaceGroup = "converse" | "know" | "organize" | "run" | "build";

/**
 * A page of the user docs, as its path under `/docs`. The empty slug is the
 * docs index. Only pages the docs sync publishes are listed, so a surface
 * cannot link to one that will 404.
 */
export type DocsSlug =
  | ""
  | "guides/integrations"
  | "guides/api-access"
  | "reference/api"
  | "reference/cli"
  | "reference/configuration"
  | "operations/deployment"
  | "operations/troubleshooting"
  | "operations/upgrading"
  | "concepts/glossary";

/** One instruction; `title` and `detail` quote the app's own labels exactly. */
export type Step = GuideStep;

/**
 * The furthest a surface's data travels in normal use, worst case first:
 * - `nothing`: it never leaves the machine running CryoZen;
 * - `chosen-provider`: it goes to the model endpoint the user selected, which
 *   is the user's own hardware when that model is local;
 * - `configured-service`: it also reaches another service the user or the
 *   administrator set up, such as a search provider or a mail server.
 * A surface that is local until an optional feature is switched on is filed
 * under what that feature reaches, never under `nothing`.
 */
export type PrivacyReach = "nothing" | "chosen-provider" | "configured-service";

export interface SurfacePrivacy {
  leaves: PrivacyReach;
  /** Exactly what goes where, and when. */
  detail: string;
}

export interface Surface {
  id: SurfaceId;
  /** The site's name for it, such as "Deep Research". */
  name: string;
  group: SurfaceGroup;
  /** At most 80 characters: the benefit. */
  tagline: string;
  /** At most 280 characters: what it does, factually. */
  summary: string;
  /** The release this entry was checked against. */
  verifiedOn: ReleaseVersion;
  howTo: readonly Step[];
  /** What must be set up first. Empty when it works out of the box. */
  prerequisites: readonly string[];
  privacy: SurfacePrivacy;
  /** Null until the recording exists; pages then show a static frame. */
  capture: CaptureId | null;
  docs: DocsSlug | null;
  /** What is different on an instance shared by several people. */
  teams?: string;
  /** Product source backing the entry, as `path:lines`. Never rendered. */
  evidence: readonly string[];
}

export const TAGLINE_MAX = 80;
export const SUMMARY_MAX = 280;

export const groupLabels: Record<SurfaceGroup, string> = {
  converse: "Converse",
  know: "Know",
  organize: "Organize",
  run: "Run",
  build: "Build",
};

export const privacyLabels: Record<PrivacyReach, string> = {
  nothing: "Stays on your machine",
  "chosen-provider": "Goes only to the model you choose",
  "configured-service": "Goes only to services you configure",
};

/** The site path for a docs slug. */
export function docsHref(slug: DocsSlug): string {
  return slug === "" ? "/docs" : `/docs/${slug}`;
}

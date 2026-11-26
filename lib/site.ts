import releaseFacts from "./release-facts.json" with { type: "json" };

export const GITHUB_OWNER = releaseFacts.owner.org;
/**
 * The public release channel. The product repo is private, so its release
 * assets cannot be downloaded anonymously; the release pipeline publishes
 * every release (assets, SHA256SUMS.txt, notes) to this public repo, and the
 * site reads releases and links downloads from here.
 */
export const GITHUB_RELEASES_REPO = releaseFacts.repos.channel.slice(GITHUB_OWNER.length + 1);

export const site = {
  name: releaseFacts.brand.prose,
  domain: "cryozen.ai",
  url: "https://cryozen.ai",
  tagline: "Your AI workspace, on hardware you control.",
  description:
    "CryoZen is a self-hosted AI workspace: chat, autonomous agents with real tools, deep research, living documents, and a mail and calendar client in one application. Local models or your own API keys. No telemetry.",
  /**
   * The single contact address for everything for now: sales, support,
   * security reports, privacy and legal requests. Every page reads it from
   * here, so changing it is this one line.
   */
  contactEmail: "founder@cryozen.ai",
} as const;

export const releasesRepoUrl = `https://github.com/${releaseFacts.repos.channel}`;
export const releasesUrl = `${releasesRepoUrl}/releases`;
export const latestReleaseUrl = `${releasesUrl}/latest`;
/**
 * A download link for the newest release's copy of `assetName`.
 *
 * GitHub answers `/releases/latest/download/<asset>` with a 302 to that asset on
 * whichever release is currently latest, so the link is correct the moment a
 * release publishes and needs no API call to build. The visitor gets the file
 * rather than a page, and never a file from a release that has since been
 * superseded. It 404s when the latest release does not carry the asset, which
 * is why callers decide when to send the visitor to `latestReleaseUrl` instead:
 * see `assetUrlByName` in lib/releases.ts for what each release state resolves
 * to. Built from `latestReleaseUrl` so the two cannot name different releases.
 */
export const latestAssetUrl = (assetName: string) =>
  `${latestReleaseUrl}/download/${assetName}`;
/**
 * Documentation lives on-site under /docs (synced from a pinned product
 * release). Support issues still land in the public release channel; the
 * product repository is private and returns 404 to anonymous visitors.
 */
export const docsUrl = "/docs";
export const quickstartUrl = "/download#docker";
export const configDocsUrl = "/docs/reference/configuration";
export const issuesUrl = `${releasesRepoUrl}/issues`;
export const ghcrImage = releaseFacts.image;

/**
 * The header's links, in the site's reading order: see it, read what it does,
 * learn it, run it for a team, check it, price it. Download is the header's
 * button rather than a link here, and the mobile menu adds it back.
 */
export const nav = [
  { href: "/tour", label: "Tour" },
  { href: "/features", label: "Features" },
  { href: "/docs", label: "Docs" },
  { href: "/teams", label: "Teams" },
  { href: "/security", label: "Security" },
  { href: "/pricing", label: "Pricing" },
] as const;

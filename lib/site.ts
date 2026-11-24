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
    "CryoZen is a self-hosted AI workspace: chat, autonomous agents with real tools, document search, and a mail, calendar, and contacts client in one application. Local models or your own API keys. No telemetry.",
  // TODO(cryozen): confirm this mailbox exists before the site goes live.
  contactEmail: "hello@cryozen.ai",
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

export const nav = [
  { href: "/download", label: "Download" },
  { href: "/pricing", label: "Pricing" },
  { href: "/changelog", label: "Changelog" },
  { href: docsUrl, label: "Docs" },
] as const;

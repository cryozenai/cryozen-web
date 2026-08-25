import { GITHUB_OWNER, GITHUB_RELEASES_REPO, latestAssetUrl, latestReleaseUrl } from "@/lib/site";
import type { PlatformId } from "@/lib/platforms";
import { getPlatform } from "@/lib/platforms";

export interface ReleaseAsset {
  name: string;
  downloadUrl: string;
  size: number;
  downloadCount: number;
}

export interface Release {
  tag: string;
  name: string;
  body: string;
  publishedAt: string | null;
  htmlUrl: string;
  prerelease: boolean;
  assets: ReleaseAsset[];
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  download_count: number;
}

interface GitHubRelease {
  tag_name: string;
  name: string | null;
  body: string | null;
  published_at: string | null;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  assets: GitHubAsset[];
}

// Releases are read from the public release channel, not the private product
// repo: anonymous visitors can only download assets from a public repository.
const API_ROOT = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_RELEASES_REPO}`;

/** Release metadata is refetched hourly; downloads never block on GitHub being up. */
const REVALIDATE_SECONDS = 3600;

function headers(): HeadersInit {
  const base: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  // Optional: lifts the unauthenticated 60 requests/hour rate limit during builds.
  if (process.env.GITHUB_TOKEN) {
    base.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return base;
}

function normalize(release: GitHubRelease): Release {
  return {
    tag: release.tag_name,
    name: release.name?.trim() || release.tag_name,
    body: release.body ?? "",
    publishedAt: release.published_at,
    htmlUrl: release.html_url,
    prerelease: release.prerelease,
    assets: release.assets.map((asset) => ({
      name: asset.name,
      downloadUrl: asset.browser_download_url,
      size: asset.size,
      downloadCount: asset.download_count,
    })),
  };
}

/**
 * The three answers a GitHub read can give, kept apart because they mean
 * different things to a download button.
 *
 * `absent` is a positive answer - GitHub says the resource does not exist -
 * while `failed` says only that we could not ask. Collapsing both into one
 * empty value would make an empty release channel indistinguishable from an
 * outage, and the two call for opposite fallbacks.
 */
type Fetched<T> = { state: "ok"; data: T } | { state: "absent" } | { state: "failed" };

async function get<T>(path: string): Promise<Fetched<T>> {
  try {
    const response = await fetch(`${API_ROOT}${path}`, {
      headers: headers(),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (response.status === 404) return { state: "absent" };
    if (!response.ok) return { state: "failed" };
    return { state: "ok", data: (await response.json()) as T };
  } catch {
    // A GitHub outage must not fail the build; callers degrade instead.
    return { state: "failed" };
  }
}

/**
 * The latest release, or why there is not one.
 *
 * `none` means GitHub answered that the channel has no published release, so a
 * floating asset link would 404 and the releases page is the honest target.
 * `unknown` means the call failed, which says nothing about what is published.
 * Every member carries `release` so display code can read it without
 * discriminating.
 */
export type LatestRelease =
  | { status: "published"; release: Release }
  | { status: "none"; release: null }
  | { status: "unknown"; release: null };

export async function getLatestRelease(): Promise<LatestRelease> {
  const result = await get<GitHubRelease>("/releases/latest");
  if (result.state === "ok") return { status: "published", release: normalize(result.data) };
  return result.state === "absent"
    ? { status: "none", release: null }
    : { status: "unknown", release: null };
}

export async function getReleases(limit = 20): Promise<Release[]> {
  const result = await get<GitHubRelease[]>(`/releases?per_page=${limit}`);
  if (result.state !== "ok") return [];
  return result.data.filter((release) => !release.draft).map(normalize);
}

/**
 * Direct download URL for a platform's primary asset.
 *
 * Platforms with no asset (Docker) have nothing to download, so they get the
 * releases page.
 */
export function downloadUrlFor(platformId: PlatformId, latest: LatestRelease): string {
  const { assetName } = getPlatform(platformId);
  if (!assetName) return latestReleaseUrl;
  return assetUrlByName(assetName, latest);
}

export function assetSizeFor(platformId: PlatformId, latest: LatestRelease): string | null {
  const { assetName } = getPlatform(platformId);
  if (!assetName || !latest.release) return null;
  const asset = latest.release.assets.find((candidate) => candidate.name === assetName);
  return asset ? formatBytes(asset.size) : null;
}

/**
 * Direct download URL for a named asset.
 *
 * Returns GitHub's floating `/releases/latest/download/<asset>` link rather
 * than the pinned `browser_download_url` read from the API, so the button
 * downloads whatever is newest at the moment of the click. The pinned URL is
 * only as fresh as the last revalidation, which meant that for up to an hour
 * after a release the site handed out the previous version's installer.
 *
 * What each state resolves to, and what that is worth:
 *
 * - `published`, release carries the asset: the floating link. It resolves,
 *   with one exception - the presence check reads hourly-cached metadata while
 *   the href floats, so if a newer release drops an asset the cached one
 *   carried, the link 404s until the next revalidation.
 * - `published`, asset positively absent: the releases page. Never a 404.
 * - `none`, the channel has no release at all: the releases page. Never a 404.
 * - `unknown`, the call failed: the floating link, best effort. It resolves
 *   whenever the channel has a release carrying the asset, which is very nearly
 *   always, and 404s on a genuinely empty channel. That is the deliberate
 *   trade: a link that almost always downloads beats a page that never does.
 */
export function assetUrlByName(assetName: string, latest: LatestRelease): string {
  if (latest.status === "unknown") return latestAssetUrl(assetName);
  const carriesAsset =
    latest.status === "published" &&
    latest.release.assets.some((candidate) => candidate.name === assetName);
  return carriesAsset ? latestAssetUrl(assetName) : latestReleaseUrl;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

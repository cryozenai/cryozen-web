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

async function get<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_ROOT}${path}`, {
      headers: headers(),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    // A GitHub outage or an unreleased repo must not fail the build; callers
    // fall back to the releases page.
    return null;
  }
}

export async function getLatestRelease(): Promise<Release | null> {
  const release = await get<GitHubRelease>("/releases/latest");
  return release ? normalize(release) : null;
}

export async function getReleases(limit = 20): Promise<Release[]> {
  const releases = await get<GitHubRelease[]>(`/releases?per_page=${limit}`);
  if (!releases) return [];
  return releases.filter((release) => !release.draft).map(normalize);
}

/**
 * Direct download URL for a platform's primary asset.
 *
 * Platforms with no asset (Docker) have nothing to download, so they get the
 * releases page.
 */
export function downloadUrlFor(platformId: PlatformId, release: Release | null): string {
  const { assetName } = getPlatform(platformId);
  if (!assetName) return latestReleaseUrl;
  return assetUrlByName(assetName, release);
}

export function assetSizeFor(platformId: PlatformId, release: Release | null): string | null {
  const { assetName } = getPlatform(platformId);
  if (!assetName || !release) return null;
  const asset = release.assets.find((candidate) => candidate.name === assetName);
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
 * The never-404 contract still holds, and is now the only thing the fetched
 * release is consulted for: when the API positively reports that the latest
 * release does not carry this asset, send the visitor to the releases page.
 * When `release` is null the API was unreachable, which says nothing about the
 * asset - in that case the constructed link is the better answer, because a
 * link that almost certainly downloads beats a page that certainly does not.
 */
export function assetUrlByName(assetName: string, release: Release | null): string {
  const missing = release?.assets.some((candidate) => candidate.name === assetName) === false;
  return missing ? latestReleaseUrl : latestAssetUrl(assetName);
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

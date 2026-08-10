import { GITHUB_OWNER, GITHUB_REPO, latestReleaseUrl } from "@/lib/site";
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

const API_ROOT = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

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
 * Direct asset URL for a platform, or the releases page when the asset is not
 * published yet. Never returns a URL that is known to 404.
 */
export function downloadUrlFor(platformId: PlatformId, release: Release | null): string {
  const { assetName } = getPlatform(platformId);
  if (!assetName || !release) return latestReleaseUrl;
  const asset = release.assets.find((candidate) => candidate.name === assetName);
  return asset?.downloadUrl ?? latestReleaseUrl;
}

export function assetSizeFor(platformId: PlatformId, release: Release | null): string | null {
  const { assetName } = getPlatform(platformId);
  if (!assetName || !release) return null;
  const asset = release.assets.find((candidate) => candidate.name === assetName);
  return asset ? formatBytes(asset.size) : null;
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

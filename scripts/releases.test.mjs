// A download button has two jobs: hand back a file rather than a page, and hand
// back the newest one. Both are exercised here against a stubbed GitHub API
// rather than trusted from the code, across every answer the API can give:
// a healthy release, a channel with nothing published, and a call that fails.
// The last two look alike from the call site and need opposite fallbacks.
import { strict as assert } from "node:assert";
import { registerHooks } from "node:module";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// lib/*.ts imports use the tsconfig "@/" alias, which Node's type-stripped
// loader does not resolve; map it to the repo root here.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const mapped = pathToFileURL(join(root, `${specifier.slice(2)}.ts`)).href;
      return nextResolve(mapped, context);
    }
    return nextResolve(specifier, context);
  },
});

const { assetUrlByName, downloadUrlFor, getLatestRelease } = await import("../lib/releases.ts");
const { desktopPlatforms } = await import("../lib/platforms.ts");
const { latestAssetUrl, latestReleaseUrl } = await import("../lib/site.ts");

const allAssetNames = [
  "CryoZen.dmg",
  "CryoZen-Intel.dmg",
  "CryoZen-Windows-Portable.zip",
  "CryoZen-Setup-x64.exe",
  "CryoZen-x86_64.AppImage",
  "cryozen_amd64.deb",
  "cryozen.x86_64.rpm",
  "CryoZen-Linux-Portable.tar.gz",
];

/** A `/releases/latest` payload in the shape GitHub actually returns. */
function apiRelease(assetNames) {
  return {
    tag_name: "v1.2.3",
    name: "v1.2.3",
    body: "",
    published_at: "2026-08-01T00:00:00Z",
    html_url: "https://github.com/example/cryozen/releases/tag/v1.2.3",
    draft: false,
    prerelease: false,
    assets: assetNames.map((name) => ({
      name,
      browser_download_url: `https://github.com/example/cryozen/releases/download/v1.2.3/${name}`,
      size: 1024,
      download_count: 0,
    })),
  };
}

const respondWith = (body) => () =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
const respondStatus = (status) => () => new Response("", { status });
const failToConnect = () => {
  throw new TypeError("fetch failed");
};

/** Resolve the latest release the way a page does, against a stubbed GitHub. */
async function latestFrom(respond) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => respond();
  try {
    return await getLatestRelease();
  } finally {
    globalThis.fetch = original;
  }
}

async function published() {
  const latest = await latestFrom(respondWith(apiRelease(allAssetNames)));
  // The published and unknown branches return the same URL for a carried
  // asset, so a test that only reads the URL cannot tell them apart. Pin the
  // branch here and every caller of this helper inherits the discrimination.
  assert.equal(latest.status, "published");
  return latest;
}

test("assetUrlByName resolves each contract asset to a direct download", async () => {
  const latest = await published();
  for (const name of allAssetNames) {
    assert.equal(assetUrlByName(name, latest), latestAssetUrl(name));
  }
});

test("the download URL floats to latest rather than pinning the fetched tag", async () => {
  // The fixture release is v1.2.3. Pinning to it means that once v1.2.4 ships,
  // every visitor served from cache downloads the superseded installer until
  // the page revalidates.
  const url = assetUrlByName("CryoZen.dmg", await published());
  assert.ok(!url.includes("v1.2.3"), `download URL pins a tag: ${url}`);
  assert.match(url, /\/releases\/latest\/download\/CryoZen\.dmg$/);
  // Every download hangs off whatever the channel calls its latest release, so
  // redefining that cannot update the page link and leave the buttons behind.
  assert.equal(url, `${latestReleaseUrl}/download/CryoZen.dmg`);
});

test("an unreachable GitHub API still yields a direct download, not a page", async () => {
  // A failed call says nothing about whether the asset exists. Sending the
  // visitor to a page guarantees no download; the constructed link almost
  // certainly delivers one.
  for (const respond of [respondStatus(500), respondStatus(403), failToConnect]) {
    const latest = await latestFrom(respond);
    assert.equal(latest.status, "unknown");
    assert.equal(assetUrlByName("CryoZen-Intel.dmg", latest), latestAssetUrl("CryoZen-Intel.dmg"));
    for (const platform of desktopPlatforms) {
      assert.equal(downloadUrlFor(platform.id, latest), latestAssetUrl(platform.assetName));
    }
  }
});

test("a channel with no published release sends every download to the releases page", async () => {
  // GitHub answers /releases/latest with 404 when nothing is published. That is
  // a positive absence, not an outage: the floating link would 404 too, so the
  // releases page is the only target that is not a dead end.
  const latest = await latestFrom(respondStatus(404));
  assert.equal(latest.status, "none");
  assert.equal(assetUrlByName("CryoZen.dmg", latest), latestReleaseUrl);
  for (const platform of desktopPlatforms) {
    assert.equal(downloadUrlFor(platform.id, latest), latestReleaseUrl);
  }
});

test("an asset the latest release does not carry falls back to the releases page", async () => {
  // The other positive absence: the API says the asset is not attached, so the
  // floating link would 404.
  const withoutIntel = await latestFrom(
    respondWith(apiRelease(allAssetNames.filter((name) => name !== "CryoZen-Intel.dmg"))),
  );
  assert.equal(withoutIntel.status, "published");
  assert.equal(assetUrlByName("CryoZen-Intel.dmg", withoutIntel), latestReleaseUrl);
  // The same state must still resolve the assets it does carry, so the page
  // fallback is per asset rather than the whole release giving up.
  assert.equal(assetUrlByName("CryoZen.dmg", withoutIntel), latestAssetUrl("CryoZen.dmg"));
});

test("every primary and alternate asset name is on the release contract", async () => {
  const latest = await published();
  for (const platform of desktopPlatforms) {
    assert.notEqual(downloadUrlFor(platform.id, latest), latestReleaseUrl);
    for (const alternate of platform.alternates ?? []) {
      assert.notEqual(
        assetUrlByName(alternate.assetName, latest),
        latestReleaseUrl,
        `${alternate.assetName} is not a release asset`,
      );
    }
  }
});

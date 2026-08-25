// A download button has two jobs: hand back a file rather than a page, and hand
// back the newest one. Both are exercised here against a fixture release rather
// than trusted from the code, including the branch where GitHub's API is
// unreachable, which is the case that used to silently degrade to a page.
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

const { assetUrlByName, downloadUrlFor } = await import("../lib/releases.ts");
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

function release(assetNames) {
  return {
    tag: "v1.2.3",
    name: "v1.2.3",
    body: "",
    publishedAt: "2026-08-01T00:00:00Z",
    htmlUrl: "https://github.com/example/cryozen/releases/tag/v1.2.3",
    prerelease: false,
    assets: assetNames.map((name) => ({
      name,
      downloadUrl: `https://github.com/example/cryozen/releases/download/v1.2.3/${name}`,
      size: 1024,
      downloadCount: 0,
    })),
  };
}

test("assetUrlByName resolves each contract asset to a direct download", () => {
  const full = release(allAssetNames);
  for (const name of allAssetNames) {
    assert.equal(assetUrlByName(name, full), latestAssetUrl(name));
  }
});

test("the download URL floats to latest rather than pinning the fetched tag", () => {
  // The fixture release is v1.2.3. Pinning to it means that once v1.2.4 ships,
  // every visitor served from cache downloads the superseded installer until
  // the page revalidates.
  const url = assetUrlByName("CryoZen.dmg", release(allAssetNames));
  assert.ok(!url.includes("v1.2.3"), `download URL pins a tag: ${url}`);
  assert.match(url, /\/releases\/latest\/download\/CryoZen\.dmg$/);
});

test("an unreachable GitHub API still yields a direct download, not a page", () => {
  // release === null means the fetch failed, which says nothing about whether
  // the asset exists. Sending the visitor to a page guarantees no download;
  // the constructed link almost certainly delivers one.
  assert.equal(assetUrlByName("CryoZen-Intel.dmg", null), latestAssetUrl("CryoZen-Intel.dmg"));
  for (const platform of desktopPlatforms) {
    assert.notEqual(downloadUrlFor(platform.id, null), latestReleaseUrl);
  }
});

test("an asset the latest release does not carry falls back to the releases page", () => {
  // The only case where the API's answer is load-bearing: it positively says
  // the asset is absent, so the floating link would 404.
  const withoutIntel = release(allAssetNames.filter((name) => name !== "CryoZen-Intel.dmg"));
  assert.equal(assetUrlByName("CryoZen-Intel.dmg", withoutIntel), latestReleaseUrl);
});

test("every primary and alternate asset name is on the release contract", () => {
  const full = release(allAssetNames);
  for (const platform of desktopPlatforms) {
    assert.notEqual(downloadUrlFor(platform.id, full), latestReleaseUrl);
    for (const alternate of platform.alternates ?? []) {
      assert.notEqual(
        assetUrlByName(alternate.assetName, full),
        latestReleaseUrl,
        `${alternate.assetName} is not a release asset`,
      );
    }
  }
});

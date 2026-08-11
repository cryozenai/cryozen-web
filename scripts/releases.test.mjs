// The alternates links are only safe to ship if the never-404 contract holds
// on every branch, so both the exact-match resolution and the fallback are
// exercised here against a fixture release rather than trusted from the code.
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
const { latestReleaseUrl } = await import("../lib/site.ts");

const allAssetNames = [
  "CryoZen.dmg",
  "CryoZen-Intel.dmg",
  "CryoZen-Windows-Portable.zip",
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

test("assetUrlByName resolves each contract asset to its direct download URL", () => {
  const full = release(allAssetNames);
  for (const name of allAssetNames) {
    assert.equal(
      assetUrlByName(name, full),
      `https://github.com/example/cryozen/releases/download/v1.2.3/${name}`,
    );
  }
});

test("assetUrlByName falls back to the releases page, never a 404 link", () => {
  assert.equal(assetUrlByName("CryoZen-Intel.dmg", null), latestReleaseUrl);
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

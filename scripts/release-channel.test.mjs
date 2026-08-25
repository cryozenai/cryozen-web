// The product repo is private, so the site must read releases from and link
// downloads to the public cryozen-releases channel, while the source links in
// the header/footer/terms keep pointing at the product repo. These tests drive
// the public lib interfaces (fetch target, URL exports, platform contract)
// rather than inspecting source text.
import { strict as assert } from "node:assert";
import { registerHooks } from "node:module";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

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

const { getLatestRelease, getReleases, downloadUrlFor } = await import("../lib/releases.ts");
const { getPlatform, dockerCommands } = await import("../lib/platforms.ts");
const { githubUrl, releasesRepoUrl, releasesUrl, latestReleaseUrl } = await import("../lib/site.ts");

const PUBLIC_REPO = "https://github.com/shreejitverma/cryozen-releases";
const PRIVATE_REPO = "https://github.com/shreejitverma/cryozen";

const desktopAssets = ["macos", "windows", "linux"].map((id) => ({
  name: getPlatform(id).assetName,
  browser_download_url: "",
  size: 0,
  download_count: 0,
}));

async function withFetchStub(fn) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    const release = {
      tag_name: "v9.9.9",
      published_at: "",
      html_url: "",
      prerelease: false,
      draft: false,
      assets: desktopAssets,
    };
    const body = String(url).includes("?per_page=") ? [release] : release;
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    await fn(calls);
  } finally {
    globalThis.fetch = original;
  }
}

test("release metadata is fetched from the public cryozen-releases repo API", async () => {
  await withFetchStub(async (calls) => {
    const latest = await getLatestRelease();
    await getReleases(5);
    assert.equal(latest.release?.tag, "v9.9.9");
    assert.deepEqual(calls, [
      "https://api.github.com/repos/shreejitverma/cryozen-releases/releases/latest",
      "https://api.github.com/repos/shreejitverma/cryozen-releases/releases?per_page=5",
    ]);
  });
});

test("release links target the public channel; source links keep the product repo", async () => {
  assert.equal(githubUrl, PRIVATE_REPO);
  assert.equal(releasesRepoUrl, PUBLIC_REPO);
  assert.equal(releasesUrl, `${PUBLIC_REPO}/releases`);
  assert.equal(latestReleaseUrl, `${PUBLIC_REPO}/releases/latest`);
  // What this test is named for is the channel, not the shape: a download must
  // never resolve into the private product repo, which anonymous visitors
  // cannot read. The button no longer hands back one fixed URL, so assert the
  // repository the link lands in rather than the URL itself.
  await withFetchStub(async () => {
    const latest = await getLatestRelease();
    // Without this the assertions below hold under any state, since the page
    // fallback lives in the public channel too; they would stop checking the
    // download URL and nobody would notice.
    assert.equal(latest.status, "published");
    for (const id of ["macos", "windows", "linux"]) {
      const url = downloadUrlFor(id, latest);
      assert.ok(
        url.startsWith(`${PUBLIC_REPO}/releases/`),
        `${id} leaves the public channel: ${url}`,
      );
      // The boundary matters: PRIVATE_REPO is a prefix of PUBLIC_REPO
      // (".../cryozen" vs ".../cryozen-releases"), so a bare startsWith would
      // reject the correct URL.
      assert.ok(
        !url.startsWith(`${PRIVATE_REPO}/`),
        `${id} points at the private repo: ${url}`,
      );
    }
  });
});

test("Windows primary download is the installer with the portable zip as alternate", () => {
  const windows = getPlatform("windows");
  assert.equal(windows.assetName, "CryoZen-Setup-x64.exe");
  assert.deepEqual(
    windows.alternates?.map((alternate) => alternate.assetName),
    ["CryoZen-Windows-Portable.zip"],
  );
  assert.equal(getPlatform("macos").assetName, "CryoZen.dmg");
  assert.equal(getPlatform("macos").alternates?.[0]?.assetName, "CryoZen-Intel.dmg");
  assert.ok(
    getPlatform("linux").alternates?.some((a) => a.assetName === "CryoZen-Linux-Portable.tar.gz"),
    "Linux portable tarball stays linked",
  );
});

test("Docker instructions clone the public compose bundle and do not build from source", () => {
  assert.equal(dockerCommands[0], `git clone ${PUBLIC_REPO}.git`);
  assert.ok(dockerCommands[1].startsWith("cd cryozen-releases"));
  assert.equal(dockerCommands[2], "docker compose up -d");
  const docker = getPlatform("docker");
  assert.ok(docker.steps.every((step) => !step.includes("--build")));
  assert.ok(docker.steps.every((step) => !step.includes(`${PRIVATE_REPO}.git`)));
});

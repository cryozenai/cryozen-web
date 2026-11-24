import assert from "node:assert/strict";
import { glob, readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dataDirs, desktopPlatforms, desktopPort, dockerCommands, dockerPort, getPlatform } from "../lib/platforms.ts";
import facts from "../lib/release-facts.json" with { type: "json" };
import { GITHUB_OWNER, GITHUB_RELEASES_REPO, ghcrImage, releasesRepoUrl, site } from "../lib/site.ts";

const root = new URL("../", import.meta.url);

test("site and platform constants match the public release facts", () => {
  assert.equal(GITHUB_OWNER, facts.owner.org);
  assert.equal(site.name, facts.brand.prose);
  assert.equal(`${GITHUB_OWNER}/${GITHUB_RELEASES_REPO}`, facts.repos.channel);
  assert.equal(releasesRepoUrl, `https://github.com/${facts.repos.channel}`);
  assert.equal(ghcrImage, facts.image);
  assert.deepEqual(dockerCommands, facts.install.docker);
  assert.equal(desktopPort, facts.install.desktop_port);
  assert.equal(dockerPort, facts.install.docker_port);
  assert.deepEqual(dataDirs, facts.install.data_dirs);
  assert.deepEqual(getPlatform("docker").steps, [
    ...facts.install.docker,
    `Open http://localhost:${facts.install.docker_port}.`,
  ]);
  for (const platform of desktopPlatforms) {
    const instructions = platform.steps.join("\n");
    assert.ok(instructions.includes(`http://127.0.0.1:${facts.install.desktop_port}`), platform.id);
    assert.ok(instructions.includes(facts.install.data_dirs[platform.id]), platform.id);
  }
});

test("desktop downloads cover every installer asset in the public release facts", () => {
  const installers = desktopPlatforms.flatMap(({ assetName, alternates = [] }) => [
    assetName,
    ...alternates.map((alternate) => alternate.assetName),
  ]);
  assert.deepEqual([...installers, "SHA256SUMS.txt"].sort(), facts.assets.toSorted());
});

test("site source and README contain no banned release strings", async () => {
  const violations = [];
  for await (const path of glob(["{app,components,lib}/**/*", "README.md"], {
    cwd: fileURLToPath(root),
    withFileTypes: true,
  })) {
    if (!path.isFile()) continue;
    const file = `${path.parentPath}/${path.name}`;
    if (file === fileURLToPath(new URL("lib/release-facts.json", root))) continue;
    const source = await readFile(file, "utf8");
    for (const banned of facts.banned) {
      if (source.includes(banned)) violations.push(`${file}: ${JSON.stringify(banned)}`);
    }
  }
  assert.deepEqual(violations, []);
});

import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

import { DOC_ALLOWLIST, syncDocs } from "./sync-docs.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DOCS_DIR = join(ROOT, "content", "docs");
const FACTS_PATH = join(ROOT, "lib", "release-facts.json");

const tempDirs = [];

function makeTempDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function createFixtureGitRepo(filesByPath, tag = "v9.9.9") {
  const repoDir = makeTempDir("cryozen-docs-fixture-");
  const git = (args) =>
    execFileSync("git", ["-C", repoDir, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

  git(["init"]);
  git(["config", "user.name", "Fixture Bot"]);
  git(["config", "user.email", "fixture@example.com"]);

  for (const [relPath, content] of Object.entries(filesByPath)) {
    const absPath = join(repoDir, relPath);
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, content, "utf8");
  }

  git(["add", "."]);
  git(["commit", "--no-gpg-sign", "-m", "fixture commit"]);
  git(["tag", "--no-sign", "-a", tag, "-m", "fixture tag"]);
  const commit = git(["rev-parse", `${tag}^{commit}`]).trim();
  return { repoDir, commit };
}

function baseFixtureFiles(overrides = {}) {
  const defaults = {
    "docs/README.md": [
      "# CryoZen documentation",
      "",
      "Overview map.",
      "",
      "## Start here",
      "",
      "- [Configuration](reference/configuration.md)",
      "- [Upgrading](operations/upgrading.md): upgrade notes from installations that ran under the previous name, Srijan.",
      "",
      "## Contribute",
      "",
      "- [Contributing guide](../CONTRIBUTING.md)",
      "",
    ].join("\n"),
    "docs/guides/integrations.md": [
      "# Integrations",
      "",
      "See [configuration](../reference/configuration.md#storage-paths),",
      "[threat model](../../THREAT_MODEL.md),",
      "[Apple support](https://support.apple.com/102654), and",
      "[public releases](https://github.com/cryozenai/cryozen-releases).",
      "",
    ].join("\n"),
    "docs/guides/api-access.md": "# API access\n\nGuide body.\n",
    "docs/reference/api.md": "# API reference\n\nReference body.\n",
    "docs/reference/cli.md": "# CLI reference\n\nCLI body.\n",
    "docs/reference/configuration.md": [
      "# Configuration reference",
      "",
      "## Storage paths",
      "",
      "Path details.",
      "",
    ].join("\n"),
    "docs/operations/deployment.md": "# Deployment\n\nDeployment body.\n",
    "docs/operations/troubleshooting.md": [
      "# Troubleshooting",
      "",
      "File an issue in [the private repo](https://github.com/cryozenai/cryozen) or",
      "see [the file](https://github.com/cryozenai/cryozen/blob/main/README.md).",
      "",
    ].join("\n"),
    "docs/operations/upgrading.md": [
      "# Upgrading",
      "",
      "Docker installs up to v1.1.0 pull `ghcr.io/shreejitverma/cryozen:latest`.",
      "",
    ].join("\n"),
    "docs/concepts/glossary.md": [
      "# Glossary",
      "",
      "See [the architecture guide](../../ARCHITECTURE.md) or [index](../README.md).",
      "",
    ].join("\n"),
  };
  return { ...defaults, ...overrides };
}

function listMarkdownFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listMarkdownFiles(abs));
    } else if (entry.name.endsWith(".md")) {
      results.push(abs);
    }
  }
  return results;
}

function slugifyHeading(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

function headingIdsInMarkdown(body) {
  const counts = new Map();
  const ids = new Set();
  let inFence = false;
  let fenceChar = "";

  for (const line of body.split(/\r?\n/)) {
    const fence = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence) {
      const ch = fence[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = ch;
      } else if (ch === fenceChar) {
        inFence = false;
        fenceChar = "";
      }
      continue;
    }
    if (inFence) continue;
    const match = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const plain = match[1]
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/(\*\*|__|\*|_|~~)/g, "")
      .trim();
    const base = slugifyHeading(plain) || "section";
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    ids.add(seen === 0 ? base : `${base}-${seen}`);
  }
  return ids;
}

test("sync-docs rewrites links, prunes unsynced index sections, unlinks private targets, and reports transforms", () => {
  const { repoDir, commit } = createFixtureGitRepo(baseFixtureFiles(), "v9.9.9");
  const outDir = makeTempDir("cryozen-docs-out-");

  const stdout = execFileSync(
    "node",
    [join(ROOT, "scripts", "sync-docs.mjs"), "--product", repoDir, "--ref", "v9.9.9", "--out", outDir],
    { encoding: "utf8" },
  );

  assert.match(stdout, /Synced 10 docs from v9\.9\.9/);
  assert.match(stdout, /upgrading-old-ghcr-image/);
  assert.match(stdout, /readme-upgrading-previous-name/);
  assert.match(stdout, /private-repo-url/);
  assert.match(stdout, /unsynced-repo-file/);

  const indexMd = readFileSync(join(outDir, "index.md"), "utf8");
  assert.match(indexMd, new RegExp(`commit: "${commit}"`));
  assert.match(indexMd, /ref: "v9\.9\.9"/);
  assert.ok(!indexMd.includes("## Contribute"), "unsynced index section must be removed");
  assert.match(indexMd, /\[Configuration\]\(\/docs\/reference\/configuration\)/);
  assert.match(indexMd, /the project's previous name/);

  const integrationsMd = readFileSync(join(outDir, "guides", "integrations.md"), "utf8");
  assert.match(integrationsMd, /\[configuration\]\(\/docs\/reference\/configuration#storage-paths\)/);
  assert.match(integrationsMd, /\[threat model\]\(\/security\)/);
  assert.match(integrationsMd, /\[Apple support\]\(https:\/\/support\.apple\.com\/102654\)/);
  assert.match(
    integrationsMd,
    /\[public releases\]\(https:\/\/github\.com\/cryozenai\/cryozen-releases\)/,
  );

  const troubleshootingMd = readFileSync(join(outDir, "operations", "troubleshooting.md"), "utf8");
  assert.ok(!troubleshootingMd.includes("github.com/cryozenai/cryozen"));
  assert.match(troubleshootingMd, /File an issue in the private repo or/);
  assert.match(troubleshootingMd, /see the file\./);

  const glossaryMd = readFileSync(join(outDir, "concepts", "glossary.md"), "utf8");
  assert.match(glossaryMd, /See the architecture guide or \[index\]\(\/docs\)\./);

  const upgradingMd = readFileSync(join(outDir, "operations", "upgrading.md"), "utf8");
  assert.ok(!upgradingMd.includes("shreejitverma/cryozen"));
  assert.match(upgradingMd, /pre-organization container registry path/);
});

test("sync-docs fails loudly when a banned string survives without a transform", () => {
  const { repoDir } = createFixtureGitRepo(
    baseFixtureFiles({
      "docs/guides/api-access.md": "# API access\n\nAll source is published here.\n",
    }),
    "v9.9.9",
  );
  const outDir = makeTempDir("cryozen-docs-fail-");

  assert.throws(
    () =>
      syncDocs({
        productRepo: repoDir,
        ref: "v9.9.9",
        outDir,
        factsPath: FACTS_PATH,
      }),
    /Banned term check failed[\s\S]*docs\/guides\/api-access\.md[\s\S]*source is published/,
  );
  assert.equal(existsSync(join(outDir, "index.md")), false, "failed sync must not write partial output");
});

test("published content/docs links resolve to synced docs and never link to github.com/cryozenai/cryozen/", () => {
  const facts = JSON.parse(readFileSync(FACTS_PATH, "utf8"));
  const files = listMarkdownFiles(CONTENT_DOCS_DIR);
  assert.equal(files.length, DOC_ALLOWLIST.length);

  const headingsByRoute = new Map();
  for (const entry of DOC_ALLOWLIST) {
    const filePath =
      entry.slug === ""
        ? join(CONTENT_DOCS_DIR, "index.md")
        : join(CONTENT_DOCS_DIR, `${entry.slug}.md`);
    assert.ok(existsSync(filePath), `missing synced doc: ${filePath}`);
    const content = readFileSync(filePath, "utf8");

    for (const term of facts.banned) {
      assert.equal(
        content.toLowerCase().includes(term.toLowerCase()),
        false,
        `${filePath} contains banned term ${JSON.stringify(term)}`,
      );
    }

    const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
    const route = entry.slug === "" ? "/docs" : `/docs/${entry.slug}`;
    headingsByRoute.set(route, headingIdsInMarkdown(body));
  }

  for (const filePath of files) {
    const content = readFileSync(filePath, "utf8");
    const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
    let inFence = false;
    let fenceChar = "";

    for (const line of body.split(/\r?\n/)) {
      const fence = /^\s*(`{3,}|~{3,})/.exec(line);
      if (fence) {
        const ch = fence[1][0];
        if (!inFence) {
          inFence = true;
          fenceChar = ch;
        } else if (ch === fenceChar) {
          inFence = false;
          fenceChar = "";
        }
        continue;
      }
      if (inFence) continue;

      for (const match of line.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
        const target = match[2];
        assert.ok(
          !target.includes("github.com/cryozenai/cryozen/"),
          `${filePath} links to private repo: ${target}`,
        );
        if (target.startsWith("/docs")) {
          const [route, anchor] = target.split("#");
          const headingIds = headingsByRoute.get(route);
          assert.ok(headingIds, `${filePath} links to unknown /docs route: ${target}`);
          if (anchor) {
            assert.ok(headingIds.has(anchor), `${filePath} links to missing anchor: ${target}`);
          }
        }
      }
    }
  }
});

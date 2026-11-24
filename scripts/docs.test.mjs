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

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { extractLeadParagraph, extractToc, remarkHeadingIds } from "../lib/docs/slugger.ts";
import {
  composeEnvNames,
  DEFAULT_TRANSFORMS,
  DOC_ALLOWLIST,
  findComposeEnvMismatches,
  findDockerComposeBuildMatches,
  findSourceOnlyMatches,
  findSourceRepoMatches,
  findUnpublishedPaths,
  settingNamesFromReference,
  syncDocs,
} from "./sync-docs.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DOCS_DIR = join(ROOT, "content", "docs");
const FACTS_PATH = join(ROOT, "lib", "release-facts.json");
const RELEASE_COMPOSE_PATH = join(ROOT, "lib", "release-compose.yml");
const RELEASE_CHANNEL_FILES_PATH = join(ROOT, "lib", "release-channel-files.json");

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

function baseFixtureFiles(overrides = {}, { omitTransform } = {}) {
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
  const files = { ...defaults, ...overrides };
  // Each transform must match its file, so the fixture carries every pattern
  // in a section of its own after the file's test-specific content.
  const patternsByFile = new Map();
  for (const rule of DEFAULT_TRANSFORMS) {
    if (rule.id === omitTransform) continue;
    for (const file of rule.files) {
      patternsByFile.set(file, [...(patternsByFile.get(file) ?? []), rule.pattern]);
    }
  }
  for (const [file, patterns] of patternsByFile) {
    files[file] = `${files[file]}\n## Transform fixtures\n\n${patterns.join("\n\n")}\n`;
  }
  return files;
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

const HTML_ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#x27;": "'" };

/** Headings as react-markdown renders them with the plugins DocsMarkdown uses. */
function renderedHeadings(body) {
  const html = renderToStaticMarkup(
    createElement(Markdown, { remarkPlugins: [remarkGfm, remarkHeadingIds] }, body),
  );
  return [...html.matchAll(/<h([1-6]) id="([^"]*)">([\s\S]*?)<\/h\1>/g)].map((match) => ({
    level: Number(match[1]),
    id: match[2],
    text: match[3].replace(/<[^>]+>/g, "").replace(/&(?:amp|lt|gt|quot|#x27);/g, (e) => HTML_ENTITIES[e]),
  }));
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
  assert.match(stdout, new RegExp(`Applied transforms \\(${DEFAULT_TRANSFORMS.length}\\):`));
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
  assert.deepEqual(findSourceRepoMatches(troubleshootingMd, "cryozenai/cryozen"), []);
  assert.match(
    troubleshootingMd,
    /open an issue at \[the public release channel\]\(https:\/\/github\.com\/cryozenai\/cryozen-releases\/issues\)/,
  );
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

test("sync-docs fails loudly when github.com/<repos.source> survives inside a code block", () => {
  const { repoDir } = createFixtureGitRepo(
    baseFixtureFiles({
      "docs/operations/deployment.md": [
        "# Deployment",
        "",
        "```bash",
        "git clone https://github.com/cryozenai/cryozen.git",
        "```",
        "",
      ].join("\n"),
    }),
    "v9.9.9",
  );
  const outDir = makeTempDir("cryozen-docs-fail-source-repo-");

  assert.throws(
    () =>
      syncDocs({
        productRepo: repoDir,
        ref: "v9.9.9",
        outDir,
        factsPath: FACTS_PATH,
      }),
    /Private source repo check failed[\s\S]*docs\/operations\/deployment\.md[\s\S]*github\.com\/cryozenai\/cryozen/,
  );
  assert.equal(existsSync(join(outDir, "index.md")), false, "failed sync must not write partial output");
});

test("sync-docs fails loudly when --build survives in a docker compose command", () => {
  const { repoDir } = createFixtureGitRepo(
    baseFixtureFiles({
      "docs/operations/upgrading.md": [
        "# Upgrading",
        "",
        "```bash",
        "docker compose up -d --build",
        "```",
        "",
      ].join("\n"),
    }),
    "v9.9.9",
  );
  const outDir = makeTempDir("cryozen-docs-fail-build-flag-");

  assert.throws(
    () =>
      syncDocs({
        productRepo: repoDir,
        ref: "v9.9.9",
        outDir,
        factsPath: FACTS_PATH,
      }),
    /Docker Compose --build check failed[\s\S]*docs\/operations\/upgrading\.md[\s\S]*--build/,
  );
  assert.equal(existsSync(join(outDir, "index.md")), false, "failed sync must not write partial output");
});

test("sync-docs rewrites source-only Docker Compose block to public cryozen-releases install", () => {
  const { repoDir } = createFixtureGitRepo(
    baseFixtureFiles({
      "docs/operations/deployment.md": [
        "# Deployment",
        "",
        "## Deploy with Docker Compose",
        "",
        "The Compose stack builds the application image from the repository and starts four services.",
        "You need Docker with Compose v2.",
        "",
        "```bash",
        "git clone https://github.com/cryozenai/cryozen.git",
        "cd cryozen",
        "cp .env.example .env",
        "docker compose up -d --build",
        "```",
        "",
      ].join("\n"),
    }),
    "v9.9.9",
  );
  const outDir = makeTempDir("cryozen-docs-rewrite-");

  const report = syncDocs({
    productRepo: repoDir,
    ref: "v9.9.9",
    outDir,
    factsPath: FACTS_PATH,
  });

  assert.ok(
    report.appliedTransforms.some((item) => item.id === "deployment-docker-compose-public"),
    "expected deployment-docker-compose-public transform to run",
  );
  const deploymentMd = readFileSync(join(outDir, "operations", "deployment.md"), "utf8");
  assert.match(deploymentMd, /git clone https:\/\/github\.com\/cryozenai\/cryozen-releases\.git/);
  assert.match(deploymentMd, /cd cryozen-releases/);
  assert.match(deploymentMd, /docker compose up -d/);
  assert.equal(findSourceRepoMatches(deploymentMd, "cryozenai/cryozen").length, 0);
  assert.equal(findDockerComposeBuildMatches(deploymentMd).length, 0);
});

test("published content/docs links resolve to synced docs and never link to github.com/cryozenai/cryozen/", () => {
  const facts = JSON.parse(readFileSync(FACTS_PATH, "utf8"));
  const sourceRepo = facts.repos?.source;
  const files = listMarkdownFiles(CONTENT_DOCS_DIR);
  assert.equal(files.length, DOC_ALLOWLIST.length);

  const composeNames = composeEnvNames(readFileSync(RELEASE_COMPOSE_PATH, "utf8"));
  const publishedPaths = JSON.parse(readFileSync(RELEASE_CHANNEL_FILES_PATH, "utf8"));
  const settingNames = settingNamesFromReference(
    readFileSync(join(CONTENT_DOCS_DIR, "reference", "configuration.md"), "utf8"),
  );
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

    assert.deepEqual(
      findSourceRepoMatches(content, sourceRepo),
      [],
      `${filePath} must not reference github.com/${sourceRepo} anywhere`,
    );
    assert.deepEqual(
      findDockerComposeBuildMatches(content),
      [],
      `${filePath} must not pass --build to docker compose`,
    );
    assert.deepEqual(
      findSourceOnlyMatches(content, Object.values(facts.install.data_dirs)),
      [],
      `${filePath} must not hand visitors source-checkout-only content`,
    );
    assert.deepEqual(
      findComposeEnvMismatches(content, composeNames, settingNames),
      [],
      `${filePath} must not tell Compose users to set an unforwarded variable in .env`,
    );
    assert.deepEqual(
      findUnpublishedPaths(content, publishedPaths),
      [],
      `${filePath} must not reference files the public release channel does not ship`,
    );

    // The page renders the body without its leading H1 (lib/docs/index.ts).
    const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").replace(/^#\s+.+?\r?\n+/, "");
    const route = entry.slug === "" ? "/docs" : `/docs/${entry.slug}`;
    const headings = renderedHeadings(body);
    headingsByRoute.set(route, new Set(headings.map((heading) => heading.id)));
    assert.deepEqual(
      extractToc(body),
      headings.filter((heading) => heading.level === 2 || heading.level === 3),
      `${filePath} table of contents must match the rendered h2 and h3 headings`,
    );
  }

  const deploymentMd = readFileSync(join(CONTENT_DOCS_DIR, "operations", "deployment.md"), "utf8");
  assert.match(deploymentMd, /\[\/download#docker\]\(\/download#docker\)/);

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

test("sync-docs fails loudly when a transform matches nothing in its file", () => {
  const { repoDir } = createFixtureGitRepo(
    baseFixtureFiles({}, { omitTransform: "troubleshooting-port-in-use-source-only" }),
    "v9.9.9",
  );
  const outDir = makeTempDir("cryozen-docs-fail-transform-miss-");

  assert.throws(
    () =>
      syncDocs({
        productRepo: repoDir,
        ref: "v9.9.9",
        outDir,
        factsPath: FACTS_PATH,
      }),
    /Transform check failed[\s\S]*docs\/operations\/troubleshooting\.md: \[troubleshooting-port-in-use-source-only\] matched nothing/,
  );
  assert.equal(existsSync(join(outDir, "index.md")), false, "failed sync must not write partial output");
});

test("sync-docs fails loudly on a sentence-final bare private repo URL", () => {
  const { repoDir } = createFixtureGitRepo(
    baseFixtureFiles({
      "docs/guides/api-access.md": "# API access\n\nThe code lives at https://github.com/cryozenai/cryozen.\n",
    }),
    "v9.9.9",
  );
  const outDir = makeTempDir("cryozen-docs-fail-bare-url-");

  assert.throws(
    () =>
      syncDocs({
        productRepo: repoDir,
        ref: "v9.9.9",
        outDir,
        factsPath: FACTS_PATH,
      }),
    /Private source repo check failed[\s\S]*docs\/guides\/api-access\.md:\d+ matched private source repo[^\n]*The code lives at/,
  );
  assert.equal(existsSync(join(outDir, "index.md")), false, "failed sync must not write partial output");
});

test("findSourceRepoMatches matches the private repo but not sibling repos", () => {
  const repo = "cryozenai/cryozen";
  for (const text of [
    "see https://github.com/cryozenai/cryozen.",
    "git clone https://github.com/cryozenai/cryozen.git",
    "git clone https://github.com/cryozenai/cryozen.git.",
    "<https://github.com/cryozenai/cryozen>",
    "https://github.com/cryozenai/cryozen/issues",
  ]) {
    assert.equal(findSourceRepoMatches(text, repo).length, 1, `expected a match in ${JSON.stringify(text)}`);
  }
  for (const text of [
    "https://github.com/cryozenai/cryozen-releases.",
    "https://github.com/cryozenai/cryozen.web",
    "https://github.com/cryozenai/cryozen_web",
  ]) {
    assert.deepEqual(findSourceRepoMatches(text, repo), [], `expected no match in ${JSON.stringify(text)}`);
  }
});

test("docs table of contents and lead text keep intraword underscores", () => {
  const body = [
    "Read `.env` with `load_dotenv(encoding=\"utf-8-sig\")` from the CRYOZEN_DATA_DIR root.",
    "",
    "## SESSION_SECRET",
    "",
    "## Why *emphasis* and `code_span`",
    "",
  ].join("\n");

  assert.equal(
    extractLeadParagraph(body),
    'Read .env with load_dotenv(encoding="utf-8-sig") from the CRYOZEN_DATA_DIR root.',
  );
  // GitHub anchors keep `_`, so `## SESSION_SECRET` links as #session_secret.
  assert.deepEqual(extractToc(body), [
    { level: 2, text: "SESSION_SECRET", id: "session_secret" },
    { level: 2, text: "Why emphasis and code_span", id: "why-emphasis-and-code_span" },
  ]);
});

test("sync-docs fails loudly when source-checkout-only prose survives outside the allowlist", () => {
  const { repoDir } = createFixtureGitRepo(
    baseFixtureFiles({
      "docs/operations/upgrading.md": [
        "# Upgrading",
        "",
        "On a native install, restart CryoZen after you edit `.env`.",
        "",
      ].join("\n"),
    }),
    "v9.9.9",
  );
  const outDir = makeTempDir("cryozen-docs-fail-source-only-");

  assert.throws(
    () =>
      syncDocs({
        productRepo: repoDir,
        ref: "v9.9.9",
        outDir,
        factsPath: FACTS_PATH,
      }),
    /Source-only content check failed:\ndocs\/operations\/upgrading\.md:\d+ matched source-checkout-only content: On a native install, restart CryoZen after you edit `\.env`\.$/,
  );
  assert.equal(existsSync(join(outDir, "index.md")), false, "failed sync must not write partial output");
});

test("findSourceOnlyMatches flags source-only prose and code, except allowlisted notes", () => {
  const facts = JSON.parse(readFileSync(FACTS_PATH, "utf8"));
  const desktopDirs = Object.values(facts.install.data_dirs);
  const namesEveryDesktopDir = `Unset, it falls back to \`~/.cryozen\`; desktop packages set ${desktopDirs.join(", ")}.`;
  const text = [
    "On a native install, restart CryoZen.",
    "The native launcher and systemd paths require a source checkout, which is not public.",
    "Uvicorn trusts forwarded headers from `127.0.0.1` by default.",
    "The default data directory is `~/.cryozen`.",
    namesEveryDesktopDir,
    `Unset, it falls back to \`~/.cryozen\`; macOS desktop packages use ${desktopDirs[0]}.`,
    "```bash",
    "sudo systemctl restart docker",
    "sudo systemctl restart cryozen-ui",
    "```",
  ].join("\n");

  assert.deepEqual(
    findSourceOnlyMatches(text, desktopDirs).map((hit) => hit.line),
    [1, 4, 6, 9],
  );
});

test("sync-docs fails loudly when docs tell Compose users to set an unforwarded variable in .env", () => {
  const { repoDir } = createFixtureGitRepo(
    baseFixtureFiles({
      "docs/reference/configuration.md": [
        "# Configuration reference",
        "",
        "| Variable | Default | Effect |",
        "| --- | --- | --- |",
        "| `SESSION_SECRET` | Unset | Signs OAuth state. |",
        "| `SECURE_COOKIES` | `false` | Marks the session cookie Secure. |",
        "",
      ].join("\n"),
      "docs/guides/api-access.md": [
        "# API access",
        "",
        "Set `SECURE_COOKIES=true` in `.env` once HTTPS works.",
        "Put `SESSION_SECRET` in `.env` before you restart.",
        "",
      ].join("\n"),
    }),
    "v9.9.9",
  );
  const outDir = makeTempDir("cryozen-docs-fail-compose-env-");

  assert.throws(
    () => syncDocs({ productRepo: repoDir, ref: "v9.9.9", outDir, factsPath: FACTS_PATH }),
    /^Error: Compose \.env check failed:\ndocs\/guides\/api-access\.md:\d+ tells Compose users to set SESSION_SECRET in \.env[^\n]*$/,
  );
  assert.equal(existsSync(join(outDir, "index.md")), false, "failed sync must not write partial output");
});

test("the published Compose file decides which settings work from .env", () => {
  const composeNames = composeEnvNames(readFileSync(RELEASE_COMPOSE_PATH, "utf8"));
  const settingNames = new Set(["SESSION_SECRET", "SECURE_COOKIES", "APP_BIND", "FORWARDED_ALLOW_IPS"]);

  for (const name of ["SECURE_COOKIES", "ALLOWED_ORIGINS", "APP_BIND", "APP_PORT", "COMPOSE_FILE"]) {
    assert.ok(composeNames.has(name), `${name} reaches the stack from .env`);
  }
  for (const name of ["SESSION_SECRET", "OAUTH_REDIRECT_BASE_URL", "FORWARDED_ALLOW_IPS", "GOOGLE_CLIENT_ID"]) {
    assert.equal(composeNames.has(name), false, `${name} is not forwarded by the published Compose file`);
  }

  const text = [
    "Record the output as `SESSION_SECRET` in `.env`.",
    "Change the host side with `APP_BIND` in `.env`.",
    "Set `SESSION_SECRET` in `docker-compose.override.yml`, because Compose does not forward it from `.env`.",
    "Start Ollama with `OLLAMA_HOST=0.0.0.0:11434` and set this in `.env`:",
    "Set `FORWARDED_ALLOW_IPS=172.18.0.1` in your `.env`. Then restart.",
  ].join("\n");
  assert.deepEqual(
    findComposeEnvMismatches(text, composeNames, settingNames).map((hit) => [hit.line, hit.name]),
    [
      [1, "SESSION_SECRET"],
      [5, "FORWARDED_ALLOW_IPS"],
    ],
  );
});

test("sync-docs fails loudly when docs reference a Compose overlay the release channel does not ship", () => {
  const { repoDir } = createFixtureGitRepo(
    baseFixtureFiles({
      "docs/operations/deployment.md": [
        "# Deployment",
        "",
        "Select the overlay:",
        "",
        "```bash",
        'echo "COMPOSE_FILE=docker-compose.yml:docker/gpu.nvidia.yml" >> .env',
        "```",
        "",
      ].join("\n"),
    }),
    "v9.9.9",
  );
  const outDir = makeTempDir("cryozen-docs-fail-unpublished-");

  assert.throws(
    () => syncDocs({ productRepo: repoDir, ref: "v9.9.9", outDir, factsPath: FACTS_PATH }),
    /^Error: Unpublished path check failed:\ndocs\/operations\/deployment\.md:\d+ references docker\/gpu\.nvidia\.yml, which the public release channel does not ship: [^\n]*$/,
  );
  assert.equal(existsSync(join(outDir, "index.md")), false, "failed sync must not write partial output");
});

test("findUnpublishedPaths checks Compose files and host-run scripts against the release channel tree", () => {
  const publishedPaths = JSON.parse(readFileSync(RELEASE_CHANNEL_FILES_PATH, "utf8"));
  const text = [
    "Edit `docker-compose.yml`, then add `docker-compose.override.yml` next to it.",
    "Use `docker-compose.gpu-amd.yml` for single-file tools.",
    "The `cli/seed_admin.py` script provisions an admin.",
    "```bash",
    "docker compose exec cryozen python cli/seed_admin.py --email a@b.test",
    "cli/check-docker-gpu.sh",
    "./cli/pipeline.sh --strict-lint",
    'COMPOSE_FILE="docker-compose.yml:docker/gpu.amd.yml" docker compose up -d',
    "```",
  ].join("\n");

  assert.deepEqual(
    findUnpublishedPaths(text, publishedPaths).map((hit) => [hit.line, hit.path]),
    [
      [2, "docker-compose.gpu-amd.yml"],
      [6, "cli/check-docker-gpu.sh"],
      [7, "cli/pipeline.sh"],
      [8, "docker/gpu.amd.yml"],
    ],
  );
});

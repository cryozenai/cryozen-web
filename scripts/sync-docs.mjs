#!/usr/bin/env node
// Syncs user-facing documentation from a pinned CryoZen product repo ref into
// content/docs/*.md, rewriting links, pruning unsynced index sections, applying
// explicit transforms for banned terms, and failing if any banned term survives.
//
// Usage:
//   PRODUCT_REPO=/path/to/cryozen node scripts/sync-docs.mjs [--ref v1.2.0]
//   node scripts/sync-docs.mjs --product /path/to/cryozen --ref v1.2.0
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_REF = "v1.2.0";
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUT_DIR = join(REPO_ROOT, "content", "docs");
const DEFAULT_FACTS_PATH = join(REPO_ROOT, "lib", "release-facts.json");

/**
 * User-facing allowlist mapped from source path in the product repository to
 * output slug under /docs (and content/docs/<file>.md).
 */
export const DOC_ALLOWLIST = [
  { source: "docs/README.md", slug: "" },
  { source: "docs/guides/integrations.md", slug: "guides/integrations" },
  { source: "docs/guides/api-access.md", slug: "guides/api-access" },
  { source: "docs/reference/api.md", slug: "reference/api" },
  { source: "docs/reference/cli.md", slug: "reference/cli" },
  { source: "docs/reference/configuration.md", slug: "reference/configuration" },
  { source: "docs/operations/deployment.md", slug: "operations/deployment" },
  { source: "docs/operations/troubleshooting.md", slug: "operations/troubleshooting" },
  { source: "docs/operations/upgrading.md", slug: "operations/upgrading" },
  { source: "docs/concepts/glossary.md", slug: "concepts/glossary" },
];

const SLUG_BY_SOURCE = new Map(DOC_ALLOWLIST.map((entry) => [entry.source, entry.slug]));
const SECURITY_BASENAMES = new Set(["THREAT_MODEL.md", "SECURITY.md"]);
const PRIVATE_REPO_URL_RE = /^https?:\/\/github\.com\/cryozenai\/cryozen(?:$|[/?#]|\.git$)/i;

/**
 * Explicit transform table for source passages that legitimately reference a
 * banned term (such as the project's previous name or pre-organization image
 * path) so public site docs remain truthful without leaking banned strings.
 */
export const BANNED_TRANSFORMS = [
  {
    id: "readme-upgrading-previous-name",
    files: ["docs/README.md"],
    reason: "Describe legacy upgrade support without naming the former project name.",
    pattern: "from installations that ran under the previous name, Srijan.",
    replacement: "from installations that ran under the project's previous name.",
  },
  {
    id: "glossary-previous-name",
    files: ["docs/concepts/glossary.md"],
    reason: "Record the rename in the glossary without using the banned former name.",
    pattern: "The product itself was also renamed, from Srijan to CryoZen.",
    replacement: "The product itself was also renamed to CryoZen from the project's previous name.",
  },
  {
    id: "api-access-legacy-webhook-headers",
    files: ["docs/guides/api-access.md"],
    reason: "Explain legacy duplicate webhook headers without publishing the banned header prefix.",
    pattern: [
      "- **`X-CryoZen-Event`**: the event name, matching the `event` key in the body.",
      "- **`X-Srijan-Event`**: a duplicate of the above, kept for receivers written before the rename.",
      "- **`X-CryoZen-Signature`**: the hex HMAC-SHA256 of the raw body, present only when the webhook has a secret.",
      "- **`X-Srijan-Signature`**: a duplicate of the signature, kept for the same reason.",
    ].join("\n"),
    replacement: [
      "- **`X-CryoZen-Event`**: the event name, matching the `event` key in the body (a legacy duplicate event header from the project's previous name is also sent for older receivers).",
      "- **`X-CryoZen-Signature`**: the hex HMAC-SHA256 of the raw body, present only when the webhook has a secret (a legacy duplicate signature header is also sent for older receivers).",
    ].join("\n"),
  },
  {
    id: "api-legacy-session-cookie",
    files: ["docs/reference/api.md"],
    reason: "Document pre-rename cookie compatibility without naming the banned cookie string.",
    pattern: "A pre-rename `srijan_session` cookie is still accepted.",
    replacement: "A pre-rename legacy session cookie is still accepted.",
  },
  {
    id: "config-legacy-env-intro",
    files: ["docs/reference/configuration.md"],
    reason: "Describe legacy env var aliasing without exposing the banned env prefix.",
    pattern:
      "Any variable named `SRIJAN_*` is mirrored onto the matching `CRYOZEN_*` name once at startup by `_alias_legacy_env()` in `services/constants.py`, so pre-rename installs keep working without edits, and an explicitly set `CRYOZEN_*` value always beats its legacy twin.",
    replacement:
      "Any legacy variable prefixed with the project's previous name is mirrored onto the matching `CRYOZEN_*` name once at startup by `_alias_legacy_env()` in `services/constants.py`, so pre-rename installs keep working without edits, and an explicitly set `CRYOZEN_*` value always beats its legacy twin.",
  },
  {
    id: "config-legacy-data-dir",
    files: ["docs/reference/configuration.md"],
    reason: "Describe fallback legacy data dir without naming the banned directory.",
    pattern: "`~/.cryozen`, or `~/.srijan` when that directory already exists and `~/.cryozen` does not",
    replacement:
      "`~/.cryozen`, or the legacy data directory under `~` from the project's previous name when that directory already exists and `~/.cryozen` does not",
  },
  {
    id: "config-legacy-aliasing-section",
    files: ["docs/reference/configuration.md"],
    reason: "Explain env prefix aliasing mechanics without exposing the banned prefix.",
    pattern: [
      "On import, `_alias_legacy_env()` in `services/constants.py` walks the process environment and mirrors every `SRIJAN_*` key onto the matching `CRYOZEN_*` key using `os.environ.setdefault`.",
      "Two consequences follow:",
      "",
      "- **`CRYOZEN_*` wins**: an explicitly set `CRYOZEN_*` value is never overwritten by its `SRIJAN_*` twin, because `setdefault` does not replace an existing key.",
      "- **Only the prefix is translated**: `SRIJAN_DATA_DIR` becomes `CRYOZEN_DATA_DIR`, but variables without the prefix, such as `DATABASE_URL` or `SESSION_SECRET`, have no legacy alias.",
    ].join("\n"),
    replacement: [
      "On import, `_alias_legacy_env()` in `services/constants.py` walks the process environment and mirrors every key prefixed with the project's previous name onto the matching `CRYOZEN_*` key using `os.environ.setdefault`.",
      "Two consequences follow:",
      "",
      "- **`CRYOZEN_*` wins**: an explicitly set `CRYOZEN_*` value is never overwritten by its legacy twin, because `setdefault` does not replace an existing key.",
      "- **Only the prefix is translated**: a legacy `*_DATA_DIR` variable becomes `CRYOZEN_DATA_DIR`, but variables without the prefix, such as `DATABASE_URL` or `SESSION_SECRET`, have no legacy alias.",
    ].join("\n"),
  },
  {
    id: "troubleshooting-legacy-data-dir-probe",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Describe data directory probing without naming the banned directory.",
    pattern:
      "which is faster than guessing between `~/.cryozen`, `~/.srijan`, and whatever `CRYOZEN_DATA_DIR` names.",
    replacement:
      "which is faster than guessing between `~/.cryozen`, the legacy pre-rename data directory, and whatever `CRYOZEN_DATA_DIR` names.",
  },
  {
    id: "troubleshooting-legacy-data-dir-moved",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Explain directory precedence collision without naming the banned directory.",
    pattern:
      "or a `~/.cryozen` directory was created next to an existing `~/.srijan`, which flips resolution to the new path and leaves the old accounts behind.",
    replacement:
      "or a `~/.cryozen` directory was created next to an existing legacy pre-rename data directory, which flips resolution to the new path and leaves the old accounts behind.",
  },
  {
    id: "upgrading-intro-previous-name",
    files: ["docs/operations/upgrading.md"],
    reason: "Summarize upgrade compatibility in the intro without using the banned product name.",
    pattern: "what an installation of the former Srijan release carries over on its own",
    replacement: "what an installation from the project's previous name carries over on its own",
  },
  {
    id: "upgrading-backup-legacy-dir",
    files: ["docs/operations/upgrading.md"],
    reason: "Describe native data directory fallback without naming the banned directory.",
    pattern:
      "- **Native launcher and systemd**: `~/.cryozen`, or `~/.srijan` when that directory exists and `~/.cryozen` does not.",
    replacement:
      "- **Native launcher and systemd**: `~/.cryozen`, or the legacy pre-rename data directory under `~` when that directory exists and `~/.cryozen` does not.",
  },
  {
    id: "upgrading-old-ghcr-image",
    files: ["docs/operations/upgrading.md"],
    reason: "Replace the banned personal GHCR image path with a truthful description.",
    pattern: "Docker installs up to v1.1.0 pull `ghcr.io/shreejitverma/cryozen:latest`.",
    replacement: "Docker installs up to v1.1.0 pulled from the pre-organization container registry path.",
  },
  {
    id: "upgrading-from-previous-name-section",
    files: ["docs/operations/upgrading.md"],
    reason: "Document pre-rename compatibility seams truthfully without leaking banned identifiers.",
    pattern: [
      "## Upgrading from Srijan",
      "",
      "The application and the repository were renamed from Srijan to CryoZen.",
      "The rename ships with compatibility seams so an existing install keeps working after the upgrade with no configuration changes at all.",
      "Upgrade the way your deployment path describes above, and expect the following to carry over on their own.",
      "",
      "Six things carry over automatically:",
      "",
      "- **Legacy environment variables**: at startup the application mirrors every `SRIJAN_*` variable in the environment onto the matching `CRYOZEN_*` name. The mirror uses a default-only write, so a `CRYOZEN_*` value you set explicitly always wins over its legacy twin. Variables that were never prefixed, such as `APP_PORT` and `AUTH_ENABLED`, did not change name and need no handling.",
      "- **The `~/.srijan` data directory**: when `CRYOZEN_DATA_DIR` is unset, no vault config file is present, `~/.cryozen` does not exist, and `~/.srijan` does, the application uses `~/.srijan`. A pre-rename install keeps reading its own data instead of starting empty. A pre-rename `~/.srijan_vault_config.json` is also still read, after the `~/.cryozen_vault_config.json` of the same shape.",
      "- **Signed-in sessions**: the session cookie is now `cryozen_session`, and the application falls back to the pre-rename `srijan_session` cookie when the new one is absent. Nobody is signed out by the upgrade, and signing out clears both cookie names. The new cookie wins whenever both are present.",
      "- **Browser storage keys**: on first load after the upgrade, an inline script copies every `localStorage` and `sessionStorage` key beginning `srijan-` to the same key beginning `cryozen-`, and only where the new key is not already set. The legacy keys are left in place.",
      "- **Vector collections**: on every boot, the application renames ChromaDB collections named `srijan_<name>` and `srijan_<name>_<lane>` to their `cryozen_` equivalents. The rename happens in place with no re-embedding. A `cryozen_` collection that already exists and holds documents is never overwritten, and the legacy collection is left alone; an empty one is deleted so the legacy data can be adopted on the next attempt.",
      "- **Mail headers and the scheduled-mail column**: outgoing mail is stamped `X-CryoZen-Origin` and `X-CryoZen-Kind`, and the self-mail filter and the IMAP reminder search still match the pre-rename `X-Srijan-Origin`, `X-Srijan-Kind`, and the `reminder (srijan):` subject prefix. The scheduled-mail table gains a `cryozen_kind` column that is backfilled from `srijan_kind`, and the legacy column stays in place so a downgrade still finds its values.",
      "",
      "The seventh is the entrypoint.",
      "The module is now `cryozen`, and `srijan.py` remains as a shim that re-exports the application object, so a service unit or script still running `uvicorn srijan:app` keeps working unchanged.",
      "",
      "Nothing in that list expires on a schedule, so none of the following is urgent.",
      "Do them when it suits you, and each is independent of the others:",
      "",
      "- **Rename your environment variables**: change `SRIJAN_*` to `CRYOZEN_*` in `.env`, shell profiles, and unit files. The aliasing runs once at import, so a variable exported after startup is not picked up.",
      "- **Point service units at `cryozen:app`**: edit `ExecStart` in your systemd unit and any launcher script you wrote yourself, then run `sudo systemctl daemon-reload` and restart. This removes the dependency on the shim.",
      "- **Update command-line aliases**: the repository now ships only `cli/cryozen` and its `cli/cryozen-*` subcommands. A symlink or shell alias pointing at a pre-rename script name refers to a file that no longer exists, so repoint it, for example with `ln -sf \"$PWD/cli/cryozen\" ~/.local/bin/cryozen`.",
      "- **Move the data directory**: nothing moves `~/.srijan` to `~/.cryozen` for you, and the application is content to keep using the old path indefinitely. If you want the new name, stop the application, `mv ~/.srijan ~/.cryozen`, and start it again.",
    ].join("\n"),
    replacement: [
      "## Upgrading from the project's previous name",
      "",
      "The application and the repository were renamed to CryoZen from the project's previous name.",
      "The rename ships with compatibility seams so an existing install keeps working after the upgrade with no configuration changes at all.",
      "Upgrade the way your deployment path describes above, and expect the following to carry over on their own.",
      "",
      "Six things carry over automatically:",
      "",
      "- **Legacy environment variables**: at startup the application mirrors every variable using the previous-name prefix onto the matching `CRYOZEN_*` name. The mirror uses a default-only write, so a `CRYOZEN_*` value you set explicitly always wins over its legacy twin. Variables that were never prefixed, such as `APP_PORT` and `AUTH_ENABLED`, did not change name and need no handling.",
      "- **The legacy data directory**: when `CRYOZEN_DATA_DIR` is unset, no vault config file is present, `~/.cryozen` does not exist, and the pre-rename directory under `~` does, the application keeps reading it instead of starting empty. A pre-rename vault config file is also still read after `~/.cryozen_vault_config.json`.",
      "- **Signed-in sessions**: the session cookie is now `cryozen_session`, and the application falls back to the pre-rename session cookie when the new one is absent. Nobody is signed out by the upgrade, and signing out clears both cookie names. The new cookie wins whenever both are present.",
      "- **Browser storage keys**: on first load after the upgrade, an inline script copies every `localStorage` and `sessionStorage` key from the previous-name prefix to the matching `cryozen-` key where the new key is not already set. The legacy keys are left in place.",
      "- **Vector collections**: on every boot, the application renames ChromaDB collections from the previous-name prefix to their `cryozen_` equivalents in place with no re-embedding. A `cryozen_` collection that already exists and holds documents is never overwritten, and the legacy collection is left alone; an empty one is deleted so the legacy data can be adopted on the next attempt.",
      "- **Mail headers and the scheduled-mail column**: outgoing mail is stamped `X-CryoZen-Origin` and `X-CryoZen-Kind`, while the self-mail filter and IMAP reminder search still match the legacy headers and subject prefix from before the rename. The scheduled-mail table gains a `cryozen_kind` column backfilled from the legacy column, which stays in place so a downgrade still finds its values.",
      "",
      "The seventh is the entrypoint.",
      "The module is now `cryozen`, and a compatibility shim module remains that re-exports the application object, so a service unit or script still running the pre-rename `uvicorn` target keeps working unchanged.",
      "",
      "Nothing in that list expires on a schedule, so none of the following is urgent.",
      "Do them when it suits you, and each is independent of the others:",
      "",
      "- **Rename your environment variables**: switch variables from the previous-name prefix to `CRYOZEN_*` in `.env`, shell profiles, and unit files. The aliasing runs once at import, so a variable exported after startup is not picked up.",
      "- **Point service units at `cryozen:app`**: edit `ExecStart` in your systemd unit and any launcher script you wrote yourself, then run `sudo systemctl daemon-reload` and restart. This removes the dependency on the shim.",
      "- **Update command-line aliases**: the repository now ships only `cli/cryozen` and its `cli/cryozen-*` subcommands. A symlink or shell alias pointing at a pre-rename script name refers to a file that no longer exists, so repoint it, for example with `ln -sf \"$PWD/cli/cryozen\" ~/.local/bin/cryozen`.",
      "- **Move the data directory**: nothing moves the pre-rename data directory to `~/.cryozen` for you, and the application is content to keep using the old path indefinitely. If you want the new name, stop the application, move the old directory to `~/.cryozen`, and start it again.",
    ].join("\n"),
  },
  {
    id: "upgrading-rollback-legacy-state",
    files: ["docs/operations/upgrading.md"],
    reason: "Describe rollback legacy state retention without naming banned identifiers.",
    pattern: [
      "The rename seams deliberately leave legacy state in place: the `srijan_kind` column, the `srijan-` browser storage keys, and the `srijan_session` cookie all survive the upgrade, so a pre-rename build still finds them.",
      "",
      "One thing does not roll back on its own.",
      "Vector collections renamed from `srijan_*` to `cryozen_*` are never renamed back, and a pre-rename build looks only for the legacy names, so it finds an empty vector store and falls back to keyword search.",
    ].join("\n"),
    replacement: [
      "The rename seams deliberately leave legacy state in place: the legacy scheduled-mail column, the legacy browser storage keys, and the legacy session cookie all survive the upgrade, so a pre-rename build still finds them.",
      "",
      "One thing does not roll back on its own.",
      "Vector collections renamed from the legacy prefix to `cryozen_*` are never renamed back, and a pre-rename build looks only for the legacy names, so it finds an empty vector store and falls back to keyword search.",
    ].join("\n"),
  },
];

function gitShow(productRepo, ref, path) {
  return execFileSync("git", ["-C", productRepo, "show", `${ref}:${path}`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function gitCommitSha(productRepo, ref) {
  return execFileSync("git", ["-C", productRepo, "rev-parse", `${ref}^{commit}`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function docUrlForSlug(slug) {
  return slug === "" ? "/docs" : `/docs/${slug}`;
}

function outputFileForSlug(outDir, slug) {
  return slug === "" ? join(outDir, "index.md") : join(outDir, `${slug}.md`);
}

function extractTitle(markdown, fallback) {
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^#\s+(.+?)\s*$/.exec(line);
    if (match) return match[1].trim();
  }
  return fallback;
}

/**
 * Strips `##` sections from the docs index whose links point solely to files
 * outside the allowlist (plus `/security` is kept), and strips list bullets
 * inside remaining sections whose sole link is an unsynced repo file.
 */
function pruneDocsIndex(markdown, sourcePath) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = { heading: null, lines: [] };

  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      sections.push(current);
      current = { heading: line, lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);

  const dir = posix.dirname(sourcePath);
  const isSyncedOrSecurityTarget = (target) => {
    if (/^(https?:|mailto:|#)/i.test(target)) return true;
    const [rawPath] = target.split("#");
    const resolved = posix.normalize(posix.join(dir, rawPath));
    return SLUG_BY_SOURCE.has(resolved) || SECURITY_BASENAMES.has(posix.basename(resolved));
  };

  const keptSections = [];
  const removedSections = [];

  for (const section of sections) {
    if (!section.heading) {
      keptSections.push(section.lines.join("\n"));
      continue;
    }

    const body = section.lines.join("\n");
    const links = [...body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((m) => m[1]);
    if (links.length > 0 && links.every((target) => !isSyncedOrSecurityTarget(target))) {
      removedSections.push(section.heading.replace(/^##\s+/, "").trim());
      continue;
    }

    const filteredLines = section.lines.filter((line) => {
      if (!/^\s*[-*]\s+\[/.test(line)) return true;
      const lineLinks = [...line.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((m) => m[1]);
      if (lineLinks.length === 0) return true;
      return lineLinks.some((target) => isSyncedOrSecurityTarget(target));
    });
    keptSections.push(filteredLines.join("\n"));
  }

  return {
    markdown: `${keptSections.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`,
    removedSections,
  };
}

/**
 * Rewrites markdown links outside fenced code blocks:
 * - Relative links to synced docs -> /docs/<slug>#anchor (or /docs#anchor)
 * - Links to THREAT_MODEL.md or SECURITY.md -> /security
 * - Links to unsynced repo files or github.com/cryozenai/cryozen -> unlinked (text kept)
 */
function rewriteLinks(markdown, sourcePath) {
  const dir = posix.dirname(sourcePath);
  const unlinked = [];
  const lines = markdown.split(/\r?\n/);
  let inFence = false;
  let fenceMarker = "";

  const rewrittenLines = lines.map((line, index) => {
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (marker === fenceMarker) {
        inFence = false;
        fenceMarker = "";
      }
      return line;
    }
    if (inFence) return line;

    return line.replace(/(?<!!)\[([^\]]+)\]\(([^)\s]+)\)/g, (full, label, rawTarget) => {
      if (rawTarget.startsWith("#") || /^mailto:/i.test(rawTarget)) {
        return full;
      }

      if (/^https?:\/\//i.test(rawTarget)) {
        if (PRIVATE_REPO_URL_RE.test(rawTarget)) {
          unlinked.push({
            file: sourcePath,
            line: index + 1,
            label,
            target: rawTarget,
            reason: "private-repo-url",
          });
          return label;
        }
        return full;
      }

      const hashIdx = rawTarget.indexOf("#");
      const rawPath = hashIdx === -1 ? rawTarget : rawTarget.slice(0, hashIdx);
      const anchor = hashIdx === -1 ? "" : rawTarget.slice(hashIdx);
      if (!rawPath) return full;

      const resolved = posix.normalize(posix.join(dir, rawPath));
      if (SLUG_BY_SOURCE.has(resolved)) {
        const dest = docUrlForSlug(SLUG_BY_SOURCE.get(resolved));
        return `[${label}](${dest}${anchor})`;
      }

      if (SECURITY_BASENAMES.has(posix.basename(resolved))) {
        return `[${label}](/security)`;
      }

      unlinked.push({
        file: sourcePath,
        line: index + 1,
        label,
        target: rawTarget,
        reason: "unsynced-repo-file",
      });
      return label;
    });
  });

  return { markdown: rewrittenLines.join("\n"), unlinked };
}

function applyTransforms(markdown, sourcePath, transforms) {
  let result = markdown;
  const applied = [];
  for (const rule of transforms) {
    if (rule.files !== "*" && !rule.files.includes(sourcePath)) continue;
    if (typeof rule.pattern === "string") {
      if (result.includes(rule.pattern)) {
        result = result.replaceAll(rule.pattern, rule.replacement);
        applied.push({ id: rule.id, file: sourcePath, reason: rule.reason });
      }
    } else if (rule.pattern instanceof RegExp) {
      if (rule.pattern.test(result)) {
        result = result.replace(rule.pattern, rule.replacement);
        applied.push({ id: rule.id, file: sourcePath, reason: rule.reason });
      }
    }
  }
  return { markdown: result, applied };
}

function findBannedMatches(text, bannedTerms) {
  const matches = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const lower = lines[i].toLowerCase();
    for (const term of bannedTerms) {
      if (lower.includes(term.toLowerCase())) {
        matches.push({ term, line: i + 1, text: lines[i].trim() });
      }
    }
  }
  return matches;
}

function formatFrontmatter({ title, source, ref, commit }) {
  const quote = (value) => JSON.stringify(String(value));
  return [
    "---",
    `title: ${quote(title)}`,
    `source: ${quote(source)}`,
    `ref: ${quote(ref)}`,
    `commit: ${quote(commit)}`,
    "---",
    "",
  ].join("\n");
}

export function syncDocs({
  productRepo,
  ref = DEFAULT_REF,
  outDir = DEFAULT_OUT_DIR,
  factsPath = DEFAULT_FACTS_PATH,
  transforms = BANNED_TRANSFORMS,
} = {}) {
  if (!productRepo) {
    throw new Error("Missing product repo path: set PRODUCT_REPO or pass --product <path>.");
  }

  const facts = JSON.parse(readFileSync(factsPath, "utf8"));
  const bannedTerms = Array.isArray(facts.banned) ? facts.banned : [];
  const commit = gitCommitSha(productRepo, ref);

  const prepared = [];
  const appliedTransforms = [];
  const unlinkedLinks = [];
  const removedIndexSections = [];

  for (const entry of DOC_ALLOWLIST) {
    let body = gitShow(productRepo, ref, entry.source);

    if (entry.source === "docs/README.md") {
      const pruned = pruneDocsIndex(body, entry.source);
      body = pruned.markdown;
      removedIndexSections.push(...pruned.removedSections);
    }

    const transformed = applyTransforms(body, entry.source, transforms);
    body = transformed.markdown;
    appliedTransforms.push(...transformed.applied);

    const rewritten = rewriteLinks(body, entry.source);
    body = rewritten.markdown;
    unlinkedLinks.push(...rewritten.unlinked);

    const title = extractTitle(body, entry.slug || "CryoZen documentation");
    const fullContent = `${formatFrontmatter({ title, source: entry.source, ref, commit })}${body.trimEnd()}\n`;

    const bannedHits = findBannedMatches(fullContent, bannedTerms);
    if (bannedHits.length > 0) {
      const detail = bannedHits
        .map((hit) => `${entry.source}:${hit.line} matched banned term ${JSON.stringify(hit.term)}: ${hit.text}`)
        .join("\n");
      throw new Error(`Banned term check failed:\n${detail}`);
    }

    prepared.push({
      source: entry.source,
      slug: entry.slug,
      outPath: outputFileForSlug(outDir, entry.slug),
      content: fullContent,
    });
  }

  rmSync(outDir, { recursive: true, force: true });
  for (const doc of prepared) {
    mkdirSync(dirname(doc.outPath), { recursive: true });
    writeFileSync(doc.outPath, doc.content, "utf8");
  }

  return {
    ref,
    commit,
    files: prepared.map((doc) => ({ source: doc.source, slug: doc.slug, outPath: doc.outPath })),
    appliedTransforms,
    unlinkedLinks,
    removedIndexSections,
  };
}

function parseArgs(argv) {
  const options = {
    productRepo: process.env.PRODUCT_REPO || "",
    ref: process.env.PRODUCT_REF || DEFAULT_REF,
    outDir: DEFAULT_OUT_DIR,
    factsPath: DEFAULT_FACTS_PATH,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--product" && argv[i + 1]) {
      options.productRepo = argv[++i];
    } else if (arg === "--ref" && argv[i + 1]) {
      options.ref = argv[++i];
    } else if (arg === "--out" && argv[i + 1]) {
      options.outDir = argv[++i];
    } else if (arg === "--facts" && argv[i + 1]) {
      options.factsPath = argv[++i];
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  return options;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const report = syncDocs(parseArgs(process.argv.slice(2)));
    console.log(`Synced ${report.files.length} docs from ${report.ref} (${report.commit.slice(0, 12)})`);
    console.log(`Removed index sections: ${report.removedIndexSections.join(", ") || "none"}`);
    console.log(`Applied transforms (${report.appliedTransforms.length}):`);
    for (const item of report.appliedTransforms) {
      console.log(`  - [${item.id}] ${item.file}: ${item.reason}`);
    }
    console.log(`Unlinked links (${report.unlinkedLinks.length}):`);
    for (const item of report.unlinkedLinks) {
      console.log(`  - ${item.file}:${item.line} [${item.label}](${item.target}) (${item.reason})`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

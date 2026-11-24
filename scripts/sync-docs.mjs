#!/usr/bin/env node
// Syncs user-facing documentation from a pinned CryoZen product repo ref into
// content/docs/*.md, rewriting links, pruning unsynced index sections, applying
// explicit transforms for banned terms and private-repo-only blocks, and failing
// if any transform matches nothing in its file, or if any banned term, private
// source-repo URL, `docker compose ... --build` command, or source-checkout-only
// content (launcher scripts, systemd, the cryozen-ui unit, ~/.cryozen) survives
// outside the explicit allowlist, if the docs reference a Compose file or a
// host-run script that lib/release-channel-files.json does not list, or if the
// docs tell Compose users to set a variable in `.env` that
// lib/release-compose.yml never reads.
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
const DEFAULT_COMPOSE_PATH = join(REPO_ROOT, "lib", "release-compose.yml");
const DEFAULT_CHANNEL_FILES_PATH = join(REPO_ROOT, "lib", "release-channel-files.json");

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
const DEFAULT_SOURCE_REPO = "cryozenai/cryozen";
const DOCKER_COMPOSE_BUILD_LINE_RE =
  /\bdocker[\s-]+compose\b[^\r\n]*\s--build(?=$|\s|[`"'();])/i;

// Strong markers of an instruction or condition that only applies to a source
// checkout (native launcher scripts, the systemd unit, the checkout's files).
// uvicorn is not a marker: the published image and the desktop launcher run it too.
const SOURCE_ONLY_MARKER_RE =
  /\bsystemd\b|\bnative (?:launcher|install)|\bstart(?:-linux|-macos)?\.sh\b|\blaunch-windows\.ps1\b|\bcryozen-ui\b|\binstall-service\b|\bthe checkout's\b/i;
// The source-checkout default data directory; a line may name it only when it
// also names every desktop data directory from lib/release-facts.json.
const SOURCE_CHECKOUT_DATA_DIR_RE = /~\/\.cryozen\b/;
// Exact lines that legitimately carry a marker: headings of source-only
// sections and the "require a source checkout, which is not public" notes the
// transforms write in their place.
const SOURCE_ONLY_ALLOWLIST = new Set([
  "The native launcher and systemd paths require a source checkout, which is not public.",
  "## Deploy with the native launcher",
  "Source builds and the native launcher scripts (`start.sh` and `launch-windows.ps1`) require a source checkout, which is not public; for public installs, download a desktop package on [the download page](/download) or pull the published container image from [/download#docker](/download#docker).",
  "## Deploy as a systemd service",
  "Source builds and the `systemd` service unit files (`cryozen-ui.service` and `install-service.sh`) require a source checkout, which is not public; for public server deployments, pull the published container image from [/download#docker](/download#docker).",
  "- **Native launcher and systemd**: both paths require a source checkout, which is not public.",
  "- **Native launcher and systemd**: these paths require a source checkout, which is not public.",
  "Backing up and restoring a native launcher or systemd install by hand requires a source checkout, which is not public.",
  "## Upgrade a native launcher deployment",
  "Desktop packages from [the download page](/download) upgrade by installing the new package; source-based native launcher upgrades (`git pull` and `./start.sh`) require a source checkout, which is not public, and container deployments pull the published image from [/download#docker](/download#docker).",
  "## Upgrade a systemd deployment",
  "Source-based `systemd` deployments require a source checkout, which is not public; for public container deployments, pull the published image from [/download#docker](/download#docker).",
  "- **Move the data directory**: Docker Compose pins `CRYOZEN_DATA_DIR` to `/app/data`, and moving the pre-rename data directory on a native launcher or systemd install requires a source checkout, which is not public.",
]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPrivateRepoUrlRegex(sourceRepo) {
  const escaped = escapeRegExp(sourceRepo || DEFAULT_SOURCE_REPO);
  return new RegExp(`^https?://github\\.com/${escaped}(?:$|[/?#]|\\.git$)`, "i");
}

function buildSourceRepoRegex(sourceRepo) {
  // Match github.com/<owner>/<repo> anywhere (including inside code blocks),
  // without false-matching sibling repos such as <repo>-releases or <repo>-web,
  // and including a sentence-final URL whose trailing `.` is punctuation.
  const escaped = escapeRegExp(sourceRepo);
  return new RegExp(
    `github\\.com/${escaped}(?:\\.git)?(?=$|[^A-Za-z0-9_.-]|\\.(?![A-Za-z0-9_-]))`,
    "i",
  );
}

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
    // packaging/launcher.py sets CRYOZEN_DATA_DIR to the platform data directory (lib/release-facts.json install.data_dirs).
    id: "config-legacy-data-dir",
    files: ["docs/reference/configuration.md"],
    reason: "Describe the fallback legacy data dir without naming the banned directory, and name the desktop package data directories.",
    pattern:
      "`~/.cryozen`, or `~/.srijan` when that directory already exists and `~/.cryozen` does not (`services/constants.py`) | Absolute vault path holding sessions, memory, uploads, settings, and the SQLite database. It also overrides any `vault_path` stored in `~/.cryozen_vault_config.json`. Under pytest the suite pins it to a fresh temporary directory. Compose pins it to `/app/data` so writes land in the bind mount.",
    replacement:
      "`~/.cryozen`, or the legacy data directory under `~` from the project's previous name when that directory already exists and `~/.cryozen` does not (`services/constants.py`) | Absolute vault path holding sessions, memory, uploads, settings, and the SQLite database. It also overrides any `vault_path` stored in `~/.cryozen_vault_config.json`. Under pytest the suite pins it to a fresh temporary directory. Compose pins it to `/app/data` so writes land in the bind mount, and desktop packages set it to `~/Library/Application Support/CryoZen` on macOS, `%LOCALAPPDATA%\\CryoZen` on Windows, and `~/.local/share/cryozen` on Linux.",
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
    reason: "Describe data directory probing without naming the banned directory or the source-checkout default.",
    pattern:
      "which is faster than guessing between `~/.cryozen`, `~/.srijan`, and whatever `CRYOZEN_DATA_DIR` names.",
    replacement:
      "which is faster than guessing which directory it resolved.",
  },
  {
    id: "troubleshooting-legacy-data-dir-moved",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Explain a moved data directory without the banned directory or the source-checkout-only collision.",
    pattern:
      "or a `~/.cryozen` directory was created next to an existing `~/.srijan`, which flips resolution to the new path and leaves the old accounts behind.",
    replacement:
      "which points the application at a different directory and leaves the old accounts behind.",
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
    reason: "Replace the source-only native data directory line, which names the banned directory, with the desktop package data directories.",
    pattern: [
      "- **Native launcher and systemd**: `~/.cryozen`, or `~/.srijan` when that directory exists and `~/.cryozen` does not.",
      "- **Any path with `CRYOZEN_DATA_DIR` set**: whatever that variable names, which wins over both defaults.",
    ].join("\n"),
    replacement: [
      "- **Desktop packages**: `~/Library/Application Support/CryoZen` on macOS, `%LOCALAPPDATA%\\CryoZen` on Windows, and `~/.local/share/cryozen` on Linux.",
      "- **Native launcher and systemd**: these paths require a source checkout, which is not public.",
      "- **Any path with `CRYOZEN_DATA_DIR` set**: whatever that variable names, which wins over the defaults above.",
    ].join("\n"),
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
      "- **The legacy data directory**: a source-checkout install that still uses the pre-rename data directory keeps reading it instead of starting empty. Desktop packages and Docker Compose always set `CRYOZEN_DATA_DIR`, so the fallback does not apply to them.",
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
      "- **Point service units at `cryozen:app`**: service units and launcher scripts require a source checkout, which is not public.",
      "- **Update command-line aliases**: the container image and source repository ship only `cli/cryozen` and its `cli/cryozen-*` subcommands (run them inside Docker with `docker compose exec cryozen python cli/cryozen`; host-side symlinks such as `~/.local/bin/cryozen` apply to source checkouts, which are not public).",
      "- **Move the data directory**: Docker Compose pins `CRYOZEN_DATA_DIR` to `/app/data`, and moving the pre-rename data directory on a native launcher or systemd install requires a source checkout, which is not public.",
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

/**
 * Reviewed transforms that rewrite source-repo-only commands (private repo
 * clones, `--build` flags, host-side `cli/` and `scripts/` paths, and
 * source-only sections) to truthful public equivalents using the published
 * container image (`ghcr.io/cryozenai/cryozen`) and `cryozen-releases` bundle.
 */
export const PUBLIC_INSTALL_TRANSFORMS = [
  {
    // Public visitors clone cryozen-releases and pull ghcr.io/cryozenai/cryozen (no --build).
    id: "deployment-docker-compose-public",
    files: ["docs/operations/deployment.md"],
    reason: "Rewrite Docker Compose quickstart from private source build to public cryozen-releases pull.",
    pattern: [
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
    ].join("\n"),
    replacement: [
      "## Deploy with Docker Compose",
      "",
      "The Compose stack pulls the published `ghcr.io/cryozenai/cryozen` image and starts four services.",
      "You need Docker with Compose v2.",
      "",
      "```bash",
      "git clone https://github.com/cryozenai/cryozen-releases.git",
      "cd cryozen-releases",
      "cp .env.example .env",
      "docker compose up -d",
      "```",
    ].join("\n"),
  },
  {
    // Native launcher scripts (start.sh, launch-windows.ps1) only exist in the private source checkout.
    id: "deployment-native-launcher-source-only",
    files: ["docs/operations/deployment.md"],
    reason: "Replace source-only native launcher instructions with source-checkout notes and public download links.",
    pattern: [
      "## Deploy with the native launcher",
      "",
      "The native launchers create a virtual environment in `venv/`, install `requirements.txt`, run first-time setup, and start uvicorn in the foreground.",
      "Re-running them is safe: each step is skipped when its work is already done.",
      "",
      "On macOS and Linux, `start.sh` detects the operating system and hands off to the right script:",
      "",
      "```bash",
      "git clone https://github.com/cryozenai/cryozen.git",
      "cd cryozen",
      "./start.sh",
      "```",
      "",
      "On Windows, run the PowerShell launcher directly:",
      "",
      "```bash",
      "powershell -ExecutionPolicy Bypass -File .\\launch-windows.ps1",
      "```",
      "",
      "The three launchers do not agree on a default port, so confirm which one you are running:",
      "",
      "- **`start-linux.sh`**: binds `127.0.0.1:7000` and opens `http://127.0.0.1:7000`.",
      "- **`start-macos.sh`**: binds `127.0.0.1:7860`, because the macOS AirPlay Receiver usually holds port 7000.",
      "- **`launch-windows.ps1`**: binds `127.0.0.1:7000`, and accepts `-Port` and `-BindHost` flags.",
      "",
      "All three resolve the port and bind address the same way, reading `.env` and letting shell variables win over the file.",
      "The precedence is `CRYOZEN_PORT` and `CRYOZEN_HOST` first, then `APP_PORT` and `APP_BIND`, then the built-in default.",
      "Override the port for a single run without touching `.env`:",
      "",
      "```bash",
      "CRYOZEN_PORT=7900 ./start-macos.sh",
      "```",
      "",
      "On macOS the launcher also installs Homebrew formulas that the local model server needs: `tmux` for background downloads and serves, and `llama.cpp` for a Metal-enabled `llama-server`.",
      "A failed formula install warns and continues, because neither is required to boot the application.",
      "",
      "The native path does not start ChromaDB.",
      "Vector search falls back to keyword matching until you point `CHROMADB_HOST` and `CHROMADB_PORT` at a running instance, or start one alongside the app:",
      "",
      "```bash",
      "docker run -d --name chromadb -p 127.0.0.1:8100:8000 chromadb/chroma",
      "```",
    ].join("\n"),
    replacement: [
      "## Deploy with the native launcher",
      "",
      "Source builds and the native launcher scripts (`start.sh` and `launch-windows.ps1`) require a source checkout, which is not public; for public installs, download a desktop package on [the download page](/download) or pull the published container image from [/download#docker](/download#docker).",
    ].join("\n"),
  },
  {
    // The systemd unit and install-service.sh require a native source checkout.
    id: "deployment-systemd-source-only",
    files: ["docs/operations/deployment.md"],
    reason: "Replace source-only systemd setup instructions with source-checkout notes and /download#docker link.",
    pattern: [
      "## Deploy as a systemd service",
      "",
      "Use the shipped unit file on a Linux host that should start CryoZen at boot without Docker.",
      "Run a native launcher once first, so `venv/` exists and first-time setup has run.",
      "",
      "Edit `cryozen-ui.service` and replace `YOURUSER` in the `User`, `WorkingDirectory`, `ExecStart`, and `EnvironmentFile` lines with your account name and install path.",
      "Then install and start it:",
      "",
      "```bash",
      "./install-service.sh",
      "```",
      "",
      "The script copies the unit to `/etc/systemd/system/`, reloads systemd, enables the unit, starts it, and prints its status.",
      "The shipped `ExecStart` runs `uvicorn cryozen:app --host 127.0.0.1 --port 7000`, and `EnvironmentFile=-` makes the `.env` file optional rather than fatal when absent.",
      "",
      "Manage the service with the usual commands:",
      "",
      "```bash",
      "sudo systemctl restart cryozen-ui",
      "sudo systemctl status cryozen-ui",
      "journalctl -u cryozen-ui -f",
      "```",
      "",
      "Leave `--host 127.0.0.1` in place and publish the instance through a reverse proxy.",
      "Changing it to `0.0.0.0` puts an agent that can run shell commands on every interface of the host.",
    ].join("\n"),
    replacement: [
      "## Deploy as a systemd service",
      "",
      "Source builds and the `systemd` service unit files (`cryozen-ui.service` and `install-service.sh`) require a source checkout, which is not public; for public server deployments, pull the published container image from [/download#docker](/download#docker).",
    ].join("\n"),
  },
  {
    // The cryozen-ui systemd unit and the ~/.cryozen native data path only exist on a source checkout.
    id: "upgrading-backup-native-archive-source-only",
    files: ["docs/operations/upgrading.md"],
    reason: "Keep the Compose tar backup, and replace the systemd backup and native-archive restore with desktop and source-checkout notes.",
    pattern: [
      "For a stopped instance, or for a native install where the resolved directory sits outside the repository, copy the directory with a tool that preserves dotfiles:",
      "",
      "```bash",
      "docker compose stop cryozen",
      "tar -czf ~/cryozen-backup-$(date +%Y%m%d).tar.gz --exclude=data/backups -C . data",
      "docker compose start cryozen",
      "```",
      "",
      "```bash",
      "sudo systemctl stop cryozen-ui",
      "tar -czf ~/cryozen-backup-$(date +%Y%m%d).tar.gz -C ~ .cryozen",
      "sudo systemctl start cryozen-ui",
      "```",
      "",
      "Know which of these two archives `restore` will take, because they are not interchangeable.",
      "`verify` and `restore` require every entry to sit under a top-level `data/` directory, so they accept a snapshot and the Compose archive above, whose members are rooted at `data/`.",
      "They also refuse an archive that holds `data/backups/`, which is why the Compose command excludes it.",
      "They refuse the native archive, whose members are rooted at `.cryozen/`, with `refusing tarball with entry outside data/`.",
      "That archive is still a complete copy of your data; it is a raw copy for manual recovery, so restore it by stopping the service and unpacking it over the resolved directory yourself.",
      "Delete `smriti.db-wal` and `smriti.db-shm` first, because they belong to the database you are replacing:",
      "",
      "```bash",
      "sudo systemctl stop cryozen-ui",
      "rm -f ~/.cryozen/smriti.db-wal ~/.cryozen/smriti.db-shm",
      "tar -xzf ~/cryozen-backup-20260731.tar.gz -C ~",
      "sudo systemctl start cryozen-ui",
      "```",
    ].join("\n"),
    replacement: [
      "For a stopped instance on the Compose path, copy the directory with a tool that preserves dotfiles:",
      "",
      "```bash",
      "docker compose stop cryozen",
      "tar -czf ~/cryozen-backup-$(date +%Y%m%d).tar.gz --exclude=data/backups -C . data",
      "docker compose start cryozen",
      "```",
      "",
      "`verify` and `restore` require every entry to sit under a top-level `data/` directory, so they accept a snapshot and the Compose archive above, whose members are rooted at `data/`.",
      "They also refuse an archive that holds `data/backups/`, which is why the Compose command excludes it.",
      "For a desktop package, quit CryoZen and copy its data directory, listed above, with a tool that preserves dotfiles.",
      "Backing up and restoring a native launcher or systemd install by hand requires a source checkout, which is not public.",
    ].join("\n"),
  },
  {
    // Host-side cli/cryozen-sanrakshana requires a source checkout; Docker Compose runs it in the container.
    id: "upgrading-backup-host-cli",
    files: ["docs/operations/upgrading.md"],
    reason: "Remove bare host-side cli/cryozen-sanrakshana block in favor of the container run command.",
    pattern: [
      "Prefer `cli/cryozen-sanrakshana snapshot`.",
      "It archives the resolved data directory, and it dumps every SQLite database through the backup API into a temporary file before adding it to the archive, so a running application cannot write a torn page into your backup.",
      "It writes to `backups/cryozen-sanrakshana-<timestamp>.tar.gz` inside the data directory unless you pass `--out` or set `CRYOZEN_BACKUP_DIR`, and it excludes large or re-derivable subtrees by default, as listed in the [CLI reference](../reference/cli.md#backups-sanrakshana).",
      "Every archive carries a `manifest.json` naming the directory it came from, so you can check an archive before you need it.",
      "",
      "```bash",
      "cli/cryozen-sanrakshana snapshot",
      "cli/cryozen-sanrakshana verify ~/.cryozen/backups/your-snapshot.tar.gz",
      "```",
    ].join("\n"),
    replacement: [
      "Prefer `cryozen-sanrakshana snapshot` run inside the container.",
      "It archives the resolved data directory, and it dumps every SQLite database through the backup API into a temporary file before adding it to the archive, so a running application cannot write a torn page into your backup.",
      "It writes to `backups/cryozen-sanrakshana-<timestamp>.tar.gz` inside the data directory unless you pass `--out` or set `CRYOZEN_BACKUP_DIR`, and it excludes large or re-derivable subtrees by default, as listed in the [CLI reference](../reference/cli.md#backups-sanrakshana).",
      "Every archive carries a `manifest.json` naming the directory it came from, so you can check an archive before you need it (running `cli/cryozen-sanrakshana` directly on the host applies to source checkouts, which are not public).",
    ].join("\n"),
  },
  {
    // Public Docker Compose upgrades pull the GHCR image rather than pulling source and running --build.
    id: "upgrading-docker-compose-public",
    files: ["docs/operations/upgrading.md"],
    reason: "Rewrite Docker Compose upgrade from git pull + --build to docker compose pull + up -d.",
    pattern: [
      "## Upgrade a Docker Compose deployment",
      "",
      "Pull the new code, rebuild the image, and recreate the containers.",
      "The bind-mounted `./data` and `./logs` directories are untouched by a rebuild.",
      "",
      "```bash",
      "cd cryozen",
      "git pull --ff-only",
      "docker compose up -d --build",
      "docker image prune -f",
      "```",
      "",
      "On Windows, `update_windows.bat` runs the same sequence and checks that `git`, `docker`, and Compose v2 are present before it starts.",
    ].join("\n"),
    replacement: [
      "## Upgrade a Docker Compose deployment",
      "",
      "Pull the latest published `ghcr.io/cryozenai/cryozen` image and recreate the containers.",
      "The bind-mounted `./data` and `./logs` directories are untouched when containers are recreated.",
      "",
      "```bash",
      "cd cryozen-releases",
      "docker compose pull",
      "docker compose up -d",
      "docker image prune -f",
      "```",
      "",
      "Source builds and `update_windows.bat` require a source checkout, which is not public; public container installs pull from [/download#docker](/download#docker).",
    ].join("\n"),
  },
  {
    // Native launcher and systemd upgrades rely on git pull in the private source checkout.
    id: "upgrading-native-and-systemd-source-only",
    files: ["docs/operations/upgrading.md"],
    reason: "Replace source-only native launcher and systemd upgrade sections with source-checkout notes and download links.",
    pattern: [
      "## Upgrade a native launcher deployment",
      "",
      "Pull the new code and re-run the launcher.",
      "Each launcher hashes `requirements.txt` and reinstalls dependencies only when that hash changes, so an upgrade that does not touch dependencies starts as fast as a restart.",
      "",
      "```bash",
      "cd cryozen",
      "git pull --ff-only",
      "./start.sh",
      "```",
      "",
      "If the launcher reports that the port is in use, the previous process is still running.",
      "Stop it first: the launcher refuses to start rather than binding a second listener to the same database.",
      "",
      "## Upgrade a systemd deployment",
      "",
      "Stop the service, pull, reinstall dependencies, then start it again.",
      "The unit file runs `venv/bin/uvicorn` directly, so nothing updates the virtual environment on your behalf.",
      "",
      "```bash",
      "sudo systemctl stop cryozen-ui",
      "cd ~/cryozen-ui",
      "git pull --ff-only",
      "./venv/bin/pip install -r requirements.txt",
      "sudo systemctl start cryozen-ui",
      "journalctl -u cryozen-ui -f",
      "```",
      "",
      "If the upgrade changed `cryozen-ui.service`, copy the new unit into place and reload systemd before starting:",
      "",
      "```bash",
      "sudo cp cryozen-ui.service /etc/systemd/system/",
      "sudo systemctl daemon-reload",
      "```",
      "",
      "Remember that the shipped unit contains `YOURUSER` placeholders, so re-apply your own `User`, `WorkingDirectory`, `ExecStart`, and `EnvironmentFile` values whenever you replace it.",
    ].join("\n"),
    replacement: [
      "## Upgrade a native launcher deployment",
      "",
      "Desktop packages from [the download page](/download) upgrade by installing the new package; source-based native launcher upgrades (`git pull` and `./start.sh`) require a source checkout, which is not public, and container deployments pull the published image from [/download#docker](/download#docker).",
      "",
      "## Upgrade a systemd deployment",
      "",
      "Source-based `systemd` deployments require a source checkout, which is not public; for public container deployments, pull the published image from [/download#docker](/download#docker).",
    ].join("\n"),
  },
  {
    // Public Docker Compose rollbacks pin the previous GHCR image tag rather than git checkout + --build.
    id: "upgrading-rollback-docker-public",
    files: ["docs/operations/upgrading.md"],
    reason: "Rewrite Docker rollback from git checkout + --build to pinning the previous GHCR image tag.",
    pattern: [
      "Rolling back is safe when you restore the backup you took before the upgrade:",
      "",
      "```bash",
      "docker compose down",
      "rm -rf data",
      "tar -xzf ~/cryozen-backup-20260731.tar.gz",
      "git checkout your_previous_tag_here",
      "docker compose up -d --build",
      "```",
    ].join("\n"),
    replacement: [
      "Rolling back is safe when you restore the backup you took before the upgrade and pin the previous image tag in `docker-compose.yml` (for example `ghcr.io/cryozenai/cryozen:your_previous_tag_here`):",
      "",
      "```bash",
      "docker compose down",
      "rm -rf data",
      "tar -xzf ~/cryozen-backup-20260731.tar.gz",
      "docker compose pull",
      "docker compose up -d",
      "```",
    ].join("\n"),
  },
  {
    // cli/cryozen-logs exists inside /app in the published image; run it via docker compose exec.
    id: "troubleshooting-logs-cli-exec",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Use docker compose exec for cli/cryozen-logs since bare host-side cli/ requires a source checkout.",
    pattern: [
      "The `logs/` directory in the repository is bind-mounted into the container and holds application-level logs.",
      "Local model downloads and serves run under `tmux` and write per-session logs to `/tmp/cryozen-tmux/`.",
      "The `cli/cryozen-logs` command enumerates both, so `cli/cryozen-logs list` saves you remembering which directory holds what.",
    ].join("\n"),
    replacement: [
      "The `./logs` directory in the Compose directory is bind-mounted into the container and holds application-level logs.",
      "Local model downloads and serves run under `tmux` inside the container and write per-session logs to `/tmp/cryozen-tmux/`.",
      "Inside Docker, `docker compose exec cryozen python cli/cryozen-logs list` enumerates both so you do not have to remember which directory holds what.",
    ].join("\n"),
  },
  {
    // Dockerfile runs `COPY . .` at WORKDIR /app, so `docker compose exec cryozen python cli/seed_admin.py`
    // works against the published image; drop the bare host-side `python cli/seed_admin.py` block.
    id: "troubleshooting-seed-admin-drop-host",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Drop bare host-side python cli/seed_admin.py block and keep the verified docker compose exec form.",
    pattern: [
      "If you have lost the administrator password rather than the session, reset it from the command line.",
      "This is the supported path on a host with no mail server:",
      "",
      "```bash",
      "python cli/seed_admin.py --email admin@local.test --password your_new_password_here --force",
      "```",
      "",
      "Inside Docker, run it against the same bind-mounted data directory the application reads, then restart so the account file is re-read:",
      "",
      "```bash",
      "docker compose exec cryozen python cli/seed_admin.py \\",
      "  --email admin@local.test --password your_new_password_here --force",
      "docker compose restart cryozen",
      "```",
      "",
      "Note that `cli/reset_admin.py` writes to `data/` relative to the repository, which is correct under Docker and wrong on a native install where the data directory resolves to `~/.cryozen`.",
      "Prefer `cli/seed_admin.py`, which resolves the data directory the same way the application does.",
    ].join("\n"),
    replacement: [
      "If you have lost the administrator password rather than the session, reset it inside the container against the same bind-mounted data directory the application reads, then restart so the account file is re-read:",
      "",
      "```bash",
      "docker compose exec cryozen python cli/seed_admin.py \\",
      "  --email admin@local.test --password your_new_password_here --force",
      "docker compose restart cryozen",
      "```",
      "",
      "Prefer `cli/seed_admin.py` over `cli/reset_admin.py`, because `seed_admin.py` resolves `CRYOZEN_DATA_DIR` the same way the application does (bare host-side `cli/` invocations require a source checkout, which is not public).",
    ].join("\n"),
  },
  {
    // Drop bare host-side cli/cryozen-sanrakshana block and keep the container run block.
    id: "troubleshooting-backup-cli-drop-host",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Drop bare host-side cli/cryozen-sanrakshana block and keep the docker compose run form.",
    pattern: [
      "Check what a snapshot holds before you rely on it, rather than after you need it:",
      "",
      "```bash",
      "cli/cryozen-sanrakshana snapshot",
      "cli/cryozen-sanrakshana verify ~/.cryozen/backups/your-snapshot.tar.gz",
      "```",
      "",
      "On the Compose path that is:",
      "",
      "```bash",
      "docker compose run --rm --no-deps cryozen python cli/cryozen-sanrakshana snapshot",
      "docker compose run --rm --no-deps cryozen python cli/cryozen-sanrakshana verify /app/data/backups/your-snapshot.tar.gz",
      "```",
    ].join("\n"),
    replacement: [
      "Check what a snapshot holds before you rely on it, rather than after you need it (run inside the container on the Compose path):",
      "",
      "```bash",
      "docker compose run --rm --no-deps cryozen python cli/cryozen-sanrakshana snapshot",
      "docker compose run --rm --no-deps cryozen python cli/cryozen-sanrakshana verify /app/data/backups/your-snapshot.tar.gz",
      "```",
    ].join("\n"),
  },
  {
    // Use container run command for cli/cryozen-sanrakshana list.
    id: "troubleshooting-readiness-backup-list-exec",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Show docker compose run form for cli/cryozen-sanrakshana list.",
    pattern: "It reports no paths, because the route needs no login; `cli/cryozen-sanrakshana list` shows them.",
    replacement:
      "It reports no paths, because the route needs no login; `docker compose run --rm --no-deps cryozen python cli/cryozen-sanrakshana list` shows them.",
  },
  {
    // Public visitors do not have $PWD/cli/cryozen or $PWD/cli/_completion/ on the host;
    // the published Docker image ships /app/cli/ so commands run via docker compose exec/run.
    id: "cli-installing-public-docker",
    files: ["docs/reference/cli.md"],
    reason: "Rewrite host-side source symlink/completion instructions to docker compose exec against the published image.",
    pattern: [
      "## Installing the CLI",
      "",
      "Put the dispatcher on your `PATH` with a symlink from the repo:",
      "",
      "```bash",
      "mkdir -p ~/.local/bin",
      "ln -s \"$PWD/cli/cryozen\" ~/.local/bin/cryozen",
      "```",
      "",
      "Confirm `~/.local/bin` is on your `PATH`, then check the install:",
      "",
      "```bash",
      "cryozen --version",
      "```",
      "",
      "The dispatcher resolves subcommands relative to the real location of `cli/cryozen`, so the symlink works from any directory.",
      "It also prefers `venv/bin/python` at the repo root when that virtual environment exists, and falls back to the interpreter running the dispatcher otherwise.",
      "",
      "To enable bash completion, source the completion script from your shell startup file:",
      "",
      "```bash",
      "echo \"source $PWD/cli/_completion/cryozen.bash\" >> ~/.bashrc",
      "```",
      "",
      "For a system-wide bash install, symlink rather than copy:",
      "",
      "```bash",
      "sudo ln -s \"$PWD/cli/_completion/cryozen.bash\" /etc/bash_completion.d/cryozen",
      "```",
      "",
      "The script locates the `cli/` directory by resolving its own path through any symlinks, so a copied file placed outside the repo finds no subcommands to complete.",
      "",
      "To enable zsh completion, add the completion directory to `fpath` before calling `compinit`:",
      "",
      "```zsh",
      "fpath=(\"$PWD/cli/_completion\" $fpath)",
      "autoload -U compinit; compinit",
      "```",
      "",
      "Two things are worth knowing about completions:",
      "",
      "- **First tab is slow**: both scripts build their cache by running every `cryozen-*` script with `--help`, and that imports application modules.",
      "  Refresh the bash cache by hand with `_cryozen_refresh_cache`.",
      "- **Completion follows `cli/`**: both scripts read `cli/cryozen-*` when they build their cache, so a new subcommand completes through the `cryozen` umbrella as soon as it exists.",
      "  Bash also registers every executable it finds for direct completion; zsh completes a `cryozen-<name>` typed on its own only when that name is on the `#compdef` line of `cli/_completion/cryozen.zsh`, so adding a sub-CLI means adding its name there too.",
    ].join("\n"),
    replacement: [
      "## Installing the CLI",
      "",
      "On a public Docker Compose deployment (from [/download#docker](/download#docker)), the `cli/` tools are packaged at `/app/cli/` inside the `cryozen` container image, so run them inside the container from your Compose directory:",
      "",
      "```bash",
      "docker compose exec cryozen python cli/cryozen --version",
      "docker compose exec cryozen python cli/cryozen help",
      "```",
      "",
      "Define a shell alias in your Compose directory so the subcommand examples below work directly:",
      "",
      "```bash",
      "alias cryozen='docker compose exec -T cryozen python cli/cryozen'",
      "```",
      "",
      "When the `cryozen` container is stopped (such as during a backup restore), use `docker compose run --rm --no-deps -T cryozen python cli/cryozen ...` instead.",
      "Host-side installation from `$PWD/cli/cryozen` and shell completion scripts apply to source checkouts, which are not public.",
    ].join("\n"),
  },
  {
    // Clarify that direct repo-root venv execution applies to source checkouts, which are not public.
    id: "cli-how-commands-find-data-public",
    files: ["docs/reference/cli.md"],
    reason: "Clarify container execution vs source-checkout execution in data resolution section.",
    pattern:
      "Because the imports are real application imports, run these commands from the repo root with the project virtual environment active.",
    replacement:
      "Because the imports are real application imports, run these commands inside the container on a Docker Compose install (where `/app` is the working directory and `CRYOZEN_DATA_DIR=/app/data`), or from the repo root with the project virtual environment active on a source checkout, which is not public.",
  },
  {
    // Drop host-side ~/.cryozen/backups/ examples in cli.md so Compose users only see container /app/data/backups/ commands.
    id: "cli-sanrakshana-host-blocks",
    files: ["docs/reference/cli.md"],
    reason: "Keep container docker compose run backup/restore commands and drop bare host-side ~/.cryozen blocks.",
    pattern: [
      "```bash",
      "cryozen sanrakshana snapshot",
      "cryozen sanrakshana snapshot --out /mnt/nas/cryozen-nightly.tar.gz --include-attachments",
      "cryozen sanrakshana list",
      "cryozen sanrakshana verify ~/.cryozen/backups/your_backup_name_here.tar.gz",
      "```",
      "",
      "On the Compose path the command must run inside the container, because the host shell does not carry the container's `CRYOZEN_DATA_DIR`.",
    ].join("\n"),
    replacement:
      "On the Compose path the command must run inside the container, because the host shell does not carry the container's `CRYOZEN_DATA_DIR`.",
  },
  {
    // Drop host-side sanrakshana restore example pointing at ~/.cryozen/backups/.
    id: "cli-sanrakshana-restore-host-block",
    files: ["docs/reference/cli.md"],
    reason: "Drop bare host-side restore block in favor of the container run command below it.",
    pattern: [
      "```bash",
      "cryozen sanrakshana restore ~/.cryozen/backups/your_backup_name_here.tar.gz --yes",
      "```",
      "",
      "On the Compose path, stop the application and run it in a one-off container:",
    ].join("\n"),
    replacement: "On the Compose path, stop the application and run it in a one-off container:",
  },
  {
    // Operations scripts live inside /app/cli/ in the container; build/CI scripts require a source checkout.
    id: "cli-operations-scripts-container-context",
    files: ["docs/reference/cli.md"],
    reason: "Explain that operations scripts run via docker compose exec inside the container and build scripts need a source checkout.",
    pattern: [
      "## Operations scripts",
      "",
      "These are one-shot scripts rather than dispatcher subcommands, so run them by path from the repo root.",
      "They are not reachable through `cryozen <name>`.",
    ].join("\n"),
    replacement: [
      "## Operations scripts",
      "",
      "These are one-shot scripts rather than dispatcher subcommands, and they are not reachable through `cryozen <name>`.",
      "On a Docker Compose install, run database and data-maintenance scripts inside the container with `docker compose exec cryozen python cli/<script>.py ...`; build, packaging, development, and host diagnostic scripts (`cli/pipeline.sh`, `cli/validate_mac_app.sh`, `cli/fix_paths.py`, `cli/pr_blocker_audit.py`, `cli/encode_previews.sh`, `cli/check-docker-gpu.sh`, `cli/check-docker-amd-gpu.sh`, and `cli/demo_email/*`) require a source checkout, which is not public.",
    ].join("\n"),
  },
  {
    // Product control plane scripts (scripts/cryozen_ops.py, scripts/cryozen_release_verify.py) only make sense in a private source checkout.
    id: "cli-product-control-plane-source-only",
    files: ["docs/reference/cli.md"],
    reason: "Replace private-repo Product control plane scripts section with source-checkout notes and /download#docker link.",
    pattern: [
      "### Product control plane",
      "",
      "`scripts/cryozen_ops.py` manages the lifecycle records under `.cryozen/`: it mints identifiers, creates record pairs, applies audited state transitions, validates every record against `.cryozen/config/schemas/`, reconciles the records with the tasks-axi backlog, and writes reports.",
      "",
      "```sh",
      "python scripts/cryozen_ops.py mint TASK",
      "python scripts/cryozen_ops.py collisions",
      "python scripts/cryozen_ops.py new TASK --title \"Add a thing\" --slug add-a-thing --set repository=cryozen --set priority=P2 --set 'acceptance_criteria=[\"it works\"]'",
      "python scripts/cryozen_ops.py transition TASK-2026-0001 --to IN_PROGRESS --actor claude --reason \"dispatched\" --evidence \"worktree 4\"",
      "python scripts/cryozen_ops.py transition PR-2026-0001 --to MERGED --actor git-operations --reason \"merged\" --at 2026-08-24T00:55:20Z",
      "python scripts/cryozen_ops.py validate",
      "python scripts/cryozen_ops.py reconcile",
      "python scripts/cryozen_ops.py drift",
      "python scripts/cryozen_ops.py report daily",
      "python scripts/cryozen_ops.py report sprint SPRINT-2026-001",
      "python scripts/cryozen_ops.py report rc RC-2026-001",
      "python scripts/cryozen_ops.py report release REL-2026-001",
      "```",
      "",
      "`mint` returns a number above every id in the working tree and on every local and remote-tracking ref and tag, so run `git fetch` first; `collisions` exits non-zero when an id has two different titles across refs.",
      "`new` refuses a record that leaves out a field its schema requires, so a record cannot be created in a shape `validate` would reject; pass each one with `--set`.",
      "`validate` and `reconcile` exit non-zero when they find a problem, so they can gate a pull request.",
      "`--at` records the time an event actually happened, so a state change entered after the fact keeps its real timestamp rather than the time it was typed; the record's `updated_at` stays the time the file was written, so it never precedes `created_at`.",
      "Moving a record back to a state earlier in its lifecycle than the one that stamped a completion time clears that timestamp, so a reopened item carries no completion time; an archival move forward, such as `MERGED` to `CLOSED` or `RELEASED` to `SUPERSEDED`, keeps it.",
      "`report sprint` counts finished and carried items from the sprint's member records rather than reporting points it has no estimate for.",
      "`report rc` scores the statements in `.cryozen/config/release-policy.yaml` from what the candidate record proves; a statement nothing has recorded counts as unproven, and a candidate is eligible only when every statement passes and every child record is finished.",
      "`report release` renders a release and the candidate it came from, printing `not recorded` for anything that was never filled in.",
      "`reconcile` compares the records with the tasks-axi backlog; `drift` compares them with each other and reports a parent finished ahead of its children, a merged pull request over unfinished work, work claiming a pull request nothing names, unfinished work left on a closed sprint, and a released candidate and release that do not name each other.",
      "The daily and sprint reports carry both under their own headings.",
      "",
      "The whole control plane is reachable through the dispatcher as `cryozen product`, which forwards the lifecycle verbs to the operations script and `verify` to the release verifier.",
      "",
      "```sh",
      "cryozen product status",
      "cryozen product check",
      "cryozen product report daily",
      "cryozen product verify v1.4.0",
      "```",
      "",
      "`cryozen product check` runs validate, reconcile, and drift in one pass and exits with the worst result, so it can gate a pull request without touching the network.",
      "For a verb another installed tool owns, it names that tool rather than reimplementing it.",
      "The operational task queue stays in tasks-axi, which reads `.cryozen/backlog/backlog.md` through `.tasks.toml` and prunes finished items into `.cryozen/backlog/done-archive.md`; `reconcile` reads the same two paths out of `.tasks.toml`.",
      "",
      "`scripts/cryozen_release_verify.py` reads a published tag back from every place it has to appear.",
      "",
      "```sh",
      "python scripts/cryozen_release_verify.py v1.4.0",
      "python scripts/cryozen_release_verify.py v1.4.0 --json",
      "python scripts/cryozen_release_verify.py v1.4.0-rc.1 --skip website",
      "```",
      "",
      "A pre-release needs `--skip website` and a tag up to v1.1.0 needs `--skip docker`; [RELEASING.md](../../RELEASING.md#before-the-next-release-the-move-to-cryozenai) says why.",
      "",
      "It checks the tag on the product repository, a release on the product repository and on the public releases channel carrying exactly the asset contract in `scripts/release_contract.py`, a `SHA256SUMS.txt` covering every asset, an anonymous download of every public asset URL, the GHCR image tag, and the asset links on the cryozen.ai download page.",
      "Each check prints pass or fail with the evidence it read, and the command exits non-zero when any check fails, so a release record cannot claim distribution that was never verified.",
      "The same contract module is what `tests/test_release_packaging_artifact_names.py` pins the build scripts and the release workflow to, so the names exist in one place.",
    ].join("\n"),
    replacement: [
      "### Product control plane",
      "",
      "Internal lifecycle and release-verification scripts under `scripts/` (`scripts/cryozen_ops.py` and `scripts/cryozen_release_verify.py`) apply only to source builds, which are not public; for public container deployments, pull the published image from [/download#docker](/download#docker).",
    ].join("\n"),
  },
  {
    // The index map points at the deployment guide, whose only public path is Docker Compose.
    id: "readme-start-here-deployment-public",
    files: ["docs/README.md"],
    reason: "Describe the deployment guide by its public Docker Compose path instead of source-only launchers and systemd.",
    pattern:
      "- [Deployment guide](operations/deployment.md): choose between Docker Compose, the native launchers, and systemd, and put an instance behind a reverse proxy.",
    replacement:
      "- [Deployment guide](operations/deployment.md): deploy the published image with Docker Compose, and put an instance behind a reverse proxy.",
  },
  {
    // Only the Compose path is public; desktop packages cover the workstation case.
    id: "deployment-intro-public-path",
    files: ["docs/operations/deployment.md"],
    reason: "Introduce the page by its public Docker Compose path instead of three paths, two of which need a source checkout.",
    pattern: [
      "This page covers running CryoZen on a machine you intend to keep running: which of the three deployment paths to pick, the exact commands each one takes, and what to configure before the instance is reachable by anything other than your own browser.",
      "It is written for whoever operates the box.",
      "Every path binds to `127.0.0.1` by default,",
    ].join("\n"),
    replacement: [
      "This page covers running CryoZen on a machine you intend to keep running: the public Docker Compose path, the exact commands it takes, and what to configure before the instance is reachable by anything other than your own browser.",
      "It is written for whoever operates the box.",
      "The Compose stack binds to `127.0.0.1` by default,",
    ].join("\n"),
  },
  {
    // The path table recommends the native launcher and systemd, which only exist in the source checkout.
    id: "deployment-choosing-path-public",
    files: ["docs/operations/deployment.md"],
    reason: "Replace the three-path table with the public Compose path, the desktop packages, and a source-checkout note.",
    pattern: [
      "Three paths ship in the repository, and they differ in what they bring with them rather than in what the application can do:",
      "",
      "| Path | What it is for | Bundled services | Default URL |",
      "| --- | --- | --- | --- |",
      "| Docker Compose | A server that should come back up on its own, with search and the vector store included. | CryoZen, ChromaDB, SearXNG, ntfy | `http://127.0.0.1:7000` |",
      "| Native launcher | A workstation, and any machine whose GPU must be visible to the model server. | CryoZen only | `http://127.0.0.1:7000` on Linux and Windows, `http://127.0.0.1:7860` on macOS |",
      "| systemd service | A Linux host where CryoZen should start at boot without Docker. | CryoZen only | `http://127.0.0.1:7000` |",
      "",
      "Pick Docker Compose unless something rules it out.",
      "Pick a native launcher on macOS, because Docker Desktop runs a Linux virtual machine with no access to the Metal GPU, and the built-in model server needs that GPU to serve local models.",
      "Pick systemd when you want the native runtime and a supervised process, and you are willing to run ChromaDB yourself or do without the vector store.",
    ].join("\n"),
    replacement: [
      "Docker Compose is the public deployment path for a server that should come back up on its own: it pulls the published `ghcr.io/cryozenai/cryozen` image, runs CryoZen with ChromaDB, SearXNG, and ntfy, and serves `http://127.0.0.1:7000`.",
      "On macOS, Docker Desktop runs a Linux virtual machine with no access to the Metal GPU, so the built-in model server cannot serve local models from the Compose stack there.",
      "For a single workstation, download a desktop package on [the download page](/download); it bundles Python and its dependencies but not ChromaDB or SearXNG.",
      "The native launcher and systemd paths require a source checkout, which is not public.",
    ].join("\n"),
  },
  {
    // Hardening advice for the launcher and systemd unit only applies to a source checkout.
    id: "deployment-harden-bind-compose-only",
    files: ["docs/operations/deployment.md"],
    reason: "Keep the bind-address hardening advice to the public Compose path.",
    pattern: [
      "Every launcher, the Compose port mapping, and the systemd unit bind to `127.0.0.1`, and that is the correct default.",
      "To reach the instance from another device, do not change the bind address.",
      "Put a reverse proxy or a private network in front of it and leave the application on loopback.",
      "",
      "If you accept the risk and want the application itself on a LAN interface, set `APP_BIND=0.0.0.0` in `.env` for the Compose and launcher paths, or `--host 0.0.0.0` in the systemd unit.",
    ].join("\n"),
    replacement: [
      "The Compose port mapping binds to `127.0.0.1`, and that is the correct default.",
      "To reach the instance from another device, do not change the bind address.",
      "Put a reverse proxy or a private network in front of it and leave the application on loopback.",
      "",
      "If you accept the risk and want the application itself on a LAN interface, set `APP_BIND=0.0.0.0` in `.env`.",
    ].join("\n"),
  },
  {
    // Launcher terminals and the cryozen-ui systemd unit only exist on a source checkout.
    id: "troubleshooting-logs-native-systemd-source-only",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Replace native launcher and systemd log locations with a source-checkout note.",
    pattern: [
      "- **Native launcher**: the terminal running `start.sh`, `start-linux.sh`, `start-macos.sh`, or `launch-windows.ps1`. Nothing is written to disk, so keep the window open while you reproduce a problem.",
      "- **systemd**: `journalctl -u cryozen-ui -f`.",
    ].join("\n"),
    replacement:
      "- **Native launcher and systemd**: both paths require a source checkout, which is not public.",
  },
  {
    // The port probe and CRYOZEN_PORT override belong to the source-checkout launcher scripts.
    id: "troubleshooting-port-in-use-source-only",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Replace the source-only launcher port-conflict section with a source-checkout note.",
    pattern: [
      "Something is already listening on the port the launcher wants, most often a previous run you did not stop.",
      "The launchers probe the port before doing any work and refuse to start, rather than letting a second process attach to the same database.",
      "",
      "Find the listener and decide whether to stop it:",
      "",
      "```bash",
      "lsof -nP -iTCP:7000 -sTCP:LISTEN",
      "```",
      "",
      "On macOS, port 7000 is usually held by the AirPlay Receiver, which is why `start-macos.sh` defaults to 7860 instead.",
      "Turn AirPlay Receiver off in System Settings, or leave it alone and use the default.",
      "",
      "Run on a different port without editing anything:",
      "",
      "```bash",
      "CRYOZEN_PORT=7900 ./start-macos.sh",
      "```",
      "",
      "To make the change permanent, set `APP_PORT` in `.env`, which every launcher and the Compose file read.",
    ].join("\n"),
    replacement:
      "The launcher scripts that print this message require a source checkout, which is not public.",
  },
  {
    // A user-managed virtual environment only exists on a source checkout.
    id: "troubleshooting-chromadb-client-source-only",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Replace the virtual-environment pip install for chromadb-client with a source-checkout note.",
    pattern:
      "If the message is `ChromaDB integration is not installed`, the Python package is missing from the environment, and `pip install chromadb-client` inside your virtual environment resolves it.",
    replacement:
      "If the message is `ChromaDB integration is not installed`, the Python package is missing from the environment, and installing it requires a source checkout, which is not public.",
  },
  {
    // requirements-optional.txt and a user-managed virtual environment only exist on a source checkout.
    id: "troubleshooting-optional-deps-source-only",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Replace the virtual-environment pip install of requirements-optional.txt with a source-checkout note.",
    pattern: [
      "The optional dependency set lives in `requirements-optional.txt`, and each entry records the feature it unlocks.",
      "Install the whole set inside your virtual environment with `pip install -r requirements-optional.txt`, and note that it includes PyMuPDF, which is licensed under the AGPL and carries obligations for a network-served application.",
    ].join("\n"),
    replacement:
      "Installing the optional dependency set from `requirements-optional.txt` requires a source checkout, which is not public.",
  },
  {
    // Support issues land in the public release channel (lib/site.ts issuesUrl).
    id: "troubleshooting-issue-public-channel",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Point the support-issue sentence at the public release channel issues instead of the private repository.",
    pattern: "Then open an issue at [the repository](https://github.com/cryozenai/cryozen).",
    replacement:
      "Then open an issue at [the public release channel](https://github.com/cryozenai/cryozen-releases/issues).",
  },
  {
    // Desktop packages run as the signed-in user; native and systemd installs need a source checkout.
    // packaging/launcher.py serves on 7860 (lib/release-facts.json install.desktop_port) unless that port is taken.
    id: "troubleshooting-permissions-desktop",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Describe the non-container permission failure and its readiness check for desktop packages instead of native and systemd installs.",
    pattern: [
      "On a native or systemd install there is no such translation, so the failure means the account running uvicorn cannot write the resolved data directory.",
      "Ask the application which directory it resolved and whether it can write there:",
      "",
      "```bash",
      "curl -fsS http://127.0.0.1:7000/api/ready",
      "```",
    ].join("\n"),
    replacement: [
      "In a desktop package there is no such translation, so the failure means your own account cannot write the resolved data directory.",
      "Ask the application which directory it resolved and whether it can write there, at the address the package opened in your browser, which is port 7860 unless that port was taken:",
      "",
      "```bash",
      "curl -fsS http://127.0.0.1:7860/api/ready",
      "```",
    ].join("\n"),
  },
  {
    // Desktop packages bundle neither SearXNG nor ChromaDB; only the Docker stack runs them.
    id: "troubleshooting-searxng-desktop",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Desktop packages do not bundle SearXNG (lib/platforms.ts), so the native-install note applies to them.",
    pattern: "On a native install nothing starts SearXNG for you.",
    replacement: "In a desktop package nothing starts SearXNG for you.",
  },
  {
    // Desktop packages bundle neither SearXNG nor ChromaDB; only the Docker stack runs them.
    id: "troubleshooting-chromadb-desktop",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Desktop packages do not bundle ChromaDB (lib/platforms.ts), so the native-install note applies to them.",
    pattern: "On a native install, start a ChromaDB instance and leave the defaults alone:",
    replacement: "For a desktop package, start a ChromaDB instance and leave the defaults alone:",
  },
  {
    // Desktop packages bundle Python and its dependencies, not Node.js.
    id: "troubleshooting-npx-desktop",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Name the desktop package as the public install that may lack Node.js.",
    pattern: "which the Docker image includes and a native install may not.",
    replacement: "which the Docker image includes and a desktop package may not.",
  },
  {
    // The ~/.cryozen fallback is only reached on a source checkout; Compose and the desktop launcher set CRYOZEN_DATA_DIR.
    id: "troubleshooting-snapshot-resolution-public",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Describe snapshot resolution for the public installs, which always set CRYOZEN_DATA_DIR.",
    pattern: [
      ": `CRYOZEN_DATA_DIR` when set, otherwise the vault config file, otherwise `~/.cryozen`.",
      "The command reads the checkout's `.env` as the application does,",
    ].join("\n"),
    replacement: [
      ": `CRYOZEN_DATA_DIR`, which Docker Compose sets to `/app/data` and desktop packages set to their per-user data directory.",
      "The command reads `.env` the same way the application does,",
    ].join("\n"),
  },
  {
    // The checkout's data/ only exists on a source checkout.
    id: "troubleshooting-premanifest-archive",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Drop the source-checkout condition from the pre-manifest archive warning.",
    pattern: ", and on a native install they hold the checkout's `data/` rather than your data;",
    replacement: " and may not hold your data;",
  },
  {
    // The ~/.cryozen fallback is only reached on a source checkout.
    id: "upgrading-host-shell-resolution",
    files: ["docs/operations/upgrading.md"],
    reason: "Explain why the snapshot runs in the container without presenting ~/.cryozen as a public location.",
    pattern: "because the host shell does not carry the container's `CRYOZEN_DATA_DIR`, so from the host it resolves `~/.cryozen` rather than `./data`.",
    replacement: "because the host shell does not carry the container's `CRYOZEN_DATA_DIR` and would resolve a different directory.",
  },
  {
    // Keep the scheduling advice install-neutral.
    id: "cli-pollers-scheduler",
    files: ["docs/reference/cli.md"],
    reason: "Describe the poller schedule without a systemd-specific example.",
    pattern: "which suits a cron entry or a systemd timer:",
    replacement: "which suits a cron entry or another scheduler:",
  },
  {
    // The ~/.cryozen fallback is only reached on a source checkout; Compose and the desktop launcher set CRYOZEN_DATA_DIR.
    id: "cli-snapshot-resolution-public",
    files: ["docs/reference/cli.md"],
    reason: "Describe snapshot resolution for the public installs, which always set CRYOZEN_DATA_DIR.",
    pattern: "(`CRYOZEN_DATA_DIR`, the vault config file, or `~/.cryozen`), using SQLite's online backup API",
    replacement: "(`CRYOZEN_DATA_DIR`, which Docker Compose sets to `/app/data` and desktop packages set to their per-user data directory), using SQLite's online backup API",
  },
  {
    // Inside the container the command and the application read the same .env path.
    id: "cli-snapshot-dotenv",
    files: ["docs/reference/cli.md"],
    reason: "Drop the source-checkout wording from how the snapshot reads .env.",
    pattern: "The command reads the checkout's `.env` as the application does,",
    replacement: "The command reads `.env` the same way the application does,",
  },
  {
    // systemd units only exist on a source checkout; replaceAll covers both mentions on the page.
    id: "config-environment-sources",
    files: ["docs/reference/configuration.md"],
    reason: "List the environment sources for the public installs without a systemd unit.",
    pattern: "your shell, systemd unit, or container runtime",
    replacement: "your shell or container runtime",
  },
  {
    // The launch scripts named here only exist on a source checkout.
    id: "config-launcher-script-rows",
    files: ["docs/reference/configuration.md"],
    reason: "Drop source-checkout launcher script citations from the APP_BIND, CRYOZEN_HOST, and CRYOZEN_PORT rows.",
    pattern: "Host interface the launchers bind and the address side of the Compose port map (`start-linux.sh`, `start-macos.sh`, `docker-compose.yml`).",
    replacement: "Address side of the Compose port map (`docker-compose.yml`) and the host interface the source-checkout launch scripts bind.",
  },
  {
    // The launch scripts named here only exist on a source checkout.
    id: "config-cryozen-host-row",
    files: ["docs/reference/configuration.md"],
    reason: "Drop source-checkout launcher script citations from the CRYOZEN_HOST row.",
    pattern: "Launcher-only bind override with higher precedence than `APP_BIND` (`start-linux.sh`, `launch-windows.ps1:62`).",
    replacement: "Bind override for the source-checkout launch scripts, with higher precedence than `APP_BIND`.",
  },
  {
    // The launch scripts named here only exist on a source checkout; the packaged launcher clause that follows still holds.
    id: "config-cryozen-port-row",
    files: ["docs/reference/configuration.md"],
    reason: "Drop source-checkout launcher script citations from the CRYOZEN_PORT row.",
    pattern: "Launcher port override with higher precedence than `APP_PORT` (`start-linux.sh`, `launch-windows.ps1:58`).",
    replacement: "Launcher port override with higher precedence than `APP_PORT`.",
  },
  {
    // packaging/launcher.py reads CRYOZEN_PORT, not APP_PORT, and defaults to 7860 on every platform.
    id: "config-app-port-row",
    files: ["docs/reference/configuration.md"],
    reason: "Attribute the 7860 APP_PORT default to the source-checkout macOS script, not the desktop launcher.",
    pattern: "`7000`, and `7860` in the macOS launcher because AirPlay Receiver usually holds 7000 | Host port for the launchers and the Compose port map;",
    replacement: "`7000`, and `7860` in the source-checkout macOS launch script because AirPlay Receiver usually holds 7000 | Host port for the Compose port map and the source-checkout launch scripts; the desktop launcher reads `CRYOZEN_PORT` instead;",
  },
  {
    // Keep the scheduling advice install-neutral.
    id: "config-pollers-scheduler",
    files: ["docs/reference/configuration.md"],
    reason: "Describe the poller schedule without a systemd-specific example.",
    pattern: "when cron or a systemd timer drives",
    replacement: "when cron or another scheduler drives",
  },
  {
    // The image runs from /app, so the application directory's data/ is /app/data; replaceAll covers both rows.
    id: "config-checkout-data-dir",
    files: ["docs/reference/configuration.md"],
    reason: "Name the application directory's data/ instead of the checkout's, which also holds inside the image.",
    pattern: "the checkout's `data/`",
    replacement: "the application directory's `data/`",
  },
  {
    // systemd units only exist on a source checkout.
    id: "config-legacy-prefix-units",
    files: ["docs/reference/configuration.md"],
    reason: "Drop systemd units from the legacy-prefix rationale.",
    pattern: "The legacy prefix exists so that systemd units, compose files, and shell profiles written before the rename keep working without edits.",
    replacement: "The legacy prefix exists so that compose files and shell profiles written before the rename keep working without edits.",
  },
  {
    // docs/concepts/naming-map.md is not in DOC_ALLOWLIST, so readers cannot follow it.
    id: "upgrading-naming-map-unpublished",
    files: ["docs/operations/upgrading.md"],
    reason: "Drop references to the naming map, which is not published under /docs.",
    pattern: [
      "Some requested paths were left alone, and `docs/concepts/naming-map.md` lists them under \"What did not change\".",
      "`/api/niti` is now `/api/auth`, `/api/smarana` is now `/api/memory`, `/api/shodh` is now `/api/research`, and so on.",
      "[The naming map](../concepts/naming-map.md) lists every pair.",
    ].join("\n"),
    replacement: [
      "Some requested paths were left alone.",
      "`/api/niti` is now `/api/auth`, `/api/smarana` is now `/api/memory`, `/api/shodh` is now `/api/research`, and so on.",
    ].join("\n"),
  },
  {
    // docs/concepts/naming-map.md is not in DOC_ALLOWLIST; the upgrading guide covers the route rename.
    id: "glossary-naming-map-unpublished",
    files: ["docs/concepts/glossary.md"],
    reason: "Point the route-name pointer at the published upgrading section instead of the unpublished naming map.",
    pattern: "[The naming map](naming-map.md) records what the old route names became, and what you have to change in your own installation when you upgrade.",
    replacement: "[The upgrading guide](../operations/upgrading.md#route-names-moved-to-english) records what the old route names became, and what you have to change in your own installation when you upgrade.",
  },
  {
    // ARCHITECTURE.md is not published under /docs.
    id: "glossary-architecture-guide-unpublished",
    files: ["docs/concepts/glossary.md"],
    reason: "Drop the name-collision claim and its pointer to the architecture guide, which is not published under /docs.",
    pattern: [
      "",
      "",
      "Six words are reused for different components, which is the most common source of confusion when reading the tree.",
      "[The architecture guide](../../ARCHITECTURE.md) lists each collision and how to tell them apart.",
    ].join("\n"),
    replacement: "",
  },
  {
    // The image runs `uvicorn cryozen:app` (Dockerfile at v1.2.0), which reads FORWARDED_ALLOW_IPS (default 127.0.0.1); the published docker-compose.yml publishes a bridge port and does not pass the variable through, so a proxy connects from the network gateway and an override file sets it.
    id: "deployment-proxy-forwarded-allow-ips-compose",
    files: ["docs/operations/deployment.md"],
    reason: "Configure the trusted Compose gateway for the same-host reverse proxy through the override file instead of a uvicorn flag or the loopback default.",
    pattern: [
      "Run the proxy on the same host as CryoZen where you can.",
      "Uvicorn trusts forwarded headers from `127.0.0.1` by default, and it needs `X-Forwarded-Proto` to build the `https://` callback URLs that OAuth sign-in depends on.",
      "If the proxy runs on a different machine, start uvicorn with `--forwarded-allow-ips` naming that machine's address, or the application will build `http://` redirect URIs and every OAuth flow will fail.",
    ].join("\n"),
    replacement: [
      "Run the proxy on the same host as CryoZen and keep `APP_BIND=127.0.0.1`, so only processes on the host can reach the published port.",
      "The application needs `X-Forwarded-Proto` to build the `https://` callback URLs that OAuth sign-in depends on, and uvicorn trusts forwarded headers only from the addresses in `FORWARDED_ALLOW_IPS`, which defaults to `127.0.0.1`.",
      "Under Docker Compose the proxy's connection reaches the container from the Compose network's gateway, so set `FORWARDED_ALLOW_IPS` for the `cryozen` service to that gateway address whenever a reverse proxy terminates HTTPS, or the application will build `http://` redirect URIs and every OAuth flow will fail.",
      "The network is named after the Compose directory (`cryozen-releases` by default), and this prints its gateway:",
      "",
      "```bash",
      "docker network inspect cryozen-releases_default --format '{{(index .IPAM.Config 0).Gateway}}'",
      "```",
      "",
      "Put the address in `docker-compose.override.yml` as shown under [Deploy with Docker Compose](#deploy-with-docker-compose), because the published `docker-compose.yml` does not pass `FORWARDED_ALLOW_IPS` through from `.env`.",
      "A desktop package serves on the host itself, so a proxy on the same machine is trusted at the `127.0.0.1` default.",
    ].join("\n"),
  },
  {
    // The image runs `uvicorn cryozen:app` (Dockerfile at v1.2.0), which reads FORWARDED_ALLOW_IPS (default 127.0.0.1); the published docker-compose.yml publishes a bridge port and does not pass the variable through, so a proxy connects from the network gateway and an override file sets it.
    id: "troubleshooting-proxy-forwarded-allow-ips-compose",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Name the Compose override setting the same-host reverse proxy needs instead of a uvicorn flag or the loopback default.",
    pattern: "Uvicorn trusts those headers from `127.0.0.1` only, so a proxy on a different host needs `--forwarded-allow-ips` naming its address.",
    replacement: "Uvicorn trusts those headers only from the addresses in `FORWARDED_ALLOW_IPS`, which defaults to `127.0.0.1`, and under Docker Compose the proxy connects from the Compose network's gateway, so set `FORWARDED_ALLOW_IPS` to that gateway address in `docker-compose.override.yml` as [the deployment guide](deployment.md#put-cryozen-behind-a-reverse-proxy-with-https) shows.",
  },
  {
    // lib/release-compose.yml (the public cryozen-releases docker-compose.yml) forwards a fixed environment list with no env_file; SESSION_SECRET, OAUTH_REDIRECT_BASE_URL, FORWARDED_ALLOW_IPS, and OAuth client credentials are not on it.
    id: "deployment-compose-override-env",
    files: ["docs/operations/deployment.md"],
    reason: "Show one docker-compose.override.yml for the variables the published Compose file does not forward from .env.",
    pattern: "A variable you add to `.env` reaches the application only if that list names it, so social sign-in credentials and any other variable absent from the list also need an entry under the service's `environment:` key.",
    replacement: [
      "A variable you add to `.env` reaches the application only if that list names it or Compose itself reads it, as with `APP_BIND`, `APP_PORT`, `SECURE_COOKIES`, and `ALLOWED_ORIGINS`.",
      "Variables absent from the list, including `SESSION_SECRET`, `OAUTH_REDIRECT_BASE_URL`, `FORWARDED_ALLOW_IPS`, and the social sign-in client IDs and secrets, go in a `docker-compose.override.yml` next to `docker-compose.yml`.",
      "Keep only the lines you need, then run `docker compose up -d`:",
      "",
      "```yaml",
      "services:",
      "  cryozen:",
      "    environment:",
      "      - SESSION_SECRET=your_generated_secret_here",
      "      - OAUTH_REDIRECT_BASE_URL=https://your_domain_here",
      "      - FORWARDED_ALLOW_IPS=your_compose_gateway_address_here",
      "      - GOOGLE_CLIENT_ID=your_client_id_here",
      "      - GOOGLE_CLIENT_SECRET=your_client_secret_here",
      "```",
      "",
      "Compose reads the override automatically while `COMPOSE_FILE` is unset; if you set `COMPOSE_FILE`, add `docker-compose.override.yml` to that list too.",
    ].join("\n"),
  },
  {
    // lib/release-compose.yml (the public cryozen-releases docker-compose.yml) forwards a fixed environment list with no env_file; SESSION_SECRET, OAUTH_REDIRECT_BASE_URL, FORWARDED_ALLOW_IPS, and OAuth client credentials are not on it.
    id: "deployment-session-secret-override",
    files: ["docs/operations/deployment.md"],
    reason: "Record SESSION_SECRET in the Compose override, since the published Compose file does not forward it from .env.",
    pattern: "Generate a secret and record it in `.env`:",
    replacement: "Generate a secret and, on Docker Compose, set it as `SESSION_SECRET` in `docker-compose.override.yml`, as shown under [Deploy with Docker Compose](#deploy-with-docker-compose), because the published `docker-compose.yml` does not forward it from `.env`:",
  },
  {
    // lib/release-compose.yml (the public cryozen-releases docker-compose.yml) forwards a fixed environment list with no env_file; SESSION_SECRET, OAUTH_REDIRECT_BASE_URL, FORWARDED_ALLOW_IPS, and OAuth client credentials are not on it.
    id: "deployment-oauth-redirect-base-override",
    files: ["docs/operations/deployment.md"],
    reason: "Point OAUTH_REDIRECT_BASE_URL at the Compose override instead of a .env line the container never sees.",
    pattern: [
      "Set `OAUTH_REDIRECT_BASE_URL` to your externally reachable origin so the redirect lands back on the application:",
      "",
      "```ini",
      "OAUTH_REDIRECT_BASE_URL=https://your_domain_here",
      "```",
    ].join("\n"),
    replacement: "Set `OAUTH_REDIRECT_BASE_URL` to your externally reachable origin, such as `https://your_domain_here`; on Docker Compose, put it in `docker-compose.override.yml` as shown under [Deploy with Docker Compose](#deploy-with-docker-compose), so the redirect lands back on the application.",
  },
  {
    // lib/release-compose.yml (the public cryozen-releases docker-compose.yml) forwards a fixed environment list with no env_file; SESSION_SECRET, OAUTH_REDIRECT_BASE_URL, FORWARDED_ALLOW_IPS, and OAuth client credentials are not on it.
    id: "troubleshooting-session-secret-override",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Record SESSION_SECRET in the Compose override, since the published Compose file does not forward it from .env.",
    pattern: "Record the output as `SESSION_SECRET` in `.env`.",
    replacement: "On Docker Compose, record the output as `SESSION_SECRET` in `docker-compose.override.yml`, as [the deployment guide](deployment.md#deploy-with-docker-compose) shows, because the published `docker-compose.yml` does not forward it from `.env`.",
  },
  {
    // lib/release-compose.yml (the public cryozen-releases docker-compose.yml) forwards a fixed environment list with no env_file; SESSION_SECRET, OAUTH_REDIRECT_BASE_URL, FORWARDED_ALLOW_IPS, and OAuth client credentials are not on it.
    id: "troubleshooting-oauth-credentials-override",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Point the social sign-in credentials at the Compose override instead of editing the published docker-compose.yml.",
    pattern: "On the Compose path, remember that `docker-compose.yml` forwards a fixed list of variables into the container, and the social sign-in credentials are not on it, so add them to the service's `environment:` key as well as `.env`.",
    replacement: "On the Compose path, `docker-compose.yml` forwards a fixed list of variables into the container and the social sign-in credentials are not on it, so set them in `docker-compose.override.yml` as [the deployment guide](deployment.md#deploy-with-docker-compose) shows.",
  },
  {
    // lib/release-compose.yml (the public cryozen-releases docker-compose.yml) forwards a fixed environment list with no env_file; SESSION_SECRET, OAUTH_REDIRECT_BASE_URL, FORWARDED_ALLOW_IPS, and OAuth client credentials are not on it.
    id: "config-session-secret-override",
    files: ["docs/reference/configuration.md"],
    reason: "Name the Compose override as the place for SESSION_SECRET on Docker Compose.",
    pattern: "Store the result in `.env` or your secret manager, keep it out of version control, and keep it stable across restarts.",
    replacement: [
      "Store the result in your secret manager or, on Docker Compose, in `docker-compose.override.yml` as [the deployment guide](../operations/deployment.md#deploy-with-docker-compose) shows, because the published `docker-compose.yml` does not forward it from `.env`.",
      "Keep it out of version control and stable across restarts.",
    ].join("\n"),
  },
  {
    // lib/release-compose.yml (the public cryozen-releases docker-compose.yml) forwards a fixed environment list with no env_file; SESSION_SECRET, OAUTH_REDIRECT_BASE_URL, FORWARDED_ALLOW_IPS, and OAuth client credentials are not on it.
    id: "integrations-linking-credentials-override",
    files: ["docs/guides/integrations.md"],
    reason: "Point the account-linking OAuth credentials at the Compose override instead of .env.",
    pattern: "An administrator must first register an OAuth application with the provider and set its client ID and secret in `.env`, because a self-hosted instance has no shared application to use.",
    replacement: [
      "An administrator must first register an OAuth application with the provider and set its client ID and secret, because a self-hosted instance has no shared application to use.",
      "On Docker Compose they go in `docker-compose.override.yml`, as [the deployment guide](../operations/deployment.md#deploy-with-docker-compose) shows.",
    ].join("\n"),
  },
  {
    // lib/release-compose.yml (the public cryozen-releases docker-compose.yml) forwards a fixed environment list with no env_file; SESSION_SECRET, OAUTH_REDIRECT_BASE_URL, FORWARDED_ALLOW_IPS, and OAuth client credentials are not on it.
    id: "integrations-signin-credentials-override",
    files: ["docs/guides/integrations.md"],
    reason: "Point the sign-in OAuth credentials at the Compose override instead of .env.",
    pattern: "An administrator sets client credentials for Google, Microsoft, or GitHub in `.env`.",
    replacement: "An administrator sets client credentials for Google, Microsoft, or GitHub; on Docker Compose they go in `docker-compose.override.yml`, as [the deployment guide](../operations/deployment.md#deploy-with-docker-compose) shows.",
  },
  {
    // lib/release-compose.yml (the public cryozen-releases docker-compose.yml) forwards a fixed environment list with no env_file and does not mount .env into the container.
    id: "config-intro-compose-env-file",
    files: ["docs/reference/configuration.md"],
    reason: "Qualify the .env source for Docker Compose, where Compose reads .env and forwards only the variables docker-compose.yml lists.",
    pattern: "Values already present in the process environment win over `.env`, because `load_dotenv` does not overwrite existing keys.",
    replacement: [
      "Values already present in the process environment win over `.env`, because `load_dotenv` does not overwrite existing keys.",
      "On Docker Compose, the `.env` next to `docker-compose.yml` is read by Compose rather than by the application, so it reaches CryoZen only for the variables `docker-compose.yml` forwards; set any other variable in `docker-compose.override.yml`, as [the deployment guide](../operations/deployment.md#deploy-with-docker-compose) shows.",
    ].join("\n"),
  },
  {
    // lib/release-compose.yml (the public cryozen-releases docker-compose.yml) forwards a fixed environment list with no env_file and does not mount .env into the container.
    id: "config-precedence-compose-env-file",
    files: ["docs/reference/configuration.md"],
    reason: "Qualify the .env precedence entry for Docker Compose, where the application never reads that file.",
    pattern: "- **`.env` file**: read once from the repository root at `cryozen.py` with `encoding=\"utf-8-sig\"`, which tolerates the UTF-8 byte order mark that Windows Notepad adds.",
    replacement: "- **`.env` file**: read once from the repository root at `cryozen.py` with `encoding=\"utf-8-sig\"`, which tolerates the UTF-8 byte order mark that Windows Notepad adds. On Docker Compose the application never reads this file, and only the variables `docker-compose.yml` forwards reach it, as described at the top of this page.",
  },
  {
    // lib/release-channel-files.json: the public cryozen-releases tree has no docker/gpu.*.yml, docker-compose.gpu-*.yml, or cli/check-docker-*.sh, and lib/release-compose.yml passes no GPU device.
    id: "deployment-gpu-overlays-source-only",
    files: ["docs/operations/deployment.md"],
    reason: "Retitle the GPU section and replace the GPU overlay and diagnostic-script instructions, whose files are not in the public release channel, with a source-checkout note and the public alternatives.",
    pattern: [
      "## Enable GPU passthrough in Docker",
      "",
      "The GPU overlay files pass the host GPU into the `cryozen` container.",
      "They do not install a compute stack: the image stays slim, so you still install vLLM or llama-cpp-python through the Compute dependencies panel before a model can serve on the GPU.",
      "",
      "For NVIDIA, install the NVIDIA Container Toolkit on the host, point Docker at the runtime, then select the overlay in `.env`:",
      "",
      "```bash",
      "sudo nvidia-ctk runtime configure --runtime=docker",
      "sudo systemctl restart docker",
      "echo \"COMPOSE_FILE=docker-compose.yml:docker/gpu.nvidia.yml\" >> .env",
      "docker compose up -d",
      "```",
      "",
      "For AMD, install the ROCm drivers so `/dev/kfd` and `/dev/dri` exist, add your Docker user to the `video` and `render` groups, and record the numeric render group id:",
      "",
      "```bash",
      "echo \"COMPOSE_FILE=docker-compose.yml:docker/gpu.amd.yml\" >> .env",
      "echo \"RENDER_GID=$(getent group render | cut -d: -f3)\" >> .env",
      "docker compose up -d",
      "```",
      "",
      "On Windows, `COMPOSE_FILE` separates paths with a semicolon rather than a colon.",
      "",
      "Two diagnostic scripts check the host before you commit to a configuration.",
      "`cli/check-docker-gpu.sh` is read-only by default and can also print or run the NVIDIA toolkit install, and write `COMPOSE_FILE` to `.env` when you pass `--enable-nvidia-overlay`.",
      "`cli/check-docker-amd-gpu.sh` is read-only with no install mode, and verifies that a container can see the AMD device nodes.",
      "",
      "Some stack-management interfaces accept only one Compose file and ignore `COMPOSE_FILE`.",
      "For those, use `docker-compose.gpu-nvidia.yml` or `docker-compose.gpu-amd.yml`, which are the base file and the matching overlay already merged.",
      "Prefer the overlay workflow anywhere you drive Compose from a shell, because the merged files are maintained copies rather than the source of truth.",
    ].join("\n"),
    replacement: [
      "## GPUs and Docker",
      "",
      "The GPU Compose overlays and the GPU diagnostic scripts ship in the source checkout, which is not public, and the published `docker-compose.yml` passes no GPU into the container.",
      "To use a GPU with the public stack, run your model server, such as Ollama, on the host outside Docker and connect CryoZen to it through `host.docker.internal`, as [Integrations](../guides/integrations.md#local-models) describes.",
      "Desktop packages from [the download page](/download) run without Docker.",
    ].join("\n"),
  },
  {
    // lib/release-channel-files.json: the public cryozen-releases tree has no docker/gpu.*.yml, docker-compose.gpu-*.yml, or cli/check-docker-*.sh, and lib/release-compose.yml passes no GPU device.
    id: "troubleshooting-gpu-overlays-source-only",
    files: ["docs/operations/troubleshooting.md"],
    reason: "Drop the GPU overlay reference, whose files are not in the public release channel.",
    pattern: [
      "Inside Docker, the image ships without a compute stack on purpose.",
      "The GPU overlays pass the device through but install nothing, so install the inference packages through the Compute dependencies panel before expecting a GPU model to serve.",
    ].join("\n"),
    replacement: "Inside Docker, the image ships without a compute stack on purpose, so install the inference packages through the Compute dependencies panel before expecting a model to serve in the container.",
  },
  {
    // lib/release-channel-files.json: the public cryozen-releases tree has no docker/gpu.*.yml, docker-compose.gpu-*.yml, or cli/check-docker-*.sh, and lib/release-compose.yml passes no GPU device.
    id: "config-compose-file-row-public",
    files: ["docs/reference/configuration.md"],
    reason: "Drop the GPU overlay use from the COMPOSE_FILE row, since the overlays are not in the public release channel.",
    pattern: "A colon-separated (semicolon on Windows) list of compose files merged left to right, used to layer the GPU overlays.",
    replacement: "A colon-separated (semicolon on Windows) list of compose files merged left to right.",
  },
  {
    // lib/release-channel-files.json: the public cryozen-releases tree has no docker/gpu.*.yml, docker-compose.gpu-*.yml, or cli/check-docker-*.sh, and lib/release-compose.yml passes no GPU device.
    id: "config-render-gid-row-public",
    files: ["docs/reference/configuration.md"],
    reason: "Mark RENDER_GID as read only by the AMD overlay in the source checkout.",
    pattern: "| `RENDER_GID` | `render` | Compose-only, AMD ROCm overlay. Numeric gid of the host `render` group, read from `getent group render`. |",
    replacement: "| `RENDER_GID` | `render` | Compose-only. Read by the AMD ROCm overlay in the source checkout, which is not public; the published `docker-compose.yml` does not use it. |",
  },
  {
    // lib/release-channel-files.json: the public cryozen-releases tree has no docker/gpu.*.yml, docker-compose.gpu-*.yml, or cli/check-docker-*.sh, and lib/release-compose.yml passes no GPU device.
    id: "config-lm-studio-row-public",
    files: ["docs/reference/configuration.md"],
    reason: "Name only the published docker-compose.yml as forwarding LM_STUDIO_URL.",
    pattern: "`docker-compose.yml` and both GPU compose files forward it, so setting it in `.env` reaches the container.",
    replacement: "`docker-compose.yml` forwards it, so setting it in `.env` reaches the container.",
  },
];

/**
 * Corrections of upstream statements that the pinned ref's own code
 * contradicts. Each rule cites the code that establishes the fact.
 */
export const FACT_CORRECTION_TRANSFORMS = [
  {
    // routers/contacts_router.py:30-54 at v1.2.0: contacts and CardDAV settings live in one instance settings.json, and every route requires require_admin.
    id: "integrations-contacts-instance-wide",
    files: ["docs/guides/integrations.md"],
    reason: "Correct contacts to instance-wide and admin-managed, as routers/contacts_router.py stores them in one settings file behind require_admin.",
    pattern: [
      "Language-model keys, search keys, and local services work this way.",
      "- **Per-user**: each account stores its own credentials. Mail, calendar, contacts, and linked accounts work this way,",
    ].join("\n"),
    replacement: [
      "Language-model keys, search keys, local services, and contacts, including the CardDAV connection, work this way.",
      "- **Per-user**: each account stores its own credentials. Mail, calendar, and linked accounts work this way,",
    ].join("\n"),
  },
  {
    // routers/contacts_router.py:46-54 and update_config at v1.2.0 store carddav_password as given in settings.json; get_config masks it on read.
    id: "integrations-carddav-plaintext",
    files: ["docs/guides/integrations.md"],
    reason: "Disclose that the CardDAV password is stored in plain text, as routers/contacts_router.py writes it unencrypted.",
    pattern: "Secrets are encrypted at rest with a key held in your data directory, masked whenever they are read back, and never written to logs.",
    replacement: [
      "Secrets are encrypted at rest with a key held in your data directory, masked whenever they are read back, and never written to logs.",
      "The exception is the CardDAV password, which is stored in plain text in the instance settings file.",
    ].join("\n"),
  },
  {
    // routers/contacts_router.py at v1.2.0: every contacts route depends on require_admin.
    id: "integrations-contacts-admin-only",
    files: ["docs/guides/integrations.md"],
    reason: "State that contacts are shared and admin-managed, as every contacts route requires require_admin.",
    pattern: "Contacts follow the same pattern under **Settings**, then **Contacts**.",
    replacement: [
      "Contacts follow the same pattern under **Settings**, then **Contacts**.",
      "Contacts are shared across the instance, and only an administrator can configure or edit them.",
    ].join("\n"),
  },
];

export const DEFAULT_TRANSFORMS = [
  ...BANNED_TRANSFORMS,
  ...PUBLIC_INSTALL_TRANSFORMS,
  ...FACT_CORRECTION_TRANSFORMS,
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
function rewriteLinks(markdown, sourcePath, sourceRepo = DEFAULT_SOURCE_REPO) {
  const dir = posix.dirname(sourcePath);
  const privateRepoUrlRe = buildPrivateRepoUrlRegex(sourceRepo);
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
      if (rawTarget.startsWith("#") || rawTarget.startsWith("/") || /^mailto:/i.test(rawTarget)) {
        return full;
      }

      if (/^https?:\/\//i.test(rawTarget)) {
        if (privateRepoUrlRe.test(rawTarget)) {
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
  const missed = [];
  for (const rule of transforms) {
    if (!rule.files.includes(sourcePath)) continue;
    if (result.includes(rule.pattern)) {
      result = result.replaceAll(rule.pattern, rule.replacement);
      applied.push({ id: rule.id, file: sourcePath, reason: rule.reason });
    } else {
      missed.push({ id: rule.id, file: sourcePath, reason: rule.reason });
    }
  }
  return { markdown: result, applied, missed };
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

export function findSourceRepoMatches(text, sourceRepo) {
  if (!sourceRepo) return [];
  const re = buildSourceRepoRegex(sourceRepo);
  const matches = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const hit = re.exec(lines[i]);
    if (hit) {
      matches.push({ match: hit[0], line: i + 1, text: lines[i].trim() });
    }
  }
  return matches;
}

export function findDockerComposeBuildMatches(text) {
  const matches = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    let combined = lines[i];
    const startLine = i + 1;
    while (combined.endsWith("\\") && i + 1 < lines.length) {
      i += 1;
      combined = `${combined.slice(0, -1)} ${lines[i]}`;
    }
    if (DOCKER_COMPOSE_BUILD_LINE_RE.test(combined)) {
      matches.push({ line: startLine, text: combined.trim() });
    }
  }
  return matches;
}

// Variables Compose itself reads from `.env` without naming them in the file.
const COMPOSE_OWN_ENV = ["COMPOSE_FILE"];
// Variables the published image reads that the configuration reference does not
// list, because uvicorn rather than CryoZen reads them.
const IMAGE_ENV_SETTINGS = ["FORWARDED_ALLOW_IPS"];

/** Names a `.env` file can set for the published Compose stack: every `${NAME}` it interpolates. */
export function composeEnvNames(composeText) {
  return new Set([...COMPOSE_OWN_ENV, ...[...composeText.matchAll(/\$\{([A-Z][A-Z0-9_]*)/g)].map((m) => m[1])]);
}

/** CryoZen settings: the first-column names of the configuration reference tables, plus image-level ones. */
export function settingNamesFromReference(configurationMarkdown) {
  return new Set([
    ...IMAGE_ENV_SETTINGS,
    ...[...configurationMarkdown.matchAll(/^\| `([A-Z][A-Z0-9_]*)`/gm)].map((m) => m[1]),
  ]);
}

/**
 * Sentences that tell readers to set a CryoZen setting in `.env` that the
 * published Compose stack never reads, unless the sentence points at
 * `docker-compose.override.yml` instead.
 */
export function findComposeEnvMismatches(text, composeNames, settingNames) {
  const matches = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    for (const sentence of lines[i].split(/(?<=\.)\s+/)) {
      if (!sentence.includes("`.env`") || sentence.includes("docker-compose.override.yml")) continue;
      for (const [, name] of sentence.matchAll(/`([A-Z][A-Z0-9_]{2,})(?:=[^`]*)?`/g)) {
        if (settingNames.has(name) && !composeNames.has(name)) matches.push({ line: i + 1, name, text: sentence.trim() });
      }
    }
  }
  return matches;
}

// Files the docs tell readers to create themselves next to the public bundle.
const USER_CREATED_FILES = ["docker-compose.override.yml"];
const COMPOSE_PATH_RE = /(?<![\w/.-])(docker\/[\w.*/-]+|docker-compose[\w.-]*\.ya?ml)/g;
const HOST_INVOCATION_RE = /^(?:sudo\s+)?(?:python3?\s+)?(?:\.\/)?((?:cli|scripts|packaging|docker)\/[\w.*/-]+)/;

/**
 * Compose files and host-run scripts the docs reference that the public
 * release channel does not ship: any `docker/...` or `docker-compose*.yml`
 * path, and any code-block line that runs a `cli/`, `scripts/`, `packaging/`,
 * or `docker/` path on the host rather than through `docker compose exec`.
 */
export function findUnpublishedPaths(text, publishedPaths) {
  const allowed = new Set([...publishedPaths, ...USER_CREATED_FILES]);
  const matches = [];
  const lines = text.split(/\r?\n/);
  let fenceMarker = "";
  for (let i = 0; i < lines.length; i += 1) {
    const fence = /^\s*(`{3,}|~{3,})/.exec(lines[i]);
    if (fence) {
      if (!fenceMarker) fenceMarker = fence[1][0];
      else if (fence[1][0] === fenceMarker) fenceMarker = "";
      continue;
    }
    const paths = [...lines[i].matchAll(COMPOSE_PATH_RE)].map((m) => m[1]);
    const hostRun = fenceMarker ? HOST_INVOCATION_RE.exec(lines[i].trim()) : null;
    if (hostRun) paths.push(hostRun[1]);
    for (const path of new Set(paths)) {
      if (!allowed.has(path)) matches.push({ line: i + 1, path, text: lines[i].trim() });
    }
  }
  return matches;
}

export function findSourceOnlyMatches(text, desktopDataDirs) {
  const matches = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (SOURCE_ONLY_ALLOWLIST.has(line)) continue;
    const namesDesktopDirs = desktopDataDirs.length > 0 && desktopDataDirs.every((dir) => line.includes(dir));
    if (SOURCE_ONLY_MARKER_RE.test(line) || (SOURCE_CHECKOUT_DATA_DIR_RE.test(line) && !namesDesktopDirs)) {
      matches.push({ line: i + 1, text: line });
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
  composePath = DEFAULT_COMPOSE_PATH,
  channelFilesPath = DEFAULT_CHANNEL_FILES_PATH,
  transforms = DEFAULT_TRANSFORMS,
} = {}) {
  if (!productRepo) {
    throw new Error("Missing product repo path: set PRODUCT_REPO or pass --product <path>.");
  }

  const facts = JSON.parse(readFileSync(factsPath, "utf8"));
  const bannedTerms = Array.isArray(facts.banned) ? facts.banned : [];
  const sourceRepo = typeof facts.repos?.source === "string" ? facts.repos.source.trim() : "";
  const desktopDataDirs = Object.values(facts.install?.data_dirs ?? {});
  const composeNames = composeEnvNames(readFileSync(composePath, "utf8"));
  const publishedPaths = JSON.parse(readFileSync(channelFilesPath, "utf8"));
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
    if (transformed.missed.length > 0) {
      const detail = transformed.missed
        .map((miss) => `${miss.file}: [${miss.id}] matched nothing: ${miss.reason}`)
        .join("\n");
      throw new Error(`Transform check failed (source text changed at ${ref}?):\n${detail}`);
    }
    body = transformed.markdown;
    appliedTransforms.push(...transformed.applied);

    const rewritten = rewriteLinks(body, entry.source, sourceRepo);
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

    const sourceRepoHits = findSourceRepoMatches(fullContent, sourceRepo);
    if (sourceRepoHits.length > 0) {
      const detail = sourceRepoHits
        .map((hit) => `${entry.source}:${hit.line} matched private source repo github.com/${sourceRepo}: ${hit.text}`)
        .join("\n");
      throw new Error(`Private source repo check failed:\n${detail}`);
    }

    const composeBuildHits = findDockerComposeBuildMatches(fullContent);
    if (composeBuildHits.length > 0) {
      const detail = composeBuildHits
        .map((hit) => `${entry.source}:${hit.line} matched --build in docker compose command: ${hit.text}`)
        .join("\n");
      throw new Error(`Docker Compose --build check failed:\n${detail}`);
    }

    const sourceOnlyHits = findSourceOnlyMatches(fullContent, desktopDataDirs);
    if (sourceOnlyHits.length > 0) {
      const detail = sourceOnlyHits
        .map((hit) => `${entry.source}:${hit.line} matched source-checkout-only content: ${hit.text}`)
        .join("\n");
      throw new Error(`Source-only content check failed:\n${detail}`);
    }

    const unpublishedHits = findUnpublishedPaths(fullContent, publishedPaths);
    if (unpublishedHits.length > 0) {
      const detail = unpublishedHits
        .map((hit) => `${entry.source}:${hit.line} references ${hit.path}, which the public release channel does not ship: ${hit.text}`)
        .join("\n");
      throw new Error(`Unpublished path check failed:\n${detail}`);
    }

    prepared.push({
      source: entry.source,
      slug: entry.slug,
      outPath: outputFileForSlug(outDir, entry.slug),
      content: fullContent,
    });
  }

  const configurationDoc = prepared.find((doc) => doc.slug === "reference/configuration");
  const settingNames = settingNamesFromReference(configurationDoc.content);
  const composeEnvHits = prepared.flatMap((doc) =>
    findComposeEnvMismatches(doc.content, composeNames, settingNames).map((hit) => ({ ...hit, source: doc.source })),
  );
  if (composeEnvHits.length > 0) {
    const detail = composeEnvHits
      .map((hit) => `${hit.source}:${hit.line} tells Compose users to set ${hit.name} in .env, which lib/release-compose.yml does not read: ${hit.text}`)
      .join("\n");
    throw new Error(`Compose .env check failed:\n${detail}`);
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
    ref: DEFAULT_REF,
    outDir: DEFAULT_OUT_DIR,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--product" && argv[i + 1]) {
      options.productRepo = argv[++i];
    } else if (arg === "--ref" && argv[i + 1]) {
      options.ref = argv[++i];
    } else if (arg === "--out" && argv[i + 1]) {
      options.outDir = argv[++i];
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

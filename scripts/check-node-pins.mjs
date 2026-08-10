// Asserts the three-way Node lockstep: `.nvmrc` (local and CI), `engines.node`
// (Vercel's runtime), and the installed `@types/node` (what the build
// type-checks against) must all name the same major. Without this, raising
// `@types/node` alone type-checks the project against a runtime it never runs
// on, and every other check stays green while it happens.
//
// CI is the enforcement point by design. This is deliberately not a `prebuild`
// hook: the drift affects compile-time type validation only, so failing a
// production deploy over it would trade a small correctness win for an outage
// risk. CI gates every pull request and every push to main, which is enough.
//
// Takes an optional repository root argument; defaults to the repository this
// script lives in.
import { readFileSync, writeSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const TYPES_NODE_PACKAGE = "node_modules/@types/node/package.json";

class PinCheckError extends Error {}

function fail(message) {
  throw new PinCheckError(message);
}

function read(root, relativePath, missingHint) {
  try {
    return readFileSync(join(root, relativePath), "utf8");
  } catch (error) {
    const hint = error.code === "ENOENT" && missingHint ? ` - ${missingHint}` : "";
    fail(`cannot read ${relativePath}: ${error.message}${hint}`);
  }
}

function readJson(root, relativePath, missingHint) {
  const source = read(root, relativePath, missingHint);
  try {
    return JSON.parse(source);
  } catch (error) {
    fail(`cannot parse ${relativePath}: ${error.message}`);
  }
}

function majorOf(source, relativePath, description) {
  const match = /\d+/.exec(source);
  if (!match) {
    fail(`cannot read a Node major from ${description} in ${relativePath} (found ${JSON.stringify(source)})`);
  }
  return Number(match[0]);
}

function check(root) {
  const nvmrcRaw = read(root, ".nvmrc").trim();
  const nvmrcMajor = majorOf(nvmrcRaw, ".nvmrc", "the version");

  const enginesRaw = readJson(root, "package.json").engines?.node;
  if (typeof enginesRaw !== "string") {
    fail("package.json has no `engines.node` string; the Vercel runtime pin is missing");
  }
  const enginesMajor = majorOf(enginesRaw, "package.json", "`engines.node`");

  const typesRaw = readJson(root, TYPES_NODE_PACKAGE, "install dependencies first with `npm ci`").version;
  if (typeof typesRaw !== "string") {
    fail(`${TYPES_NODE_PACKAGE} has no \`version\` field; reinstall dependencies with \`npm ci\``);
  }
  const typesMajor = majorOf(typesRaw, TYPES_NODE_PACKAGE, "the installed `@types/node` version");

  if (nvmrcMajor !== enginesMajor || nvmrcMajor !== typesMajor) {
    fail(
      [
        "the three Node pins disagree, so the project would be type-checked against a runtime it does not run on.",
        `  .nvmrc                    ${nvmrcRaw} (major ${nvmrcMajor})`,
        `  package.json engines.node ${enginesRaw} (major ${enginesMajor})`,
        `  @types/node installed     ${typesRaw} (major ${typesMajor})`,
        "All three name one Node major and move in one commit. Bring the odd one out in line with the other two;",
        "if the intent is a Node major upgrade, change all three (including the `@types/node` range in package.json).",
      ].join("\n"),
    );
  }

  return `Node pins agree on major ${nvmrcMajor} (.nvmrc, engines.node, @types/node ${typesRaw}).`;
}

const root = process.argv[2] ? resolve(process.argv[2]) : join(dirname(fileURLToPath(import.meta.url)), "..");

try {
  writeSync(1, `${check(root)}\n`);
} catch (error) {
  if (!(error instanceof PinCheckError)) {
    throw error;
  }
  writeSync(2, `Node pin check failed: ${error.message}\n`);
  process.exitCode = 1;
}

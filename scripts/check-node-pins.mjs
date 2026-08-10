// Asserts the three-way Node lockstep: `.nvmrc` (local and CI), `engines.node`
// (Vercel's runtime), and the installed `@types/node` (what the build
// type-checks against) must all name the same major. Without this, raising
// `@types/node` alone type-checks the project against a runtime it never runs
// on, and every other check stays green while it happens.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  try {
    return readFileSync(join(repoRoot, relativePath), "utf8");
  } catch (error) {
    fail(`cannot read ${relativePath}: ${error.message}`);
  }
}

function majorOf(source, relativePath, description) {
  const match = /\d+/.exec(source);
  if (!match) {
    fail(`cannot read a Node major from ${description} in ${relativePath} (found ${JSON.stringify(source)})`);
  }
  return Number(match[0]);
}

function fail(message) {
  console.error(`Node pin check failed: ${message}`);
  process.exit(1);
}

const nvmrcRaw = read(".nvmrc").trim();
const nvmrcMajor = majorOf(nvmrcRaw, ".nvmrc", "the version");

const packageJson = JSON.parse(read("package.json"));
const enginesRaw = packageJson.engines?.node;
if (typeof enginesRaw !== "string") {
  fail("package.json has no `engines.node` string; the Vercel runtime pin is missing");
}
const enginesMajor = majorOf(enginesRaw, "package.json", "`engines.node`");

const typesRaw = JSON.parse(read("node_modules/@types/node/package.json")).version;
if (typeof typesRaw !== "string") {
  fail("node_modules/@types/node/package.json has no `version`; run `npm ci` first");
}
const typesMajor = majorOf(typesRaw, "node_modules/@types/node/package.json", "the installed `@types/node` version");

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

console.log(`Node pins agree on major ${nvmrcMajor} (.nvmrc, engines.node, @types/node ${typesRaw}).`);

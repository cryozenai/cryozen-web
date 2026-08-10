// The guard is only worth having if it fails when it should, so the mismatch
// branch is exercised here against real fixture repositories rather than
// trusted from the passing case.
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const script = join(dirname(fileURLToPath(import.meta.url)), "check-node-pins.mjs");
const fixtures = [];

after(() => {
  for (const root of fixtures) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixture({ nvmrc, engines, types }) {
  const root = mkdtempSync(join(tmpdir(), "check-node-pins-"));
  fixtures.push(root);
  writeFileSync(join(root, ".nvmrc"), `${nvmrc}\n`);
  writeFileSync(join(root, "package.json"), JSON.stringify({ engines: { node: engines } }));
  if (types !== undefined) {
    const typesDir = join(root, "node_modules", "@types", "node");
    mkdirSync(typesDir, { recursive: true });
    writeFileSync(join(typesDir, "package.json"), JSON.stringify({ version: types }));
  }
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [script, root], { encoding: "utf8" });
}

test("passes when all three pins name the same major", () => {
  const result = run(fixture({ nvmrc: "24", engines: "24.x", types: "24.13.3" }));

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /Node pins agree on major 24/);
});

test("fails when the installed @types/node major has drifted", () => {
  const result = run(fixture({ nvmrc: "24", engines: "24.x", types: "26.2.0" }));

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Node pin check failed/);
  assert.match(result.stderr, /\.nvmrc {20}24 \(major 24\)/);
  assert.match(result.stderr, /package\.json engines\.node 24\.x \(major 24\)/);
  assert.match(result.stderr, /@types\/node installed {5}26\.2\.0 \(major 26\)/);
});

test("fails when engines.node has drifted", () => {
  const result = run(fixture({ nvmrc: "24", engines: "26.x", types: "24.13.3" }));

  assert.equal(result.status, 1);
  assert.match(result.stderr, /package\.json engines\.node 26\.x \(major 26\)/);
  assert.match(result.stderr, /@types\/node installed {5}24\.13\.3 \(major 24\)/);
});

test("fails when .nvmrc has drifted", () => {
  const result = run(fixture({ nvmrc: "26", engines: "24.x", types: "24.13.3" }));

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\.nvmrc {20}26 \(major 26\)/);
  assert.match(result.stderr, /package\.json engines\.node 24\.x \(major 24\)/);
});

test("points at npm ci when @types/node is not installed", () => {
  const result = run(fixture({ nvmrc: "24", engines: "24.x" }));

  assert.equal(result.status, 1);
  assert.match(result.stderr, /node_modules\/@types\/node\/package\.json/);
  assert.match(result.stderr, /install dependencies first with `npm ci`/);
});

/*
 * The home page, the tour, and the feature pages are arranged by a handful of
 * pure functions in lib/home/derive.ts: which chapter a surface is, what sits
 * beside it, which row of the egress ledger it falls in, and which recording a
 * slot shows. These tests run them on small hand-built surface lists whose
 * right answers are written out here, so the arrangement is checked against a
 * worked example rather than against whatever the live content happens to be.
 *
 * The live content gets its own checks at the end: every surface is reachable
 * from the pages, and the copy file names nothing that does not exist.
 */
import { strict as assert } from "node:assert";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

const {
  egressLedger,
  firstCapture,
  groupOrder,
  publicSurface,
  relatedSurfaces,
  tourChapters,
  tourGroups,
  tourNeighbors,
} = await import("../lib/home/derive.ts");
const copy = await import("../lib/home/copy.ts");
const { surfaces, surfaceIds, findSurface } = await import("../lib/product/surfaces.ts");
const { nav } = await import("../lib/site.ts");
const facts = JSON.parse(readFileSync(join(root, "lib/release-facts.json"), "utf8"));

/** A surface with only what the arranging logic reads. */
const s = (id, group, leaves = "nothing") => ({ id, group, privacy: { leaves } });

/*
 * A worked example, listed the way lib/product lists surfaces: in an order
 * that interleaves the kinds of work.
 *
 *   list order:  talk(converse) shell(run) look(know) pad(organize) vote(converse) cron(run)
 *   tour order:  converse: talk, vote | know: look | organize: pad | run: shell, cron
 *   numbered:    1 talk, 2 vote, 3 look, 4 pad, 5 shell, 6 cron        (no build group)
 */
const EXAMPLE = [
  s("talk", "converse", "chosen-provider"),
  s("shell", "run", "configured-service"),
  s("look", "know", "configured-service"),
  s("pad", "organize"),
  s("vote", "converse", "chosen-provider"),
  s("cron", "run", "configured-service"),
];
const ids = (list) => list.map((entry) => entry.id);

test("the kinds of work are presented in one fixed order", () => {
  assert.deepEqual([...groupOrder], ["converse", "know", "organize", "run", "build"]);
});

test("tourGroups gathers surfaces by kind of work and numbers them across groups", () => {
  const groups = tourGroups(EXAMPLE);
  assert.deepEqual(
    groups.map((group) => [
      group.group,
      group.label,
      group.chapters.map((chapter) => `${chapter.number} ${chapter.surface.id}`),
    ]),
    [
      ["converse", "Converse", ["1 talk", "2 vote"]],
      ["know", "Know", ["3 look"]],
      ["organize", "Organize", ["4 pad"]],
      ["run", "Run", ["5 shell", "6 cron"]],
    ],
  );
});

test("tourGroups leaves out a kind of work that has no surface, and handles none at all", () => {
  assert.ok(!tourGroups(EXAMPLE).some((group) => group.group === "build"));
  assert.deepEqual(tourGroups([]), []);
  assert.deepEqual(
    tourGroups([s("api", "build")]).map((group) => [group.group, group.chapters[0].number]),
    [["build", 1]],
  );
});

test("tourChapters is the same chapters as one list", () => {
  assert.deepEqual(
    tourChapters(EXAMPLE).map((chapter) => chapter.surface.id),
    ["talk", "vote", "look", "pad", "shell", "cron"],
  );
});

test("tourNeighbors follows the tour's order, not the list's", () => {
  const around = (id) => {
    const { previous, next } = tourNeighbors(EXAMPLE, id);
    return [previous?.surface.id ?? null, next?.surface.id ?? null];
  };
  assert.deepEqual(around("talk"), [null, "vote"], "the first chapter has nothing before it");
  assert.deepEqual(around("vote"), ["talk", "look"], "crosses from one group into the next");
  assert.deepEqual(around("shell"), ["pad", "cron"]);
  assert.deepEqual(around("cron"), ["shell", null], "the last chapter has nothing after it");
  assert.deepEqual(around("nope"), [null, null]);
  assert.equal(tourNeighbors(EXAMPLE, "vote").previous.number, 1);
  assert.equal(tourNeighbors(EXAMPLE, "vote").next.number, 3);
});

test("relatedSurfaces prefers the same kind of work, then what follows in the tour", () => {
  // talk's group has one other member; the rest come from what follows talk.
  assert.deepEqual(ids(relatedSurfaces(EXAMPLE, "talk")), ["vote", "look", "pad"]);
  // pad is alone in its group, so all three follow it, wrapping past the end.
  assert.deepEqual(ids(relatedSurfaces(EXAMPLE, "pad")), ["shell", "cron", "talk"]);
  // cron is last: its group mate first, then the tour from the top.
  assert.deepEqual(ids(relatedSurfaces(EXAMPLE, "cron")), ["shell", "talk", "vote"]);
  assert.deepEqual(ids(relatedSurfaces(EXAMPLE, "cron", 1)), ["shell"]);
  assert.deepEqual(relatedSurfaces(EXAMPLE, "nope"), []);
});

test("relatedSurfaces never returns the surface itself or a duplicate, even past the list's length", () => {
  for (const { id } of EXAMPLE) {
    const related = ids(relatedSurfaces(EXAMPLE, id, 99));
    assert.equal(related.length, EXAMPLE.length - 1, id);
    assert.ok(!related.includes(id), id);
    assert.equal(new Set(related).size, related.length, id);
  }
  assert.deepEqual(relatedSurfaces([s("only", "run")], "only"), []);
});

test("egressLedger files every surface under its reach, narrowest first", () => {
  assert.deepEqual(
    egressLedger(EXAMPLE).map((row) => [row.reach, ids(row.surfaces)]),
    [
      ["nothing", ["pad"]],
      ["chosen-provider", ["talk", "vote"]],
      ["configured-service", ["shell", "look", "cron"]],
    ],
  );
  // A reach nothing has still gets its row, so the table always shows all three.
  assert.deepEqual(
    egressLedger([s("pad", "organize")]).map((row) => [row.reach, row.surfaces.length]),
    [
      ["nothing", 1],
      ["chosen-provider", 0],
      ["configured-service", 0],
    ],
  );
});

test("firstCapture takes the preferred recording, then the stand-in, then nothing", () => {
  const recorded = { coderun: { id: "coderun" }, mail: { id: "mail" } };
  const lookup = (id) => recorded[id] ?? null;
  assert.equal(firstCapture(["chat", "coderun"], lookup).id, "coderun", "falls back while chat is missing");
  assert.equal(firstCapture(["mail", "coderun"], lookup).id, "mail", "the preferred take wins once it exists");
  assert.equal(firstCapture(["agents"], lookup), null);
  assert.equal(firstCapture([], lookup), null);
});

test("publicSurface drops the private evidence paths and nothing else", () => {
  const surface = findSurface("chat");
  assert.ok(surface.evidence.length > 0, "the fixture has evidence to drop");
  const shown = publicSurface(surface);
  assert.deepEqual(shown.evidence, []);
  assert.deepEqual({ ...shown, evidence: surface.evidence }, surface);
  assert.ok(surface.evidence.length > 0, "the original is not modified");
});

/* ------------------------------ live content ----------------------------- */

test("the tour, the features index, and the ledger each show every surface exactly once", () => {
  const sorted = [...surfaceIds].sort();
  assert.deepEqual(
    tourChapters(surfaces)
      .map((chapter) => chapter.surface.id)
      .sort(),
    sorted,
  );
  assert.deepEqual(
    tourChapters(surfaces).map((chapter) => chapter.number),
    surfaceIds.map((_, index) => index + 1),
  );
  assert.deepEqual(
    egressLedger(surfaces)
      .flatMap((row) => row.surfaces.map((surface) => surface.id))
      .sort(),
    sorted,
  );
});

test("every kind of work has a home chapter, and the copy names only real surfaces", () => {
  for (const group of tourGroups(surfaces)) {
    const chapter = copy.chapters[group.group];
    assert.ok(chapter.headline.length > 0, group.group);
    assert.ok(chapter.frames.length > 0, `${group.group}: a chapter needs a frame`);
    for (const frame of chapter.frames) {
      const shown = findSurface(frame.surface);
      assert.ok(shown, `${group.group}: unknown surface ${frame.surface}`);
      assert.equal(shown.group, group.group, `${group.group}: its frame shows ${frame.surface}`);
    }
  }
  for (const slot of copy.heroSlots) assert.ok(findSurface(slot.surface), slot.surface);
  assert.ok(findSurface(copy.tourTeaser.surface));
  for (const id of Object.keys(copy.extraCaptures)) assert.ok(findSurface(id), id);
});

test("a hero tab plays only its own surface's recording, so its reach line describes what is shown", () => {
  for (const slot of copy.heroSlots) {
    const own = findSurface(slot.surface).capture;
    assert.notEqual(own, null, `${slot.surface}: a hero tab needs a shipped recording`);
    for (const capture of slot.captures) assert.equal(capture, own, `${slot.surface} plays ${capture}`);
  }
});

test("the tour teaser shows a chapter with a recording, and most chapters have one", () => {
  // The teaser's intro promises a short recording for most chapters and shows one of them.
  assert.notEqual(findSurface(copy.tourTeaser.surface).capture, null, copy.tourTeaser.surface);
  const recorded = tourChapters(surfaces).filter((chapter) => chapter.surface.capture !== null);
  assert.ok(recorded.length * 2 > tourChapters(surfaces).length, `${recorded.length} recorded`);
});

test("the activation path is the four steps, and the app address is the desktop port", () => {
  assert.deepEqual(
    copy.start.steps.map((step) => step.title),
    ["Install", "Create your admin account", "Connect a model", "Ask your first question"],
  );
  assert.deepEqual(copy.start.steps[0].cue.labels, [`127.0.0.1:${facts.install.desktop_port}`]);
  assert.deepEqual(
    copy.start.steps.map((step) => step.capture ?? null),
    [null, "first-run", "connect-model", null],
  );
});

test("the team summary files webhooks and contacts under shared, never per user", () => {
  const [perUser, adminOnly, shared] = copy.teams.tiers;
  assert.equal(copy.teams.tiers.length, 3);
  assert.ok(shared.items.some((item) => /contact/i.test(item)), "contacts are shared");
  assert.ok(shared.items.some((item) => /webhook/i.test(item)), "webhooks are shared");
  for (const item of [...perUser.items, ...adminOnly.items]) {
    assert.doesNotMatch(item, /webhook|contact/i, `"${item}" is shared, not ${perUser.label}`);
  }
  assert.match(perUser.note, /Mail and calendar are off/);
});

/** Whether the App Router serves `/<segment>`: a page in its folder, or an optional catch-all under it. */
function servesPage(segment) {
  const dir = join(root, "app", segment);
  if (existsSync(join(dir, "page.tsx"))) return true;
  return (
    existsSync(dir) &&
    readdirSync(dir).some((entry) => /^\[\[\.\.\.\w+\]\]$/.test(entry) && existsSync(join(dir, entry, "page.tsx")))
  );
}

test("every header link is internal, distinct, and an App Router page", () => {
  assert.ok(nav.length > 0);
  assert.equal(new Set(nav.map((item) => item.href)).size, nav.length);
  for (const { href, label } of nav) {
    assert.match(href, /^\/[a-z-]+$/, `${label}: ${href} is not an internal page path`);
    assert.ok(servesPage(href.slice(1)), `${label}: no page at ${href}`);
  }
  assert.equal(servesPage("no-such-section"), false);
});

/** Every string in the copy file, however deeply nested. */
function strings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

test("page copy has no emojis, no em or en dashes, and no banned release string", () => {
  const all = strings({ ...copy });
  assert.ok(all.length > 50, "the copy file was not read");
  for (const text of all) {
    assert.doesNotMatch(text, /[–—]/, `dash in "${text}"`);
    assert.doesNotMatch(text, /\p{Extended_Pictographic}/u, `emoji in "${text}"`);
    for (const banned of facts.banned) {
      assert.ok(!text.toLowerCase().includes(banned.toLowerCase()), `banned "${banned}" in "${text}"`);
    }
  }
});

test("page copy does not claim what v1.2.0 does not ship", () => {
  const withdrawn =
    /\bRAG\b|\bretriev\w+|\bvector\b|answers? from your (own )?(files|documents)|\bvoice\b|text[- ]to[- ]image|time-based|coming soon|roadmap/i;
  for (const text of strings({ ...copy })) {
    assert.doesNotMatch(text, withdrawn, `"${text}"`);
  }
  assert.match(copy.inside.intro, /^Everything below ships in v1\.2\.0\./);
});

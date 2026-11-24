/*
 * The site's product claims are data, and a wrong claim is the most expensive
 * bug this site can ship: it tells a visitor the app does something it does
 * not. These tests hold the content model to the claim registry the rebuild
 * agreed on, using lists kept here rather than read back from the code under
 * test, so the two have to agree instead of one echoing the other.
 *
 * They also cover the media contract the pages are built on: the manifest
 * loader, and the pure "which step is on screen" logic behind the tour.
 */
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
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

const { surfaces, surfaceIds, getSurface, findSurface } = await import(
  "../lib/product/surfaces.ts"
);
const { TAGLINE_MAX, SUMMARY_MAX, docsHref, privacyLabels, groupLabels } = await import(
  "../lib/product/types.ts"
);
const { manifest, captureIds, findCaptureId, getCapture } = await import("../lib/media/index.ts");
const { parseManifest } = await import("../lib/media/parse.ts");
const { activeStepIndex, chapterTimeline, formatSpan, formatTimecode } = await import(
  "../lib/media/step-sync.ts"
);
const { desktopAddress } = await import("../lib/media/address.ts");

const facts = JSON.parse(readFileSync(join(root, "lib/release-facts.json"), "utf8"));

/* ---------------------------------------------------------------------------
 * Oracles. Each list below is copied from the rebuild's shared spec, not
 * derived from lib/product, so a change to the code has to be matched here by
 * someone who has checked it against the product.
 * ------------------------------------------------------------------------- */

/** The claimable surfaces of v1.2.0, in tour order. */
const CLAIMABLE = [
  "chat",
  "compare",
  "agents",
  "research",
  "websearch",
  "documents",
  "memory",
  "notes",
  "mail",
  "calendar",
  "automations",
  "compute",
  "images",
  "themes",
  "coderun",
  "api",
  "signin",
];

/** The pages the docs sync publishes, as slugs under /docs. "" is docs/README.md. */
const DOCS_SLUGS = [
  "",
  "guides/integrations",
  "guides/api-access",
  "reference/api",
  "reference/cli",
  "reference/configuration",
  "operations/deployment",
  "operations/troubleshooting",
  "operations/upgrading",
  "concepts/glossary",
];

/*
 * What v1.2.0 does not ship in its UI, and the words that would claim it.
 * `only` scopes a pattern to the surfaces where the words would be a false
 * claim: Living documents really does export to Word and Compare really does
 * run panes in parallel, so those words are wrong only where listed.
 */
const NOT_CLAIMABLE = [
  {
    claim: "voice input or read-aloud",
    pattern:
      /\b(voice|speech|dictat\w*|read[- ]aloud|text[- ]to[- ]speech|speech[- ]to[- ]text|tts|stt|microphone)\b/i,
  },
  {
    claim: "a text-to-image generation UI",
    pattern:
      /text[- ]to[- ]image|\bimage generation\b|\bgenerat\w+ (an? |new |your )?(image|picture|photo|artwork)s?\b/i,
  },
  {
    // Chat retrieval over an index of the user's files cannot be switched on
    // from the v1.2.0 UI, so the surface was withdrawn and nothing may claim it.
    claim: "answers from an index of your own files",
    pattern:
      /\bRAG\b|\bretriev\w+|\bvector (store|index|search)\b|\bindex(es|ed|ing)? (your|their|the) (own )?(files?|documents?|folders?)\b|\b(answers?|ask\w*|search\w*|chat\w*)\b[^.]*\b(from|over|across|with) your (own )?(files|documents)\b/i,
  },
  {
    claim: "linked-account mirrors in Mail or Calendar",
    pattern: /\b(linked accounts?|connected accounts?|gmail|outlook|icloud|google calendar)\b/i,
  },
  {
    claim: "an approval prompt for each agent tool call",
    pattern:
      /per[- ](tool[- ])?call|\b(approv\w+|confirm\w*|permission|allow or deny)\b[^.]*\b(each|every)\b[^.]*\b(call|command|tool|action|step)\b/i,
  },
  {
    claim: "agents or tasks running concurrently",
    only: ["agents", "automations"],
    pattern: /\b(concurren\w+|in parallel|simultaneous\w*|at the same time|several at once)\b/i,
  },
  {
    claim: "an inline Deep Research toggle in chat",
    only: ["research"],
    pattern: /\btoggle\b/i,
  },
  {
    claim: "something still on the roadmap",
    pattern: /\b(coming soon|roadmap|upcoming|planned|in a future release|not yet)\b/i,
  },
];

/* ------------------------------------------------------------------------- */

/** Every string a page renders for a surface. Evidence is never rendered. */
function copyOf(surface) {
  return [
    surface.name,
    surface.tagline,
    surface.summary,
    ...surface.howTo.flatMap((step) => [step.title, step.detail ?? ""]),
    ...surface.prerequisites,
    surface.privacy.detail,
    surface.teams ?? "",
  ].filter((text) => text !== "");
}

/** The non-claimable capabilities a surface's copy claims, as readable strings. */
function overclaims(surface) {
  const found = [];
  for (const rule of NOT_CLAIMABLE) {
    if (rule.only && !rule.only.includes(surface.id)) continue;
    for (const text of copyOf(surface)) {
      if (rule.pattern.test(text)) found.push(`${surface.id} claims ${rule.claim}: "${text}"`);
    }
  }
  return found;
}

test("surfaces are exactly the claimable set, once each, in tour order", () => {
  assert.deepEqual(
    surfaces.map((surface) => surface.id),
    CLAIMABLE,
  );
  assert.deepEqual([...surfaceIds], CLAIMABLE);
});

test("getSurface is total over the ids and findSurface rejects anything else", () => {
  for (const id of CLAIMABLE) {
    assert.equal(getSurface(id).id, id);
    assert.equal(findSurface(id), getSurface(id));
  }
  assert.equal(findSurface("voice"), null);
  assert.equal(findSurface(""), null);
  assert.throws(() => getSurface("voice"), /no entry for "voice"/);
});

test("every surface is verified on the release the site pins", () => {
  for (const surface of surfaces) assert.equal(surface.verifiedOn, facts.version, surface.id);
});

test("copy fits its slots and every slot is filled", () => {
  for (const surface of surfaces) {
    assert.ok(surface.name.length > 0, `${surface.id}: name`);
    assert.ok(
      surface.tagline.length > 0 && surface.tagline.length <= TAGLINE_MAX,
      `${surface.id}: tagline is ${surface.tagline.length} characters, limit ${TAGLINE_MAX}`,
    );
    assert.ok(
      surface.summary.length > 0 && surface.summary.length <= SUMMARY_MAX,
      `${surface.id}: summary is ${surface.summary.length} characters, limit ${SUMMARY_MAX}`,
    );
    assert.ok(surface.group in groupLabels, `${surface.id}: unknown group ${surface.group}`);
    assert.ok(
      surface.privacy.leaves in privacyLabels,
      `${surface.id}: unknown privacy reach ${surface.privacy.leaves}`,
    );
    assert.ok(surface.privacy.detail.length > 0, `${surface.id}: privacy detail`);
    assert.ok(surface.howTo.length >= 2, `${surface.id}: a how-to needs at least two steps`);
    for (const step of surface.howTo) {
      assert.ok(step.title.length > 0, `${surface.id}: a step has no title`);
    }
  }
  assert.equal(TAGLINE_MAX, 80);
  assert.equal(SUMMARY_MAX, 280);
});

test("every surface records product evidence as path:lines", () => {
  for (const surface of surfaces) {
    assert.ok(surface.evidence.length > 0, `${surface.id}: no evidence`);
    for (const entry of surface.evidence) {
      assert.match(entry, /^[\w./-]+\.\w+:\d+(-\d+)?$/, `${surface.id}: ${entry}`);
    }
  }
});

test("docs links point only at pages the docs sync publishes", () => {
  for (const surface of surfaces) {
    if (surface.docs === null) continue;
    assert.ok(DOCS_SLUGS.includes(surface.docs), `${surface.id}: unknown docs slug ${surface.docs}`);
  }
  assert.equal(docsHref(""), "/docs");
  assert.equal(docsHref("guides/api-access"), "/docs/guides/api-access");
});

test("no surface copy contains a banned string from the release facts", () => {
  assert.ok(facts.banned.length > 0, "the banned list is empty, so this test proves nothing");
  for (const surface of surfaces) {
    for (const text of copyOf(surface)) {
      for (const banned of facts.banned) {
        assert.ok(
          !text.toLowerCase().includes(banned.toLowerCase()),
          `${surface.id} contains banned "${banned}": "${text}"`,
        );
      }
    }
  }
});

test("copy has no emojis and no em or en dashes", () => {
  for (const surface of surfaces) {
    for (const text of copyOf(surface)) {
      assert.doesNotMatch(text, /[\u2013\u2014]/, `${surface.id}: dash in "${text}"`);
      assert.doesNotMatch(text, /\p{Extended_Pictographic}/u, `${surface.id}: emoji in "${text}"`);
    }
  }
});

test("no surface claims a capability v1.2.0 does not ship", () => {
  assert.deepEqual(surfaces.flatMap(overclaims), []);
});

test("no surface says webhooks or contacts belong to one account", () => {
  // Both are instance-wide and admin-managed in v1.2.0; the release notes say otherwise and are wrong.
  for (const id of ["api", "calendar"]) {
    const { teams } = getSurface(id);
    assert.match(teams, /shared across the instance/, id);
  }
  assert.doesNotMatch(getSurface("api").teams, /belong to the account/);
});

test("the overclaim check catches each kind of false claim", () => {
  const base = getSurface("agents");
  const withSummary = (id, summary) => ({ ...getSurface(id), summary });
  const cases = [
    [withSummary("chat", "Dictate a message with your voice."), "voice input or read-aloud"],
    [withSummary("images", "Generate images from a text prompt."), "a text-to-image generation UI"],
    [
      withSummary("chat", "Turn on RAG and get answers from your documents."),
      "answers from an index of your own files",
    ],
    [
      withSummary("memory", "It retrieves passages from a local vector store."),
      "answers from an index of your own files",
    ],
    [withSummary("mail", "See your Gmail inbox beside your chat."), "linked-account mirrors"],
    [
      { ...base, summary: "It asks for your approval before every tool call." },
      "an approval prompt for each agent tool call",
    ],
    [{ ...base, summary: "Run several agents in parallel." }, "running concurrently"],
    [withSummary("research", "Flip the research toggle in chat."), "an inline Deep Research toggle"],
    [withSummary("notes", "Shared notebooks are coming soon."), "still on the roadmap"],
  ];
  for (const [surface, claim] of cases) {
    const found = overclaims(surface);
    assert.ok(
      found.some((message) => message.includes(claim)),
      `expected "${surface.summary}" to be flagged as ${claim}, got ${JSON.stringify(found)}`,
    );
  }
  // Scoped rules do not fire where the words are true.
  assert.deepEqual(overclaims(withSummary("documents", "Export to Word.")), []);
  assert.deepEqual(overclaims(withSummary("compare", "Panes stream in parallel.")), []);
});

test("capture references resolve, and a recording named after a surface is wired to it", () => {
  for (const surface of surfaces) {
    if (surface.capture !== null) {
      assert.ok(captureIds.includes(surface.capture), `${surface.id}: capture not in manifest`);
      assert.equal(getCapture(surface.capture)?.id, surface.capture);
    }
    const recorded = getCapture(surface.id);
    if (recorded !== null) {
      assert.equal(surface.capture, recorded.id, `${surface.id}: its recording exists but is unused`);
    }
  }
});

test("the shipped manifest is pinned to the release and every file it names exists", () => {
  assert.equal(manifest.version, facts.version);
  for (const capture of manifest.captures) {
    const files = [
      capture.poster.avif,
      capture.poster.webp,
      capture.captions,
      ...capture.sources.map((source) => source.src),
    ];
    for (const file of files) {
      assert.ok(existsSync(join(root, "public", file)), `${capture.id}: missing public${file}`);
    }
  }
});

test("a missing capture is null, not an error", () => {
  assert.equal(getCapture(null), null);
  assert.equal(getCapture("no-such-capture"), null);
  assert.equal(findCaptureId("no-such-capture"), null);
});

test("the frame's address is the desktop port from the release facts", () => {
  assert.equal(desktopAddress, `127.0.0.1:${facts.install.desktop_port}`);
});

/* --------------------------------- manifest ------------------------------ */

/** The example manifest from the shared spec, verbatim. */
function specManifest() {
  return {
    version: "v1.2.0",
    theme: "midnight",
    captures: [
      {
        id: "chat",
        title: "Chat with a local model",
        duration: 18.4,
        width: 1280,
        height: 800,
        poster: { avif: "/media/v1.2.0/chat.avif", webp: "/media/v1.2.0/chat.webp" },
        sources: [
          { src: "/media/v1.2.0/chat.webm", type: "video/webm; codecs=vp9" },
          { src: "/media/v1.2.0/chat.mp4", type: "video/mp4; codecs=avc1.640028" },
        ],
        captions: "/media/v1.2.0/chat.vtt",
        steps: [{ at: 0.0, label: "Pick a model" }],
        transcript: "Plain-text description of everything shown.",
      },
    ],
  };
}

test("parseManifest accepts the spec's example and the empty manifest", () => {
  const parsed = parseManifest(specManifest());
  assert.deepEqual(parsed, specManifest());
  assert.deepEqual(parseManifest({ version: "v1.2.0", theme: null, captures: [] }), {
    version: "v1.2.0",
    theme: null,
    captures: [],
  });
});

test("parseManifest rejects a broken manifest and names what is wrong", () => {
  const broken = (mutate) => {
    const raw = specManifest();
    mutate(raw, raw.captures[0]);
    return () => parseManifest(raw);
  };
  assert.throws(
    broken((raw) => (raw.version = "1.2.0")),
    /version: expected a tag like v1\.2\.0/,
  );
  assert.throws(
    broken((raw) => (raw.theme = null)),
    /theme: captures are present/,
  );
  assert.throws(
    broken((raw) => raw.captures.push(structuredClone(raw.captures[0]))),
    /capture "chat": duplicate id/,
  );
  assert.throws(
    broken((_, capture) => (capture.id = "Chat Demo")),
    /captures\[0\]\.id: expected lowercase words/,
  );
  assert.throws(
    broken((_, capture) => (capture.duration = 0)),
    /capture "chat"\.duration: expected a number greater than zero/,
  );
  assert.throws(
    broken((_, capture) => (capture.poster.avif = "/media/v1.1.0/chat.avif")),
    /capture "chat"\.poster\.avif: expected a path under \/media\/v1\.2\.0\//,
  );
  assert.throws(
    broken((_, capture) => (capture.poster.avif = "/media/v1.2.0/../v1.1.0/chat.avif")),
    /capture "chat"\.poster\.avif: expected a path under \/media\/v1\.2\.0\//,
  );
  assert.throws(
    broken((_, capture) => (capture.captions = "/media/v1.2.0//chat.vtt")),
    /capture "chat"\.captions: expected a path under \/media\/v1\.2\.0\//,
  );
  assert.throws(
    broken((_, capture) => (capture.poster.webp = "/media/v1.2.0/chat.png")),
    /poster\.webp: expected a path under \/media\/v1\.2\.0\/ ending in \.webp/,
  );
  assert.throws(
    broken((_, capture) => (capture.sources = [])),
    /capture "chat"\.sources: expected at least one video source/,
  );
  assert.throws(
    broken((_, capture) => (capture.sources[0].type = "image/gif")),
    /sources\[0\]\.type: expected a video MIME type/,
  );
  assert.throws(
    broken((_, capture) => (capture.sources[0].src = "https://cdn.example/chat.webm")),
    /sources\[0\]\.src: expected a path under \/media\/v1\.2\.0\//,
  );
  assert.throws(
    broken((_, capture) => (capture.sources[0].src = "/media/v1.2.0/../v1.1.0/chat.webm")),
    /sources\[0\]\.src: expected a path under \/media\/v1\.2\.0\//,
  );
  assert.throws(
    broken((_, capture) => delete capture.captions),
    /capture "chat"\.captions: expected a non-empty string/,
  );
  assert.throws(
    broken((_, capture) => (capture.steps = [{ at: 19, label: "Past the end" }])),
    /steps\[0\]\.at: expected seconds between 0 and the duration 18\.4/,
  );
  assert.throws(
    broken(
      (_, capture) =>
        (capture.steps = [
          { at: 5, label: "Second" },
          { at: 2, label: "First" },
        ]),
    ),
    /steps\[1\]\.at: steps must be in ascending order/,
  );
  assert.throws(
    broken((_, capture) => (capture.transcript = " ")),
    /capture "chat"\.transcript: expected a non-empty string/,
  );
  assert.throws(() => parseManifest(null), /root: expected an object/);
  assert.throws(() => parseManifest({ version: "v1.2.0", theme: null }), /captures: expected an array/);
});

/* -------------------------------- step sync ------------------------------ */

test("activeStepIndex follows a recording through its steps", () => {
  // A chat capture: pick a model at 0 s, type at 4 s, the reply streams at 9.5 s.
  const cues = [0, 4, 9.5];
  assert.equal(activeStepIndex(cues, 0), 0);
  assert.equal(activeStepIndex(cues, 3.99), 0);
  assert.equal(activeStepIndex(cues, 4), 1, "a step begins exactly on its cue");
  assert.equal(activeStepIndex(cues, 9.49), 1);
  assert.equal(activeStepIndex(cues, 9.5), 2);
  assert.equal(activeStepIndex(cues, 18.4), 2, "the last step holds to the end");
});

test("activeStepIndex has no active step before the first cue", () => {
  assert.equal(activeStepIndex([2, 6], 0), -1);
  assert.equal(activeStepIndex([2, 6], 1.9), -1);
  assert.equal(activeStepIndex([2, 6], 2), 0);
});

test("activeStepIndex has no active step without cues", () => {
  assert.equal(activeStepIndex([], 7), -1);
});

test("activeStepIndex tolerates unsorted and tied cues and bad times", () => {
  assert.equal(activeStepIndex([8, 0, 3], 4), 2, "latest cue at or before the time, not list order");
  assert.equal(activeStepIndex([8, 0, 3], 9), 0);
  assert.equal(activeStepIndex([2, 2], 2), 1, "of two steps on one cue, the later is on screen");
  assert.equal(activeStepIndex([0, 4], Number.NaN), -1);
  assert.equal(activeStepIndex([0, 4], -1), -1);
  assert.equal(activeStepIndex([0, 4], Infinity), -1);
});

test("formatTimecode reads like a player", () => {
  assert.equal(formatTimecode(0), "0:00");
  assert.equal(formatTimecode(4.9), "0:04");
  assert.equal(formatTimecode(18.4), "0:18");
  assert.equal(formatTimecode(75.4), "1:15");
  assert.equal(formatTimecode(-3), "0:00");
  assert.equal(formatTimecode(Number.NaN), "0:00");
});

test("formatSpan says a length of real time in words", () => {
  assert.equal(formatSpan(101), "1 min 41 s");
  assert.equal(formatSpan(45), "45 s");
  assert.equal(formatSpan(120), "2 min");
  assert.equal(formatSpan(59.6), "1 min", "rounds to the nearest second before splitting");
  assert.equal(formatSpan(0), "0 s");
  assert.equal(formatSpan(Number.NaN), "0 s");
});

test("parseManifest keeps realDuration on a shortened recording and rejects a nonsensical one", () => {
  const shortened = specManifest();
  shortened.captures[0].realDuration = 101;
  assert.equal(parseManifest(shortened).captures[0].realDuration, 101);
  assert.equal("realDuration" in parseManifest(specManifest()).captures[0], false);

  const withReal = (value) => {
    const raw = specManifest();
    raw.captures[0].realDuration = value;
    return () => parseManifest(raw);
  };
  // The recording is 18.4 s long; a shortened one took longer than that for real.
  assert.throws(withReal(18.4), /capture "chat"\.realDuration: expected more than the duration 18\.4/);
  assert.throws(withReal(10), /capture "chat"\.realDuration: expected more than the duration 18\.4/);
  assert.throws(withReal("101"), /capture "chat"\.realDuration: expected a number greater than zero/);
  assert.throws(withReal(null), /capture "chat"\.realDuration: expected a number greater than zero/);
});

test("chapterTimeline syncs only the recording's marks and leaves the how-to untimed", () => {
  const howTo = [
    { title: "Pick a model", detail: "Click Select model." },
    { title: "Send a message" },
  ];
  const capture = {
    steps: [
      { at: 0, label: "Model picker opens" },
      { at: 6, label: "Reply streams" },
    ],
  };
  const untimed = [
    { title: "Pick a model", detail: "Click Select model.", at: null },
    { title: "Send a message", at: null },
  ];

  // No recording: nothing is synced and the how-to is a plain list.
  assert.deepEqual(chapterTimeline(howTo, null), { clip: [], guide: untimed });

  // A recording: its own marks are the synced list, the how-to stays plain.
  assert.deepEqual(chapterTimeline(howTo, capture), {
    clip: [
      { title: "Model picker opens", at: 0 },
      { title: "Reply streams", at: 6 },
    ],
    guide: untimed,
  });
});

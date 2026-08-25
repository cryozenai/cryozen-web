#!/usr/bin/env node
/*
 * Verify that a printed pitch deck lost nothing.
 *
 * The print stylesheet pins each slide to a 1280x720 page with `overflow:
 * hidden`, which is what guarantees one slide per page - and what makes an
 * over-full slide fail silently: the page count still comes out right, and the
 * tail of the slide is simply gone. That is not hypothetical. It is how a
 * market slide can ship without the SOM total an investor checks first.
 *
 * So the page count is not the test. This walks the deck data, renders the live
 * route to PDF through headless Chrome, and asserts every string in the data
 * survived onto the page it belongs to.
 *
 * Usage (needs a dev or production server already running):
 *   node scripts/check-deck-print.mjs [baseUrl]
 *
 * Requires Google Chrome and poppler (`brew install poppler`).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { developerDeck } from "../lib/decks/developer.ts";
import { enterpriseDeck } from "../lib/decks/enterprise.ts";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/*
 * Compare word multisets, not phrases.
 *
 * A PDF has no lines, only glyphs at coordinates, and pdftotext linearises them
 * by position. On a two-column row it interleaves the columns, so a phrase that
 * is plainly intact on the page comes back with a figure wedged into the middle
 * of it. Phrase matching flags that as damage; enough of those and the check
 * stops being read, which is how the bug it exists to catch gets to ship.
 *
 * Counting words is immune to reading order and to line breaks, and it still
 * catches a crop, because a dropped row takes its words with it. The count is
 * what keeps it honest: a row reading "Year-3 SOM" is missed by presence alone
 * (both words recur elsewhere on the slide) and caught by multiplicity.
 *
 * Words are squashed to alphanumerics after the split, which absorbs the
 * punctuation the copy carries and the un-hyphenation pdftotext does at a line
 * break ("twelve-month" comes back as "twelvemonth"). It does not absorb a gap
 * pdftotext puts *inside* a word, because the split has already happened by
 * then: a letter-spaced run emitted as "C O N F I D E N T I A L" would read as
 * eleven tokens and report a drop. At the tracking the decks use it does not
 * split them, and squashing the page whole before splitting - the only way to
 * defend against it here - would collapse the multiset this check is built on.
 */
const squash = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

function wordCounts(text) {
  const counts = new Map();
  for (const raw of text.split(/\s+/)) {
    const word = squash(raw);
    if (word) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return counts;
}

/** Fields that describe structure rather than copy; they never reach the page. */
const STRUCTURAL = new Set([
  "kind",
  "id",
  "slug",
  "index",
  "percent",
  "featured",
  "highlight",
  "win",
  "total",
  "unbenchmarked",
  "wide",
  /*
   * The matrix y-axis is set in `writing-mode: vertical-rl`. Chrome draws it
   * correctly and emits no usable text run for it, so it cannot be verified
   * from the text layer - only by looking at the rendered page, which is worth
   * doing whenever that label changes.
   */
  "yLabel",
]);

function copyStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) copyStrings(item, out);
  else if (value && typeof value === "object") {
    /*
     * Two fields render hard against the one before them with no space between:
     * a metric's unit ("266" + "K") and a plan's cadence ("$12" + "/mo"). The
     * page shows one token, so the expectation has to be one token too, or the
     * check reports a drop for something sitting in plain sight.
     */
    if (typeof value.value === "string" && typeof value.unit === "string") {
      const { value: figure, unit, ...rest } = value;
      out.push(`${figure}${unit}`);
      return copyStrings(rest, out);
    }
    if (typeof value.price === "string" && typeof value.priceNote === "string") {
      const { price, priceNote, ...rest } = value;
      out.push(`${price}${priceNote}`);
      return copyStrings(rest, out);
    }
    for (const [key, item] of Object.entries(value)) {
      if (!STRUCTURAL.has(key)) copyStrings(item, out);
    }
  }
  return out;
}

function checkDeck(deck, workDir) {
  const pdf = join(workDir, `${deck.slug}.pdf`);
  execFileSync(CHROME, [
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    "--virtual-time-budget=8000",
    `--print-to-pdf=${pdf}`,
    `${baseUrl}/pitch/${deck.slug}`,
  ]);

  const pages = Number(
    /Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [pdf], { encoding: "utf8" }))?.[1],
  );
  /*
   * The word check reads slide N off page N+1, and that mapping is only valid
   * while the counts agree. A slide that spills onto two pages shifts every
   * slide after it, so continuing here would bury the one true message under a
   * page of drops that are an artefact of the offset, not of lost copy.
   */
  if (pages !== deck.slides.length) {
    return [
      `${deck.slug}: ${pages} pages for ${deck.slides.length} slides` +
        " - a slide spilled its page, so slide-to-page mapping is off and the" +
        " word check was skipped for this deck",
    ];
  }

  const problems = [];
  deck.slides.forEach((slide, position) => {
    const printed = wordCounts(
      execFileSync("pdftotext", ["-f", `${position + 1}`, "-l", `${position + 1}`, pdf, "-"], {
        encoding: "utf8",
      }),
    );
    // Narration is a speaker aid and is hidden in print by design.
    const blocks = (slide.blocks ?? []).filter((block) => block.kind !== "narration");
    const expected = wordCounts(
      copyStrings({ ...slide, blocks }).join(" ").replace(/\*\*|==/g, ""),
    );

    for (const [word, wanted] of expected) {
      const got = printed.get(word) ?? 0;
      if (got < wanted) {
        problems.push(
          `${deck.slug} page ${position + 1} (${slide.id}) dropped "${word}"` +
            ` (${got} of ${wanted} on the page)`,
        );
      }
    }
  });

  return problems;
}

const workDir = mkdtempSync(join(tmpdir(), "cryozen-deck-print-"));
try {
  const problems = [enterpriseDeck, developerDeck].flatMap((deck) => checkDeck(deck, workDir));
  if (problems.length > 0) {
    console.error("Deck print check failed:\n");
    for (const problem of problems) console.error(`  ${problem}`);
    console.error(
      "\nA dropped line means the slide outgrew its 1280x720 page. Cut copy, or" +
        " retune the print scale in app/pitch/deck.css.",
    );
    process.exit(1);
  }
  console.log("Both decks print complete: every line of copy reached its page.");
} finally {
  rmSync(workDir, { recursive: true, force: true });
}

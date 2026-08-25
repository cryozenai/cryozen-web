/*
 * The decks are data, and these are the invariants a reader of the rendered
 * deck would notice broken: a slide that cannot be linked to, a stamp that
 * counts wrong, an emphasis marker left unclosed, and - the one that matters
 * for a fundraise - a market assumption that stops being labelled as ours
 * rather than someone's published figure.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { developerDeck } from "../lib/decks/developer.ts";
import { enterpriseDeck } from "../lib/decks/enterprise.ts";
import { numberedSlideCount } from "../lib/decks/types.ts";

const decks = [enterpriseDeck, developerDeck];

function everyString(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) everyString(item, out);
  else if (value && typeof value === "object") {
    for (const item of Object.values(value)) everyString(item, out);
  }
  return out;
}

for (const deck of decks) {
  test(`${deck.slug}: slide ids are unique and URL-safe`, () => {
    const ids = deck.slides.map((slide) => slide.id);
    assert.equal(new Set(ids).size, ids.length, "duplicate slide id");
    for (const id of ids) assert.match(id, /^[a-z0-9-]+$/);
  });

  test(`${deck.slug}: numbered slides run consecutively from 02`, () => {
    const numbers = deck.slides
      .filter((slide) => slide.kind === "content" && slide.index !== undefined)
      .map((slide) => slide.index);

    assert.deepEqual(
      numbers,
      numbers.map((_, i) => i + 2),
      "numbered slides must be 02, 03, ... with no gaps",
    );
    // The title slide is 01, so the stamp's denominator is the highest number,
    // not how many numbered slides there are.
    assert.equal(numberedSlideCount(deck), numbers.at(-1));
  });

  test(`${deck.slug}: appendix slides are unnumbered and come last`, () => {
    const firstAppendix = deck.slides.findIndex(
      (slide) => slide.kind === "content" && slide.index === undefined,
    );
    assert.notEqual(firstAppendix, -1, "expected at least one appendix slide");
    for (const slide of deck.slides.slice(firstAppendix)) {
      assert.equal(slide.kind === "content" && slide.index, undefined);
    }
  });

  test(`${deck.slug}: emphasis markers are balanced`, () => {
    for (const text of everyString(deck)) {
      const strong = text.match(/\*\*/g)?.length ?? 0;
      const accent = text.match(/==/g)?.length ?? 0;
      assert.equal(strong % 2, 0, `unbalanced ** in: ${text}`);
      assert.equal(accent % 2, 0, `unbalanced == in: ${text}`);
    }
  });

  test(`${deck.slug}: the market model still labels what it cannot source`, () => {
    const market = deck.slides.find((slide) => slide.id === "market");
    const table = market.blocks.find((block) => block.kind === "assumptions");

    // Every row cites something, and the rows that are our own targets say so
    // in the source text as well as through the flag that colours them.
    for (const row of table.rows) {
      assert.ok(row.source.length > 0, `${row.name} has no source`);
      if (row.unbenchmarked) {
        assert.match(row.source, /not a benchmark|settles it/i, `${row.name} is flagged but reads as sourced`);
      }
    }
    assert.ok(
      table.rows.some((row) => row.unbenchmarked),
      "a bottom-up model with nothing flagged is a model nobody checked",
    );
    assert.equal(table.rows.filter((row) => row.total).length, 1, "expected exactly one total row");
    assert.equal(table.rows.at(-1).total, true, "the total belongs last");
  });

  test(`${deck.slug}: every slide with a narration has exactly one`, () => {
    for (const slide of deck.slides) {
      if (slide.kind !== "content") continue;
      const narrations = slide.blocks.filter((block) => block.kind === "narration");
      assert.ok(narrations.length <= 1, `${slide.id} has ${narrations.length} narrations`);
      if (narrations.length === 1) {
        assert.equal(slide.blocks.at(-1), narrations[0], `${slide.id}: narration must come last`);
      }
    }
  });
}

test("the decks are distinct positionings of one company", () => {
  assert.equal(new Set(decks.map((deck) => deck.slug)).size, decks.length);
  assert.equal(new Set(decks.map((deck) => deck.raise)).size, decks.length);
  // The enterprise variant leads: it is the one that matches founder access.
  assert.equal(decks[0].slug, "enterprise");
});

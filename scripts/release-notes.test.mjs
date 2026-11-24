// /changelog renders GitHub's generated release notes, which link pull requests
// and compare views in the private source repo. Those 404 for every visitor, so
// the page must show them as plain text while keeping every other link. The
// notes are rendered here through the same react-markdown pipeline the page
// uses, and the expected URLs are the literal ones in the fixture.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const { rehypeUnlinkPrivateSource } = await import("../lib/release-notes.ts");

const notes = `## What's Changed
* Fix mail sync by @someone in https://github.com/cryozenai/cryozen/pull/119
* Faster search in [#120](https://github.com/cryozenai/cryozen/pull/120)
* Install guide: [channel README](https://github.com/cryozenai/cryozen-releases#readme)

**Full Changelog**: https://github.com/cryozenai/cryozen/compare/v1.1.0...v1.2.0
`;

function render(markdown) {
  return renderToStaticMarkup(
    createElement(
      Markdown,
      { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeUnlinkPrivateSource] },
      markdown,
    ),
  );
}

test("release-note links into the private source repo render as their text", () => {
  const html = render(notes);

  assert.doesNotMatch(html, /href="https:\/\/github\.com\/cryozenai\/cryozen\//);
  assert.match(html, /by @someone in https:\/\/github\.com\/cryozenai\/cryozen\/pull\/119/);
  assert.match(html, /Faster search in #120/);
  assert.match(
    html,
    /<strong>Full Changelog<\/strong>: https:\/\/github\.com\/cryozenai\/cryozen\/compare\/v1\.1\.0\.\.\.v1\.2\.0/,
  );
});

test("release-note links outside the private source repo stay links", () => {
  const html = render(notes);

  assert.equal(html.match(/<a /g)?.length, 1);
  assert.match(
    html,
    /<a href="https:\/\/github\.com\/cryozenai\/cryozen-releases#readme">channel README<\/a>/,
  );
});

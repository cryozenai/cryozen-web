import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { registerHooks } from "node:module";
import { test } from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const mapped = specifier.startsWith("@/")
      ? new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href
      : specifier;
    return nextResolve(mapped, context);
  },
});

const { GET } = await import("../app/changelog/feed.xml/route.ts");
const { breadcrumbJsonLd, JsonLd, softwareApplicationJsonLd } = await import("../lib/seo.ts");

function parseAtom(xml) {
  // Use the CI runner's Python standard library XML parser so malformed XML
  // fails independently of the feed serializer, without adding npm packages.
  return JSON.parse(execFileSync("python3", ["-c", `
import json, sys
from xml.etree import ElementTree

atom = "{http://www.w3.org/2005/Atom}"
root = ElementTree.parse(sys.stdin).getroot()
assert root.tag == atom + "feed"

def describe(element):
    tag = element.tag
    return {
        "tag": tag.removeprefix(atom),
        "attributes": element.attrib,
        "text": element.text or "",
        "children": [describe(child) for child in element],
    }

print(json.dumps(describe(root)))
`], { input: xml, encoding: "utf8" }));
}

// RFC 4287 sections 4.1.1 and 4.1.2 require exactly one of these fields.
function only(parent, tag) {
  const matches = parent.children.filter((child) => child.tag === tag);
  assert.equal(matches.length, 1, `${parent.tag} must have one ${tag}`);
  return matches[0];
}

function link(parent, rel) {
  return only({
    ...parent,
    children: parent.children.filter((child) => child.attributes.rel === rel),
  }, "link").attributes.href;
}

function release(tag, date, fields = {}) {
  return {
    tag_name: tag,
    name: tag,
    body: "",
    published_at: date,
    html_url: "https://github.com/example/releases",
    draft: false,
    prerelease: false,
    assets: [],
    ...fields,
  };
}

test("release GET returns Atom with canonical links and safely escaped notes", async (t) => {
  const title = 'A < B & "quoted"';
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json([
    release("v1.2.0", "2026-08-01T00:00:00Z", {
      name: title,
      body: "## Fixes\n\n**Fast** & safe \x60<a>\x60.\n\n<script>unsafe()</script>",
    }),
    release("v1.3.0/rc+1", "2026-09-01T00:00:00Z", { prerelease: true }),
    release("draft", null, { draft: true }),
  ]));

  const response = await GET();
  assert.equal(fetch.mock.callCount(), 1);
  assert.match(fetch.mock.calls[0].arguments[0], /\/cryozen-releases\/releases\?per_page=20$/);
  assert.equal(fetch.mock.calls[0].arguments[1].next.revalidate, 3600);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^application\/atom\+xml\b/);
  const xml = await response.text();
  const feed = parseAtom(xml);
  const feedUrl = "https://cryozen.ai/changelog/feed.xml";
  assert.equal(only(feed, "id").text, feedUrl);
  assert.equal(only(feed, "title").text, "CryoZen Changelog");
  assert.equal(only(feed, "updated").text, "2026-09-01T00:00:00.000Z");
  assert.equal(only(only(feed, "author"), "name").text, "CryoZen");
  assert.equal(link(feed, "self"), feedUrl);
  assert.equal(link(feed, "alternate"), "https://cryozen.ai/changelog");

  const entries = feed.children.filter(({ tag }) => tag === "entry");
  assert.equal(entries.length, 2);
  for (const [entry, fragment, name, updated] of [
    [entries[0], "v1.2.0", title, "2026-08-01T00:00:00.000Z"],
    [entries[1], "v1.3.0%2Frc%2B1", "v1.3.0/rc+1", "2026-09-01T00:00:00.000Z"],
  ]) {
    const url = `https://cryozen.ai/changelog#${fragment}`;
    assert.equal(only(entry, "id").text, url);
    assert.equal(link(entry, "alternate"), url);
    assert.equal(only(entry, "title").text, name);
    assert.equal(only(entry, "updated").text, updated);
  }

  const content = only(entries[0], "content");
  assert.equal(content.attributes.type, "html");
  assert.equal(content.children.length, 0);
  assert.match(content.text, /^<pre>## Fixes/);
  assert.match(content.text, /\*\*Fast\*\* &amp; safe `&lt;a&gt;`/);
  assert.match(content.text, /&lt;script&gt;unsafe\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(content.text, /<script>/i);
  assert.match(xml, /&lt;pre&gt;## Fixes/);
});

test("unavailable GitHub yields a valid empty feed", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("", { status: 503 }));
  const feed = parseAtom(await (await GET()).text());
  assert.ok(only(feed, "id").text);
  assert.ok(only(feed, "title").text);
  assert.ok(only(only(feed, "author"), "name").text);
  assert.ok(Number.isFinite(Date.parse(only(feed, "updated").text)));
  assert.equal(feed.children.some(({ tag }) => tag === "entry"), false);
});

test("JSON-LD describes the application and only prices the Personal offer", () => {
  const script = JsonLd({ data: softwareApplicationJsonLd() });
  assert.equal(script.type, "script");
  assert.equal(script.props.type, "application/ld+json");
  const data = JSON.parse(script.props.dangerouslySetInnerHTML.__html);
  assert.equal(data["@context"], "https://schema.org");
  assert.equal(data["@type"], "SoftwareApplication");
  assert.equal(data.name, "CryoZen");
  assert.deepEqual(data.operatingSystem, ["macOS", "Windows", "Linux"]);
  assert.equal(data.applicationCategory, "ProductivityApplication");
  assert.deepEqual(data.offers, [
    { "@type": "Offer", name: "Personal", url: "https://cryozen.ai/pricing", price: 0, priceCurrency: "USD" },
    { "@type": "Offer", name: "Team", url: "https://cryozen.ai/pricing" },
    { "@type": "Offer", name: "Enterprise", url: "https://cryozen.ai/pricing" },
  ]);
  assert.equal("aggregateRating" in data, false);
  assert.equal("review" in data, false);
});

test("breadcrumb JSON-LD preserves names without letting text close the script", () => {
  const name = "</script><script>unsafe()</script>";
  const script = JsonLd({
    data: breadcrumbJsonLd([{ name: "Home", path: "/" }, { name, path: "/security" }]),
  });
  const json = script.props.dangerouslySetInnerHTML.__html;
  assert.doesNotMatch(json, /</);
  assert.match(json, /\\u003c/);
  assert.deepEqual(JSON.parse(json), {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", name: "Home", item: "https://cryozen.ai/", position: 1 },
      { "@type": "ListItem", name, item: "https://cryozen.ai/security", position: 2 },
    ],
  });
});

import { getReleases } from "@/lib/releases";
import { site } from "@/lib/site";

export const revalidate = 3600;

const changelogUrl = new URL("/changelog", site.url).href;
const feedUrl = `${changelogUrl}/feed.xml`;
const emptyFeedDate = "1970-01-01T00:00:00.000Z";

function escapeXml(value: string) {
  // XML 1.0 only permits these code points, even as character references.
  return value
    .replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const releases = await getReleases(20);
  let feedUpdated = emptyFeedDate;
  const entries = releases.map((release) => {
    const timestamp = Date.parse(release.publishedAt ?? "");
    const updated = Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : emptyFeedDate;
    if (updated > feedUpdated) feedUpdated = updated;

    const url = escapeXml(`${changelogUrl}#${encodeURIComponent(release.tag)}`);
    // Escape for the reader's HTML parser, then again for the Atom XML parser.
    const notes = `<pre>${escapeXml(release.body)}</pre>`;

    return `<entry>
  <id>${url}</id>
  <title>${escapeXml(release.name)}</title>
  <updated>${updated}</updated>
  <link rel="alternate" href="${url}"/>
  <content type="html">${escapeXml(notes)}</content>
</entry>`;
  });

  return new Response(`<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${feedUrl}</id>
  <title>${site.name} Changelog</title>
  <updated>${feedUpdated}</updated>
  <author><name>${site.name}</name></author>
  <link rel="self" href="${feedUrl}"/>
  <link rel="alternate" href="${changelogUrl}"/>
  ${entries.join("\n  ")}
</feed>
`, { headers: { "Content-Type": "application/atom+xml; charset=utf-8" } });
}

#!/usr/bin/env node
// Crawls a running copy of the site and fetches every external link the way an
// anonymous visitor would: no token, no cookies. The product repository is
// private, so a link into it answers 404 here even though it works for anyone
// signed in as an owner, which is how those links shipped in the first place.
//
// Usage: node scripts/check-links.mjs <base-url>
import { pathToFileURL } from "node:url";

const USER_AGENT = "cryozen-web-link-check";
const TIMEOUT_MS = 30_000;
const CONCURRENCY = 6;
const ATTEMPTS = 3;
const RETRY_DELAY_MS = 1_500;

/** The pitch decks are unlisted, so the sitemap and nav cannot lead to them. */
const UNLISTED_START_PATHS = ["/pitch"];

function hrefsIn(html) {
  const hrefs = [];
  for (const match of html.matchAll(/<a\b[^>]*?\bhref="([^"]+)"/g)) {
    hrefs.push(match[1].replaceAll("&amp;", "&"));
  }
  return hrefs;
}

function locsIn(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

async function fetchOnce(url) {
  // GET, not HEAD: GitHub's release download redirects and some hosts answer
  // HEAD differently. The body is dropped unread, so an installer is not fetched.
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  await response.body?.cancel();
  return response.status;
}

/** A link's verdict: ok, broken, or inconclusive when the host rate limited us. */
export async function checkExternal(url, { retryDelayMs = RETRY_DELAY_MS } = {}) {
  let last = "";
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const status = await fetchOnce(url);
      if (status === 200) return { url, verdict: "ok", detail: "200" };
      last = String(status);
      // A 404 is an answer. Only rate limits and server errors are worth retrying.
      if (status !== 429 && status < 500) return { url, verdict: "broken", detail: last };
    } catch (error) {
      last = error.cause?.code ?? error.name ?? "network error";
    }
    if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
  // 429 says nothing about the link, so it cannot fail a build by itself. It is
  // still reported, so a check that verified nothing is visible as such.
  const verdict = last === "429" ? "inconclusive" : "broken";
  return { url, verdict, detail: last };
}

/** Every page reachable from the sitemap and unlisted roots, and its external links. */
export async function crawl(baseUrl) {
  const base = new URL(baseUrl);
  const sitemap = await fetch(new URL("/sitemap.xml", base));
  if (sitemap.status !== 200) throw new Error(`/sitemap.xml answered ${sitemap.status}`);
  const start = locsIn(await sitemap.text()).map((loc) => new URL(loc).pathname);

  const queue = [...new Set([...start, ...UNLISTED_START_PATHS])];
  const seen = new Set(queue);
  const pages = new Map();
  const external = new Map();

  while (queue.length > 0) {
    const path = queue.shift();
    const response = await fetch(new URL(path, base));
    const html = await response.text();
    pages.set(path, response.status);
    if (response.status !== 200) continue;
    for (const href of hrefsIn(html)) {
      if (!/^(https?:|\/)/.test(href)) continue; // mailto:, tel:, and in-page anchors
      const target = new URL(href, base);
      if (target.origin === base.origin) {
        if (!seen.has(target.pathname)) {
          seen.add(target.pathname);
          queue.push(target.pathname);
        }
      } else {
        if (!external.has(target.href)) external.set(target.href, new Set());
        external.get(target.href).add(path);
      }
    }
  }
  return { pages, external };
}

export async function checkSite(baseUrl, options) {
  const { pages, external } = await crawl(baseUrl);
  const pending = [...external.keys()];
  const results = [];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (pending.length > 0) results.push(await checkExternal(pending.shift(), options));
    }),
  );
  return {
    brokenPages: [...pages].filter(([, status]) => status !== 200),
    brokenLinks: results
      .filter((result) => result.verdict === "broken")
      .map((result) => ({ ...result, foundOn: [...external.get(result.url)] })),
    inconclusive: results.filter((result) => result.verdict === "inconclusive"),
    pageCount: pages.size,
    linkCount: results.length,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const baseUrl = process.argv[2];
  if (!baseUrl) {
    console.error("usage: check-links.mjs <base-url>");
    process.exit(2);
  }
  const report = await checkSite(baseUrl);
  for (const [path, status] of report.brokenPages) console.error(`page ${path}: ${status}`);
  for (const { url, detail, foundOn } of report.brokenLinks) {
    console.error(`link ${url}: ${detail} (on ${foundOn.join(", ")})`);
  }
  for (const { url } of report.inconclusive) console.warn(`inconclusive, rate limited: ${url}`);
  console.log(
    `${report.pageCount} pages, ${report.linkCount} external links: ` +
      `${report.brokenPages.length} broken pages, ${report.brokenLinks.length} broken links, ` +
      `${report.inconclusive.length} inconclusive`,
  );
  if (report.brokenPages.length > 0 || report.brokenLinks.length > 0) process.exit(1);
}

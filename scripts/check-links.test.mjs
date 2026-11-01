// The checker only earns its place by failing, so its failing branches run here
// against real local servers: one plays the site, the other an external host.
import { strict as assert } from "node:assert";
import { createServer } from "node:http";
import { after, before, test } from "node:test";

import { checkExternal, checkSite } from "./check-links.mjs";

const servers = [];

function serve(handler) {
  return new Promise((resolve) => {
    const server = createServer(handler);
    servers.push(server);
    server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

after(() => {
  for (const server of servers) server.close();
});

let host;
let hits;

before(async () => {
  hits = 0;
  host = await serve((request, response) => {
    if (request.url === "/flaky") {
      hits += 1;
      response.writeHead(hits < 2 ? 503 : 200).end();
    } else if (request.url === "/moved") {
      response.writeHead(302, { location: "/ok" }).end();
    } else {
      const status = { "/ok": 200, "/private": 404, "/limited": 429 }[request.url] ?? 500;
      response.writeHead(status).end();
    }
  });
});

function site(pages) {
  return serve((request, response) => {
    if (request.url === "/sitemap.xml") {
      response.end("<urlset><url><loc>https://cryozen.ai/</loc></url></urlset>");
    } else if (request.url in pages) {
      response.end(pages[request.url]);
    } else {
      response.writeHead(404).end();
    }
  });
}

const fast = { retryDelayMs: 1 };

test("a private repository link, which answers 404 anonymously, fails the check", async () => {
  const base = await site({
    "/": `<a href="${host}/ok">fine</a><a class="x" href="${host}/private">source</a>`,
    "/pitch": "",
  });

  const report = await checkSite(base, fast);

  assert.deepEqual(
    report.brokenLinks.map((link) => [link.url, link.detail, link.foundOn]),
    [[`${host}/private`, "404", ["/"]]],
  );
});

test("links on a page reached only through an internal link are checked", async () => {
  const base = await site({
    "/": `<a href="/deep">deep</a>`,
    "/deep": `<a href="${host}/private">source</a>`,
    "/pitch": "",
  });

  const report = await checkSite(base, fast);

  assert.deepEqual(report.brokenLinks[0].foundOn, ["/deep"]);
  assert.equal(report.pageCount, 3);
});

test("unlisted decks are crawled, and an internal link to a missing page fails", async () => {
  const base = await site({
    "/": "",
    "/pitch": `<a href="/pitch/gone">deck</a><a href="${host}/private">x</a>`,
  });

  const report = await checkSite(base, fast);

  assert.deepEqual(report.brokenPages, [["/pitch/gone", 404]]);
  assert.equal(report.brokenLinks.length, 1);
});

test("mailto links are ignored and a clean site reports nothing", async () => {
  const base = await site({
    "/": `<a href="mailto:hello@cryozen.ai">mail</a><a href="${host}/moved">redirected</a>`,
    "/pitch": "",
  });

  const report = await checkSite(base, fast);

  assert.deepEqual(report.brokenLinks, []);
  assert.deepEqual(report.brokenPages, []);
  assert.equal(report.linkCount, 1);
});

test("a rate limit is inconclusive rather than broken, a server error is retried", async () => {
  assert.equal((await checkExternal(`${host}/limited`, fast)).verdict, "inconclusive");
  assert.equal((await checkExternal(`${host}/flaky`, fast)).verdict, "ok");
  assert.equal(hits, 2);
});

test("a host that cannot be reached is broken", async () => {
  const result = await checkExternal("http://127.0.0.1:1/", fast);

  assert.equal(result.verdict, "broken");
  assert.notEqual(result.detail, "");
});

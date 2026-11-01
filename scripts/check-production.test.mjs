// Runs the whole check against local servers standing in for the site and the
// GitHub API, because the case that matters is the one where production differs.
import { strict as assert } from "node:assert";
import { createServer } from "node:http";
import { after, test } from "node:test";

import { checkProduction } from "./check-production.mjs";

const servers = [];

function serveJson(path, body, status = 200) {
  return new Promise((resolve) => {
    const server = createServer((request, response) => {
      response.writeHead(request.url === path ? status : 404);
      response.end(JSON.stringify(body));
    });
    servers.push(server);
    server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

after(() => {
  for (const server of servers) server.close();
});

const NOW = Date.parse("2026-11-01T12:00:00Z");
const OLD = "2026-10-01T12:00:00Z";
const RECENT = "2026-11-01T11:50:00Z";

async function run({ deployed, main = "aaa", mainDate = OLD, siteStatus = 200 }) {
  const siteUrl = await serveJson("/version.json", { commit: deployed }, siteStatus);
  const api = await serveJson("/main", { sha: main, commit: { committer: { date: mainDate } } });
  return checkProduction({ siteUrl, mainApi: `${api}/main`, token: "", now: NOW });
}

test("passes when production serves main's commit", async () => {
  assert.equal((await run({ deployed: "aaa" })).ok, true);
});

test("fails when production serves an older commit", async () => {
  const result = await run({ deployed: "bbb" });

  assert.equal(result.ok, false);
  assert.match(result.message, /bbb.*aaa/);
});

test("fails when production does not report a commit", async () => {
  assert.equal((await run({ deployed: null })).ok, false);
});

test("allows a just-merged main time to go live, then stops allowing it", async () => {
  assert.equal((await run({ deployed: "bbb", mainDate: RECENT })).ok, true);
  assert.equal((await run({ deployed: "bbb", mainDate: "2026-11-01T11:00:00Z" })).ok, false);
});

test("an unreachable version endpoint is an error, not a pass", async () => {
  await assert.rejects(run({ deployed: "aaa", siteStatus: 404 }), /answered 404/);
});

#!/usr/bin/env node
// Fails when production is not serving main. Vercel stopped deploying this site
// for 68 days after the repository moved to the cryozenai organisation and
// nothing noticed, because a deployment that never starts cannot fail.
//
// Usage: node scripts/check-production.mjs
import { pathToFileURL } from "node:url";

const SITE_URL = "https://cryozen.ai";
const MAIN_COMMIT_API = "https://api.github.com/repos/cryozenai/cryozen-web/commits/main";
/** A merge takes a few minutes to go live, so a very new main is not drift. */
const GRACE_MS = 30 * 60 * 1000;

async function readJson(url, headers = {}) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
  if (response.status !== 200) throw new Error(`${url} answered ${response.status}`);
  return response.json();
}

export function compare({ deployed, main, mainDate, now }) {
  if (!deployed) {
    return { ok: false, message: `production does not report its commit; main is ${main}` };
  }
  if (deployed === main) return { ok: true, message: `production is on main (${main})` };
  const age = now - new Date(mainDate).getTime();
  if (age < GRACE_MS) {
    return { ok: true, message: `main (${main}) is ${Math.round(age / 60000)}m old, not live yet` };
  }
  return { ok: false, message: `production is on ${deployed}, main is ${main}` };
}

export async function checkProduction({
  siteUrl = SITE_URL,
  mainApi = MAIN_COMMIT_API,
  token = process.env.GITHUB_TOKEN,
  now = Date.now(),
} = {}) {
  const { commit: deployed } = await readJson(new URL("/version.json", siteUrl));
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  const { sha: main, commit } = await readJson(mainApi, headers);
  return compare({ deployed, main, mainDate: commit.committer.date, now });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { ok, message } = await checkProduction();
    (ok ? console.log : console.error)(message);
    process.exit(ok ? 0 : 1);
  } catch (error) {
    console.error(`could not compare production with main: ${error.message}`);
    process.exit(1);
  }
}

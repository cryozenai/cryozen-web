import { writeFile } from "node:fs/promises";

const channel = "https://raw.githubusercontent.com/cryozenai/cryozen-releases/main";

async function fetchText(path) {
  const url = `${channel}/${path}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    throw new Error(`Could not fetch ${path}: HTTP ${response.status} from ${url}`);
  }
  return response.text();
}

const [facts, compose] = await Promise.all([fetchText("facts.json"), fetchText("docker-compose.yml")]);
JSON.parse(facts);
if (!/^services:\s*$/m.test(compose)) {
  throw new Error("docker-compose.yml from the release channel has no top-level services key");
}
await writeFile(new URL("../lib/release-facts.json", import.meta.url), facts);
await writeFile(new URL("../lib/release-compose.yml", import.meta.url), compose);
console.log("Updated lib/release-facts.json and lib/release-compose.yml");

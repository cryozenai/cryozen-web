import { writeFile } from "node:fs/promises";

const upstream = "https://raw.githubusercontent.com/cryozenai/cryozen-releases/main/facts.json";
const destination = new URL("../lib/release-facts.json", import.meta.url);

const response = await fetch(upstream, { signal: AbortSignal.timeout(15_000) });
if (!response.ok) {
  throw new Error(`Could not fetch release facts: HTTP ${response.status} from ${upstream}`);
}

const contents = await response.text();
JSON.parse(contents);
await writeFile(destination, contents);
console.log("Updated lib/release-facts.json");

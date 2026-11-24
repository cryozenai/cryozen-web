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

const treeUrl = "https://api.github.com/repos/cryozenai/cryozen-releases/git/trees/main?recursive=1";

async function fetchChannelFiles() {
  const response = await fetch(treeUrl, {
    headers: { Accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Could not list release channel files: HTTP ${response.status} from ${treeUrl}`);
  }
  const tree = await response.json();
  if (tree.truncated) {
    throw new Error("The release channel file list came back truncated");
  }
  return tree.tree.filter((entry) => entry.type === "blob").map((entry) => entry.path).sort();
}

const [facts, compose, channelFiles] = await Promise.all([
  fetchText("facts.json"),
  fetchText("docker-compose.yml"),
  fetchChannelFiles(),
]);
JSON.parse(facts);
if (!/^services:\s*$/m.test(compose)) {
  throw new Error("docker-compose.yml from the release channel has no top-level services key");
}
if (!channelFiles.includes("docker-compose.yml")) {
  throw new Error("The release channel file list does not include docker-compose.yml");
}
await writeFile(new URL("../lib/release-facts.json", import.meta.url), facts);
await writeFile(new URL("../lib/release-compose.yml", import.meta.url), compose);
await writeFile(
  new URL("../lib/release-channel-files.json", import.meta.url),
  `${JSON.stringify(channelFiles, null, 2)}\n`,
);
console.log("Updated lib/release-facts.json, lib/release-compose.yml, and lib/release-channel-files.json");

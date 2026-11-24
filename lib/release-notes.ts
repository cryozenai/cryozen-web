import type { Element, Root, RootContent } from "hast";
import releaseFacts from "./release-facts.json" with { type: "json" };

/**
 * Release notes are GitHub's generated text, copied verbatim into the public
 * channel, so they link pull requests, commits, and compare views in the
 * private source repo. Those answer 404 to every visitor. This is a rehype
 * plugin for react-markdown that turns any link into that repo into its plain
 * visible text, and leaves every other link alone.
 */
export function rehypeUnlinkPrivateSource() {
  return (tree: Root) => unlinkIn(tree);
}

const [sourceOwner, sourceRepo] = releaseFacts.repos.source.toLowerCase().split("/");

function isPrivateSourceUrl(href: unknown): boolean {
  if (typeof href !== "string") return false;
  const url = URL.parse(href);
  if (url === null || url.hostname.toLowerCase() !== "github.com") return false;
  const [owner, repo] = url.pathname.split("/").slice(1).map((part) => part.toLowerCase());
  return owner === sourceOwner && repo === sourceRepo;
}

function unlinkIn(parent: Root | Element): void {
  const children: RootContent[] = [];
  for (const child of parent.children) {
    if (child.type !== "element") {
      children.push(child);
      continue;
    }
    unlinkIn(child);
    if (child.tagName === "a" && isPrivateSourceUrl(child.properties.href)) {
      children.push(...child.children);
    } else {
      children.push(child);
    }
  }
  parent.children = children as typeof parent.children;
}

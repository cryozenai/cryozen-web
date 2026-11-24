export interface TocItem {
  level: 2 | 3;
  text: string;
  id: string;
}

interface MdastNode {
  type: string;
  depth?: number;
  value?: string;
  children?: MdastNode[];
  data?: {
    hProperties?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

/**
 * Normalizes heading text into a GitHub-compatible anchor ID.
 * Keeps Unicode letters/digits, spaces, and hyphens, then converts spaces to `-`.
 */
export function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

export function createSlugger() {
  const counts = new Map<string, number>();
  return (text: string): string => {
    const base = slugifyHeading(text) || "section";
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen}`;
  };
}

function mdastToText(node: MdastNode): string {
  if (typeof node.value === "string") return node.value;
  if (!Array.isArray(node.children)) return "";
  return node.children.map(mdastToText).join("");
}

function walkMdast(node: MdastNode, visit: (current: MdastNode) => void) {
  visit(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      walkMdast(child, visit);
    }
  }
}

/**
 * Remark plugin that assigns deterministic GitHub-style `id` attributes to all
 * markdown headings so rendered anchors match `extractToc` without mutable React state.
 */
export function remarkHeadingIds() {
  return (tree: MdastNode) => {
    const slug = createSlugger();
    walkMdast(tree, (node) => {
      if (node.type !== "heading") return;
      const depth = node.depth ?? 0;
      if (depth < 1 || depth > 6) return;
      const id = slug(mdastToText(node));
      node.data = {
        ...node.data,
        hProperties: {
          ...(node.data?.hProperties ?? {}),
          id,
        },
      };
    });
  };
}

function stripInlineMarkdown(raw: string): string {
  return raw
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__|\*|_|~~)/g, "")
    .trim();
}

/**
 * Extracts h2 and h3 headings for the on-page table of contents using the same
 * slug sequence as `remarkHeadingIds`.
 */
export function extractToc(markdown: string): TocItem[] {
  const slug = createSlugger();
  const items: TocItem[] = [];
  const lines = markdown.split(/\r?\n/);
  let inFence = false;
  let fenceChar = "";

  for (const line of lines) {
    const fence = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence) {
      const ch = fence[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = ch;
      } else if (ch === fenceChar) {
        inFence = false;
        fenceChar = "";
      }
      continue;
    }
    if (inFence) continue;

    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const level = match[1].length;
    const text = stripInlineMarkdown(match[2].replace(/\s+#+\s*$/, ""));
    const id = slug(text);
    if (level === 2 || level === 3) {
      items.push({ level, text, id });
    }
  }

  return items;
}

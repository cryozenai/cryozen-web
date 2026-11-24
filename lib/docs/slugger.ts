import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

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
 * Keeps Unicode letters/digits, `_`, spaces, and hyphens, then converts spaces to `-`.
 */
export function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/g, "-");
}

function createSlugger() {
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

/** Parses markdown with the same remark plugins `DocsMarkdown` renders with. */
function parseDocMarkdown(markdown: string): MdastNode {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkHeadingIds);
  return processor.runSync(processor.parse(markdown)) as MdastNode;
}

/**
 * Extracts h2 and h3 headings for the on-page table of contents, taking each
 * heading's text and `id` from the same parse `remarkHeadingIds` annotates.
 */
export function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  walkMdast(parseDocMarkdown(markdown), (node) => {
    if (node.type !== "heading" || (node.depth !== 2 && node.depth !== 3)) return;
    const id = node.data?.hProperties?.id;
    if (typeof id !== "string") return;
    items.push({ level: node.depth, text: mdastToText(node), id });
  });
  return items;
}

/** Returns the plain text of the first top-level paragraph, or "" when there is none. */
export function extractLeadParagraph(markdown: string): string {
  const paragraph = parseDocMarkdown(markdown).children?.find((node) => node.type === "paragraph");
  return paragraph ? mdastToText(paragraph).replace(/\s+/g, " ").trim() : "";
}

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractLeadParagraph, extractToc, type TocItem } from "./slugger";

export interface DocLink {
  slug: string;
  href: string;
  title: string;
}

export interface DocNavGroup {
  label: string;
  items: DocLink[];
}

export interface DocEntry {
  slug: string;
  href: string;
  title: string;
  description: string;
  category: string;
  source: string;
  ref: string;
  commit: string;
  body: string;
  toc: TocItem[];
}

interface DocManifestItem {
  slug: string;
  navTitle: string;
  category: "Overview" | "Guides" | "Reference" | "Operations" | "Concepts";
}

const DOC_ORDER: readonly DocManifestItem[] = [
  { slug: "", navTitle: "Overview", category: "Overview" },
  { slug: "guides/integrations", navTitle: "Integrations", category: "Guides" },
  { slug: "guides/api-access", navTitle: "Calling the API", category: "Guides" },
  { slug: "reference/configuration", navTitle: "Configuration", category: "Reference" },
  { slug: "reference/api", navTitle: "API reference", category: "Reference" },
  { slug: "reference/cli", navTitle: "CLI reference", category: "Reference" },
  { slug: "operations/deployment", navTitle: "Deployment", category: "Operations" },
  { slug: "operations/upgrading", navTitle: "Upgrading", category: "Operations" },
  { slug: "operations/troubleshooting", navTitle: "Troubleshooting", category: "Operations" },
  { slug: "concepts/glossary", navTitle: "Glossary", category: "Concepts" },
];

const CONTENT_DIR = join(process.cwd(), "content", "docs");

export function hrefForSlug(slug: string): string {
  return slug === "" ? "/docs" : `/docs/${slug}`;
}

function filePathForSlug(slug: string): string {
  return slug === "" ? join(CONTENT_DIR, "index.md") : join(CONTENT_DIR, `${slug}.md`);
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) {
    return { meta: {}, body: raw };
  }
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([a-zA-Z0-9_-]+):\s*(.+?)\s*$/.exec(line);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      try {
        val = JSON.parse(val);
      } catch {
        val = val.slice(1, -1);
      }
    }
    meta[key] = val;
  }
  return { meta, body: match[2] };
}

function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^#\s+.+?\r?\n+/, "");
}

function extractDescription(markdown: string, fallback: string): string {
  const plain = extractLeadParagraph(markdown);
  if (!plain) return fallback;
  return plain.length > 160 ? `${plain.slice(0, 157).trimEnd()}...` : plain;
}

function loadDoc(item: DocManifestItem): DocEntry {
  const raw = readFileSync(filePathForSlug(item.slug), "utf8");
  const { meta, body: rawBody } = parseFrontmatter(raw);
  const body = stripLeadingH1(rawBody);
  const title = meta.title || item.navTitle;
  const description = extractDescription(body, `${title} - CryoZen documentation.`);
  return {
    slug: item.slug,
    href: hrefForSlug(item.slug),
    title,
    description,
    category: item.category === "Overview" ? "Documentation" : item.category,
    source: meta.source || "",
    ref: meta.ref || "v1.2.0",
    commit: meta.commit || "",
    body,
    toc: extractToc(body),
  };
}

let cachedDocs: DocEntry[] | null = null;

export function getAllDocs(): DocEntry[] {
  if (!cachedDocs) {
    cachedDocs = DOC_ORDER.map(loadDoc);
  }
  return cachedDocs;
}

export function getDocBySlug(slug: string): DocEntry | undefined {
  return getAllDocs().find((doc) => doc.slug === slug);
}

export function getDocNavGroups(): { overview: DocLink; groups: DocNavGroup[] } {
  const groupNames: Array<"Guides" | "Reference" | "Operations" | "Concepts"> = [
    "Guides",
    "Reference",
    "Operations",
    "Concepts",
  ];
  const overviewItem = DOC_ORDER[0];
  return {
    overview: {
      slug: overviewItem.slug,
      href: hrefForSlug(overviewItem.slug),
      title: overviewItem.navTitle,
    },
    groups: groupNames.map((name) => ({
      label: name,
      items: DOC_ORDER.filter((item) => item.category === name).map((item) => ({
        slug: item.slug,
        href: hrefForSlug(item.slug),
        title: item.navTitle,
      })),
    })),
  };
}

export function getDocNeighbors(slug: string): { prev: DocLink | null; next: DocLink | null } {
  const index = DOC_ORDER.findIndex((item) => item.slug === slug);
  if (index === -1) return { prev: null, next: null };
  const toLink = (item: DocManifestItem | undefined): DocLink | null =>
    item
      ? {
          slug: item.slug,
          href: hrefForSlug(item.slug),
          title: getDocBySlug(item.slug)?.title ?? item.navTitle,
        }
      : null;

  return {
    prev: index > 0 ? toLink(DOC_ORDER[index - 1]) : null,
    next: index < DOC_ORDER.length - 1 ? toLink(DOC_ORDER[index + 1]) : null,
  };
}

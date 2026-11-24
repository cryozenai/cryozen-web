import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocsMarkdown } from "@/components/docs/markdown";
import { DocsSidebar } from "@/components/docs/sidebar";
import { DocsToc } from "@/components/docs/toc";
import { Container, Eyebrow } from "@/components/ui";
import {
  getAllDocs,
  getDocBySlug,
  getDocNavGroups,
  getDocNeighbors,
} from "@/lib/docs";
import { site } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllDocs().map((doc) => ({
    slug: doc.slug === "" ? [] : doc.slug.split("/"),
  }));
}

export async function generateMetadata(
  props: PageProps<"/docs/[[...slug]]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const doc = getDocBySlug(slug?.join("/") ?? "");
  if (!doc) return {};

  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: doc.href },
    openGraph: {
      title: `${doc.title} - ${site.name}`,
      description: doc.description,
      url: `${site.url}${doc.href}`,
    },
  };
}

export default async function DocsPage(props: PageProps<"/docs/[[...slug]]">) {
  const { slug } = await props.params;
  const doc = getDocBySlug(slug?.join("/") ?? "");
  if (!doc) notFound();

  const { overview, groups } = getDocNavGroups();
  const { prev, next } = getDocNeighbors(doc.slug);

  return (
    <Container className="max-w-7xl py-10 sm:py-14">
      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_200px] xl:gap-10">
        <DocsSidebar
          overview={overview}
          groups={groups}
          currentHref={doc.href}
          currentTitle={doc.title}
        />

        <article className="min-w-0">
          <header className="border-b border-hairline pb-6">
            <Eyebrow>{doc.category}</Eyebrow>
            <h1 className="text-flame mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {doc.title}
            </h1>
          </header>

          <div className="mt-6">
            <DocsMarkdown content={doc.body} />
          </div>

          <nav
            aria-label="Previous and next pages"
            className="mt-12 grid gap-4 border-t border-hairline pt-6 sm:grid-cols-2"
          >
            {prev ? (
              <Link
                href={prev.href}
                className="panel group rounded-xl p-4 transition-colors duration-150 hover:border-primary/50"
              >
                <span className="block text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
                  Previous
                </span>
                <span className="mt-1 block text-sm font-medium text-core group-hover:text-primary">
                  &larr; {prev.title}
                </span>
              </Link>
            ) : (
              <div />
            )}

            {next ? (
              <Link
                href={next.href}
                className="panel group rounded-xl p-4 text-right transition-colors duration-150 hover:border-primary/50"
              >
                <span className="block text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
                  Next
                </span>
                <span className="mt-1 block text-sm font-medium text-core group-hover:text-primary">
                  {next.title} &rarr;
                </span>
              </Link>
            ) : (
              <div />
            )}
          </nav>

          <footer className="mt-8 border-t border-hairline/70 pt-5 text-xs text-muted">
            Synced from CryoZen {doc.ref}
          </footer>
        </article>

        <DocsToc items={doc.toc} />
      </div>
    </Container>
  );
}

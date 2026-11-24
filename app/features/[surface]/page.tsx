import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Ledger, monoLabel, Wide } from "@/components/home/primitives";
import { SurfaceFrame } from "@/components/home/surface-frame";
import { SyncedCapture } from "@/components/home/synced-capture";
import { SinglePlayback } from "@/components/home/single-playback";
import { ArrowIcon } from "@/components/icons";
import { ButtonLink, Card, textLink } from "@/components/ui";
import { extraCaptures, featurePage, ledgerKey } from "@/lib/home/copy";
import { relatedSurfaces, tourNeighbors } from "@/lib/home/derive";
import { getCapture } from "@/lib/media/index";
import type { Capture } from "@/lib/media/types";
import { findSurface, surfaceIds, surfaces } from "@/lib/product/surfaces";
import { docsHref, groupLabels, privacyLabels } from "@/lib/product/types";
import type { Surface } from "@/lib/product/types";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return surfaceIds.map((surface) => ({ surface }));
}

/** Only the claimable surfaces have a page; any other id is a 404, not a rendered miss. */
export const dynamicParams = false;

export async function generateMetadata(
  props: PageProps<"/features/[surface]">,
): Promise<Metadata> {
  const { surface: id } = await props.params;
  const surface = findSurface(id);
  if (!surface) return {};

  return {
    title: surface.name,
    description: surface.summary,
    alternates: { canonical: `/features/${surface.id}` },
    openGraph: {
      title: `${surface.name} - ${site.name}`,
      description: surface.tagline,
      url: `${site.url}/features/${surface.id}`,
    },
  };
}

const blockHeading = `${monoLabel} text-primary`;

function HowTo({ surface }: { surface: Surface }) {
  return (
    <div>
      <h2 className={blockHeading}>{featurePage.howTo}</h2>
      <ol className="mt-4 border-t border-hairline">
        {surface.howTo.map((step, index) => (
          <li
            key={step.title}
            className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 border-b border-hairline py-4"
          >
            <span aria-hidden="true" className="font-mono text-[0.8125rem]/7 font-medium text-primary">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="text-base/7 font-semibold text-core">{step.title}</h3>
              {step.detail ? (
                <p className="mt-0.5 text-[0.9375rem]/6 text-ink text-pretty">{step.detail}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** What it needs and what changes for a team. What leaves the machine is in the page header. */
function facts(surface: Surface): { title: string; body: ReactNode }[] {
  return [
    {
      title: featurePage.prerequisites,
      body:
        surface.prerequisites.length > 0 ? (
          <ul className="space-y-2">
            {surface.prerequisites.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden="true" className="mt-2.5 size-1 shrink-0 rounded-full bg-primary" />
                <span className="text-pretty">{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>{featurePage.noPrerequisites}</p>
        ),
    },
    {
      title: featurePage.teams,
      body: <p className="text-pretty">{surface.teams ?? featurePage.noTeams}</p>,
    },
  ];
}

function Recording({ capture, priority }: { capture: Capture; priority?: boolean }) {
  return <SyncedCapture capture={capture} stepsLabel={featurePage.recording} priority={priority} />;
}

export default async function FeaturePage(props: PageProps<"/features/[surface]">) {
  const { surface: id } = await props.params;
  const surface = findSurface(id);
  if (!surface) notFound();

  const capture = getCapture(surface.capture);
  const extras = (extraCaptures[surface.id] ?? [])
    .map((extra) => getCapture(extra))
    .filter((extra): extra is Capture => extra !== null);
  const related = relatedSurfaces(surfaces, surface.id);
  const { previous, next } = tourNeighbors(surfaces, surface.id);
  const blocks = facts(surface);

  return (
    <Wide className="pt-10 pb-8 sm:pt-12">
      <SinglePlayback />

      <nav aria-label="Breadcrumb" className={`${monoLabel} text-muted`}>
        <ol className="flex flex-wrap gap-x-2.5">
          <li>
            <Link href="/features" className="text-primary underline decoration-primary/50 underline-offset-4 hover:text-glow">
              {featurePage.breadcrumb}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>{groupLabels[surface.group]}</li>
        </ol>
      </nav>

      <header className="mt-5 max-w-3xl">
        <h1 className="text-4xl/[1.06] font-semibold tracking-[-0.03em] text-core text-balance sm:text-5xl/[1.05] lg:text-6xl/[1.04]">
          {surface.name}
        </h1>
        <p className="mt-4 text-xl/8 text-ink text-pretty">{surface.tagline}</p>
        <p className="mt-3 text-base/7 text-muted text-pretty">{surface.summary}</p>
        {/* The ledger line, where every page of the site puts it: beside the first description. */}
        <Ledger label={ledgerKey} className="mt-5">
          <span className="font-medium text-core">{privacyLabels[surface.privacy.leaves]}.</span>{" "}
          {surface.privacy.detail}
        </Ledger>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <ButtonLink href="/download">Download CryoZen</ButtonLink>
          <ButtonLink href={`/tour#${surface.id}`} variant="secondary">
            {featurePage.tourCta}
          </ButtonLink>
          <p className="ms-1 font-mono text-xs/5 text-muted">
            {featurePage.verified} {surface.verifiedOn}
          </p>
        </div>
      </header>

      {capture ? (
        <>
          <div className="mt-12">
            <Recording capture={capture} priority />
          </div>
          <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
            <HowTo surface={surface} />
            <div className="space-y-8">
              {blocks.map((block) => (
                <section key={block.title}>
                  <h2 className={blockHeading}>{block.title}</h2>
                  <div className="mt-3 text-[0.9375rem]/6 text-ink">{block.body}</div>
                </section>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* No recording yet: the same window, static, with the how-to beside it. */}
          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-12">
            <SurfaceFrame capture={null} label={surface.name} />
            <HowTo surface={surface} />
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {blocks.map((block) => (
              <Card key={block.title} className="p-6">
                <h2 className={blockHeading}>{block.title}</h2>
                <div className="mt-3 text-[0.9375rem]/6 text-ink">{block.body}</div>
              </Card>
            ))}
          </div>
        </>
      )}

      {surface.docs !== null ? (
        <p className="mt-10 text-[0.9375rem]/6">
          <Link href={docsHref(surface.docs)} className={textLink}>
            {surface.name} {featurePage.docs}
          </Link>
        </p>
      ) : null}

      {extras.length > 0 ? (
        <section aria-labelledby="more-title" className="mt-14 border-t border-hairline pt-10">
          <h2 id="more-title" className="text-2xl/8 font-semibold tracking-tight text-core">
            {featurePage.more}
          </h2>
          <div className="mt-8 space-y-12">
            {extras.map((extra) => (
              <div key={extra.id}>
                <h3 className="mb-4 text-lg/7 font-semibold text-core">{extra.title}</h3>
                <Recording capture={extra} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="related-title" className="mt-14 border-t border-hairline pt-10">
        <h2 id="related-title" className="text-2xl/8 font-semibold tracking-tight text-core">
          {featurePage.related}
        </h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {related.map((other) => (
            <li key={other.id}>
              <Link href={`/features/${other.id}`} className="group block h-full">
                <Card className="flex h-full flex-col p-6 transition-colors duration-150 group-hover:border-primary/40">
                  <p className={`${monoLabel} text-[0.6875rem]/5 text-muted`}>{groupLabels[other.group]}</p>
                  <h3 className="mt-2 flex items-center gap-1.5 text-lg/7 font-semibold tracking-tight text-core">
                    {other.name}
                    <ArrowIcon className="size-4 text-primary transition-transform duration-150 group-hover:translate-x-0.5" />
                  </h3>
                  <p className="mt-2 text-[0.9375rem]/6 text-muted text-pretty">{other.tagline}</p>
                  <p className="mt-auto pt-5 font-mono text-[0.6875rem]/5 text-muted">
                    {privacyLabels[other.privacy.leaves]}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>

        <nav aria-label="Tour chapters" className="mt-4 grid gap-4 sm:grid-cols-2">
          {previous ? (
            <Link
              href={`/features/${previous.surface.id}`}
              className="group rounded-2xl border border-hairline p-5 transition-colors duration-150 hover:border-primary/40"
            >
              <span className={`${monoLabel} block text-[0.6875rem]/5 text-muted`}>{featurePage.previous}</span>
              <span className="mt-1 block text-base/7 font-medium text-core">{previous.surface.name}</span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {next ? (
            <Link
              href={`/features/${next.surface.id}`}
              className="group rounded-2xl border border-hairline p-5 transition-colors duration-150 hover:border-primary/40 sm:text-right"
            >
              <span className={`${monoLabel} block text-[0.6875rem]/5 text-muted`}>{featurePage.next}</span>
              <span className="mt-1 block text-base/7 font-medium text-core">{next.surface.name}</span>
            </Link>
          ) : null}
        </nav>
      </section>
    </Wide>
  );
}

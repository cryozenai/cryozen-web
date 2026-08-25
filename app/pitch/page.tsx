import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink, Container, Eyebrow, secondaryButton } from "@/components/ui";
import { decks } from "@/lib/decks";

export const metadata: Metadata = {
  title: "Seed decks",
  description:
    "The two positioning variants of the CryoZen seed deck: on-prem private AI for regulated finance, and the open-core self-hosted workspace.",
  alternates: { canonical: "/pitch" },
};

export default function PitchIndexPage() {
  return (
    <Container className="py-16 sm:py-24">
      <div className="max-w-2xl">
        <Eyebrow>Seed decks</Eyebrow>
        <h1 className="text-flame mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Two ways to read the same company.
        </h1>
        <p className="mt-5 text-base/7 text-muted text-pretty">
          One product, one set of numbers, two beachheads. The enterprise variant leads, because it
          is the one that matches the founder&rsquo;s access to the buyer. Both decks page with the
          arrow keys, carry their 30-second speaker notes behind the Notes toggle, and print one
          slide per page.
        </p>
      </div>

      {/*
        Subgrid, so the two cards share row tracks: the rule above the metadata
        and the "Open the deck" line land at the same height whether or not a
        beachhead wraps. Rows are header, title, summary, metadata, call to
        action.
      */}
      <div className="mt-14 grid gap-4 lg:grid-cols-2 lg:grid-rows-[auto_auto_1fr_auto_auto]">
        {decks.map((deck) => (
          <Link
            key={deck.slug}
            href={`/pitch/${deck.slug}`}
            className="panel group flex flex-col gap-0 rounded-2xl p-7 transition-colors duration-150 hover:border-primary/40 lg:row-span-5 lg:grid lg:grid-rows-subgrid"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2.5">
                <Logo className="size-6" />
                <span className="text-xs font-semibold tracking-[0.14em] text-core uppercase">
                  {deck.label}
                </span>
              </span>
              <span className="font-mono text-xs text-muted">
                {deck.slides.length} slides
              </span>
            </div>

            <h2 className="mt-6 text-2xl font-semibold tracking-tight text-core">{deck.title}</h2>
            <p className="mt-3 text-sm/6 text-muted">{deck.summary}</p>

            <dl className="mt-7 grid gap-3 border-t border-hairline pt-6 sm:grid-cols-2">
              <div>
                <dt className="font-mono text-[0.68rem] tracking-[0.14em] text-muted uppercase">
                  Beachhead
                </dt>
                <dd className="mt-1 text-sm text-ink">{deck.beachhead}</dd>
              </div>
              <div>
                <dt className="font-mono text-[0.68rem] tracking-[0.14em] text-muted uppercase">
                  Raise
                </dt>
                <dd className="mt-1 text-sm text-ink">{deck.raise}</dd>
              </div>
            </dl>

            <span className="mt-7 text-sm font-semibold text-primary transition-colors duration-150 group-hover:text-glow">
              Open the deck &rarr;
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-3">
        <ButtonLink href={`/pitch/${decks[0].slug}`}>Open the {decks[0].label} deck</ButtonLink>
        <Link href="/" className={`${secondaryButton} inline-flex gap-2 px-5 py-3`}>
          Back to the product
        </Link>
      </div>

      <p className="mt-10 max-w-2xl text-xs/5 text-muted">
        Confidential. Traction is pre-launch and pre-revenue, market sizing is an explicit
        bottom-up model with its unbenchmarked inputs marked, and enterprise controls (SSO, RBAC,
        audit export, SOC 2) are shown as the funded build rather than shipped features.
      </p>
    </Container>
  );
}

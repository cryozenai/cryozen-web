import type { Metadata } from "next";
import Link from "next/link";
import { ChapterIndex, type IndexGroup } from "@/components/home/chapter-index";
import { monoLabel, Wide } from "@/components/home/primitives";
import { StartRecordings, StartSteps } from "@/components/home/sections";
import { SinglePlayback } from "@/components/home/single-playback";
import { ArrowIcon } from "@/components/icons";
import { Chapter } from "@/components/tour/chapter";
import { Card, textLink } from "@/components/ui";
import { chapters, tourPage } from "@/lib/home/copy";
import { publicSurface, tour } from "@/lib/home/derive";
import { getCapture, manifest } from "@/lib/media/index";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: tourPage.metaTitle,
  description: tourPage.metaDescription,
  alternates: { canonical: "/tour" },
  openGraph: {
    title: `${tourPage.metaTitle} - ${site.name}`,
    description: tourPage.metaDescription,
    url: `${site.url}/tour`,
  },
};

const twoDigits = (value: number) => String(value).padStart(2, "0");

export default function TourPage() {
  const index: IndexGroup[] = [
    { items: [{ id: "start", label: tourPage.startLabel }] },
    ...tour.map((entry) => ({
      label: entry.label,
      items: entry.chapters.map(({ surface }) => ({ id: surface.id, label: surface.name })),
    })),
  ];
  const { next } = tourPage;

  return (
    /*
     * Chapters are linked as /tour#<surface>. Two sticky bars sit above them
     * here, the site header and the chapter index, so every anchored section
     * on this page stops further down than the chapter's own default.
     */
    <div className="[&_section[id]]:scroll-mt-36">
      <SinglePlayback />

      <Wide className="pt-12 pb-10 sm:pt-16 sm:pb-12">
        <p className={`${monoLabel} flex gap-3 text-muted`}>
          <span className="text-primary">{tourPage.eyebrow}</span>
          verified on {manifest.version}
        </p>
        <h1 className="mt-5 text-4xl/[1.06] font-semibold tracking-[-0.03em] text-core sm:text-5xl/[1.05] lg:text-6xl/[1.04]">
          <span className="block text-balance">{tourPage.title[0]}</span>
          <span className="text-flame block pb-[0.12em] text-balance">{tourPage.title[1]}</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg/8 text-ink text-pretty">{tourPage.lede}</p>
      </Wide>

      <ChapterIndex groups={index} label={tourPage.indexLabel} />

      <Wide>
        <section id="start" aria-labelledby="start-title" className="py-14 sm:py-16">
          <h2
            id="start-title"
            className="max-w-3xl text-3xl font-semibold tracking-tight text-core text-balance sm:text-4xl"
          >
            {tourPage.startTitle}
          </h2>
          <p className="mt-4 max-w-2xl text-base/7 text-ink text-pretty">{tourPage.startIntro}</p>
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
            <StartSteps />
            <StartRecordings name="tour-start" priority />
          </div>
        </section>

        {tour.map((entry, groupIndex) => (
          <div key={entry.group} className="border-t border-hairline py-14 sm:py-16">
            <p className={`${monoLabel} flex gap-3 text-muted`}>
              <span className="text-primary">{String.fromCharCode(65 + groupIndex)}</span>
              {entry.label}
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-core text-balance sm:text-4xl">
              {chapters[entry.group].headline}
            </h2>

            <div className="mt-12 space-y-16 sm:space-y-20">
              {entry.chapters.map(({ number, surface }) => (
                <div key={surface.id}>
                  <p className={`${monoLabel} mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted`}>
                    <span className="text-primary">
                      {tourPage.chapterWord} {twoDigits(number)}
                    </span>
                    <Link
                      href={`/features/${surface.id}`}
                      className={`${textLink} tracking-normal normal-case`}
                    >
                      {tourPage.featureLink}
                    </Link>
                  </p>
                  {/* A client component: `publicSurface` keeps the private evidence paths out of the page. */}
                  <Chapter
                    surface={publicSurface(surface)}
                    capture={getCapture(surface.capture)}
                    headingLevel={3}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <section aria-labelledby="next-title" className="border-t border-hairline py-14 sm:py-16">
          <h2
            id="next-title"
            className="text-3xl font-semibold tracking-tight text-core text-balance sm:text-4xl"
          >
            {next.title}
          </h2>
          <p className="mt-4 max-w-2xl text-base/7 text-ink text-pretty">{next.intro}</p>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {next.cards.map((card) => (
              <li key={card.href}>
                <Link href={card.href} className="group block h-full">
                  <Card className="flex h-full flex-col p-6 transition-colors duration-150 group-hover:border-primary/40">
                    <h3 className="text-lg/7 font-semibold tracking-tight text-core">{card.title}</h3>
                    <p className="mt-2 text-[0.9375rem]/6 text-muted text-pretty">{card.body}</p>
                    <p className="mt-auto flex items-center gap-1.5 pt-6 text-sm font-medium text-primary">
                      {card.cta}
                      <ArrowIcon className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                    </p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </Wide>
    </div>
  );
}

import type { Metadata } from "next";
import { monoLabel, Wide } from "@/components/home/primitives";
import { SurfaceRow } from "@/components/home/surface-row";
import { ButtonLink } from "@/components/ui";
import { chapters, featurePage, hero } from "@/lib/home/copy";
import { tour } from "@/lib/home/derive";
import { manifest } from "@/lib/media/index";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: featurePage.indexMetaTitle,
  description: featurePage.indexMetaDescription,
  alternates: { canonical: "/features" },
  openGraph: {
    title: `${featurePage.indexMetaTitle} - ${site.name}`,
    description: featurePage.indexMetaDescription,
    url: `${site.url}/features`,
  },
};

export default function FeaturesPage() {
  return (
    <Wide className="pt-12 pb-8 sm:pt-16">
      <p className={`${monoLabel} flex gap-3 text-muted`}>
        <span className="text-primary">{featurePage.indexEyebrow}</span>
        verified on {manifest.version}
      </p>
      <h1 className="mt-5 text-4xl/[1.06] font-semibold tracking-[-0.03em] text-core sm:text-5xl/[1.05] lg:text-6xl/[1.04]">
        <span className="block text-balance">{featurePage.indexTitle[0]}</span>
        <span className="text-flame block pb-[0.12em] text-balance">{featurePage.indexTitle[1]}</span>
      </h1>
      <p className="mt-5 max-w-2xl text-lg/8 text-ink text-pretty">{featurePage.indexLede}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/download">Download CryoZen</ButtonLink>
        <ButtonLink href="/tour" variant="secondary">
          {hero.tourLabel}
        </ButtonLink>
      </div>

      <div className="mt-14">
        {tour.map((entry, index) => (
          <section
            key={entry.group}
            aria-labelledby={`${entry.group}-title`}
            className="grid gap-x-12 gap-y-6 border-t border-hairline py-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
          >
            <div>
              <p className={`${monoLabel} flex gap-3 text-muted`}>
                <span className="text-primary">{String.fromCharCode(65 + index)}</span>
                {entry.label}
              </p>
              <h2
                id={`${entry.group}-title`}
                className="mt-3 text-2xl/8 font-semibold tracking-tight text-core text-balance sm:text-[1.75rem]/9"
              >
                {chapters[entry.group].headline}
              </h2>
            </div>
            <ul className="divide-y divide-hairline border-y border-hairline">
              {entry.chapters.map(({ surface }) => (
                <SurfaceRow key={surface.id} surface={surface} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Wide>
  );
}

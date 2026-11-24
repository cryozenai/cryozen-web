import Link from "next/link";
import { CopyCommand } from "@/components/copy-command";
import { DownloadCta, type DownloadLinks } from "@/components/download-cta";
import { ArrowIcon } from "@/components/icons";
import { CaptureSwitcher, type SwitcherItem } from "@/components/home/capture-switcher";
import {
  Ledger,
  monoLabel,
  Section,
  SectionIntro,
  SectionTitle,
  UiLabel,
  Wide,
} from "@/components/home/primitives";
import { SurfaceFrame } from "@/components/home/surface-frame";
import { SurfaceRow } from "@/components/home/surface-row";
import { SyncedCapture } from "@/components/home/synced-capture";
import { ButtonLink, Card, Eyebrow, textLink } from "@/components/ui";
import {
  chapters,
  closing,
  featurePage,
  hero,
  heroSurfaces,
  inside,
  ledgerKey,
  privacy,
  start,
  teams,
  tourPage,
  tourTeaser,
} from "@/lib/home/copy";
import { egressLedger, tour, tourChapters } from "@/lib/home/derive";
import { getCapture } from "@/lib/media/index";
import type { PlatformId } from "@/lib/platforms";
import { getSurface, surfaces } from "@/lib/product/surfaces";
import { privacyLabels } from "@/lib/product/types";
import type { Surface } from "@/lib/product/types";

/** Everything the download buttons need, resolved once by the page. */
export interface DownloadProps {
  links: DownloadLinks;
  sizes: Partial<Record<PlatformId, string | null>>;
  intelHref: string;
}

/** A surface's ledger line: how far its data goes, then exactly what and when. */
function leaves(surface: Surface): string {
  return `${privacyLabels[surface.privacy.leaves]}. ${surface.privacy.detail}`;
}

const twoDigits = (value: number) => String(value).padStart(2, "0");

/* ---------------------------------- hero --------------------------------- */

export function Hero({ releaseTag, download }: { releaseTag: string | null; download: DownloadProps }) {
  const items: SwitcherItem[] = heroSurfaces.map((id) => {
    const surface = getSurface(id);
    return {
      id: surface.id,
      tab: surface.name,
      capture: getCapture(surface.capture),
      heading: surface.tagline,
      // The hero shows only how far data goes; the full detail is one click
      // away on the tour and the feature page, and would crowd the fold here.
      ledger: `${privacyLabels[surface.privacy.leaves]}.`,
    };
  });

  return (
    <section aria-labelledby="hero-title">
      <Wide className="grid gap-10 pt-12 pb-16 sm:pt-16 xl:grid-cols-[minmax(0,1.06fr)_minmax(0,1fr)] xl:items-start xl:gap-12 xl:pt-14 xl:pb-20">
        <div className="min-w-0 xl:pt-14">
          {releaseTag ? (
            <Link href="/changelog" className="group inline-flex">
              <Eyebrow>
                <span className="size-1.5 animate-ember rounded-full bg-primary" />
                {releaseTag} is out
                <ArrowIcon className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
              </Eyebrow>
            </Link>
          ) : (
            <Eyebrow>{hero.fallbackEyebrow}</Eyebrow>
          )}

          {/*
           * Two lines, always: each sentence is its own block, and from `xl`
           * (the split layout) neither may wrap, so the second line can never
           * strand a word. Below that a line that does not fit breaks evenly.
           */}
          <h1
            id="hero-title"
            className="mt-6 text-[clamp(1.875rem,9.2vw,3.25rem)]/[1.05] font-semibold tracking-[-0.035em] text-core sm:text-6xl/[1.03] lg:text-7xl/[1.02] xl:text-[3.25rem]/[1.06]"
          >
            <span className="block text-balance xl:whitespace-nowrap">{hero.headline[0]}</span>
            <span className="text-flame block pb-[0.12em] text-balance xl:whitespace-nowrap">
              {hero.headline[1]}
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-lg/8 text-ink text-pretty">{hero.lede}</p>

          <div className="mt-8">
            <DownloadCta
              {...download}
              align="start"
              secondary={{ href: "/tour", label: hero.tourLabel }}
            />
          </div>

          {/* The four guarantees as a spec strip; the section they link to explains each. */}
          <ul className="mt-8 grid max-w-xl grid-cols-1 gap-x-8 gap-y-2 border-t border-hairline pt-5 min-[400px]:grid-cols-2">
            {privacy.guarantees.map((item) => (
              <li key={item.key} className="flex items-center gap-2.5 font-mono text-xs/5 text-ink">
                <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-primary" />
                {item.key}
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 xl:pt-12">
          <CaptureSwitcher
            items={items}
            label={hero.switcherLabel}
            name="hero"
            ledgerLabel={ledgerKey}
            priority
          />
        </div>
      </Wide>
    </section>
  );
}

/* ---------------------------------- start -------------------------------- */

/** The four activation steps, numbered, each with the control to look for. */
export function StartSteps() {
  return (
    <ol className="border-t border-hairline">
      {start.steps.map((step, index) => (
        <li
          key={step.title}
          className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 border-b border-hairline py-5"
        >
          <span aria-hidden="true" className="font-mono text-[0.8125rem]/7 font-medium text-primary">
            {twoDigits(index + 1)}
          </span>
          <div>
            <h3 className="text-lg/7 font-semibold tracking-tight text-core">{step.title}</h3>
            <p className="mt-1 text-[0.9375rem]/6 text-ink text-pretty">{step.body}</p>
            <p className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className={`${monoLabel} me-1 text-[0.6875rem]/5 text-muted`}>{step.cue.verb}</span>
              {step.cue.labels.map((label) => (
                <UiLabel key={label}>{label}</UiLabel>
              ))}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** The recordings of the steps that happen inside the app, one per tab. */
export function StartRecordings({ name, priority = false }: { name: string; priority?: boolean }) {
  const items: SwitcherItem[] = start.steps.flatMap((step) =>
    step.capture === undefined
      ? []
      : [{ id: step.capture, tab: step.title, capture: getCapture(step.capture), heading: step.body }],
  );
  return (
    <CaptureSwitcher
      items={items}
      label={start.title}
      name={name}
      ledgerLabel={ledgerKey}
      priority={priority}
    />
  );
}

export function StartSection({ dockerPort }: { dockerPort: number }) {
  return (
    <Section id="start" index="01" label={start.label} band>
      <SectionTitle id="start">{start.title}</SectionTitle>
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <StartSteps />
        <StartRecordings name="start" />
      </div>
      <p className="mt-8 max-w-3xl text-sm/6 text-muted text-pretty">
        {start.dockerNote} <UiLabel>{`localhost:${dockerPort}`}</UiLabel>. {start.slashNote}{" "}
        <Link href="/tour#start" className={textLink}>
          {start.tourLink}
        </Link>
        .
      </p>
    </Section>
  );
}

/* --------------------------------- chapters ------------------------------ */

export function InsideSection() {
  return (
    <Section id="inside" index="02" label={inside.label}>
      <SectionTitle id="inside">{inside.title}</SectionTitle>
      <SectionIntro>{inside.intro}</SectionIntro>

      <div className="mt-14 space-y-16 lg:space-y-20">
        {tour.map((entry, index) => {
          const chapter = chapters[entry.group];
          const frame =
            chapter.frames.find((candidate) => getCapture(candidate.capture) !== null) ??
            chapter.frames[0];
          const shown = getSurface(frame.surface);
          const flipped = index % 2 === 1;
          return (
            <article
              key={entry.group}
              id={entry.group}
              aria-labelledby={`${entry.group}-title`}
              className="grid scroll-mt-24 gap-8 lg:grid-cols-12 lg:items-start lg:gap-12"
            >
              <div className={`lg:col-span-5 ${flipped ? "lg:order-2" : ""}`}>
                <p className={`${monoLabel} flex gap-3 text-muted`}>
                  <span className="text-primary">{String.fromCharCode(65 + index)}</span>
                  {entry.label}
                </p>
                <h3
                  id={`${entry.group}-title`}
                  className="mt-3 text-2xl/8 font-semibold tracking-tight text-core text-balance sm:text-[1.75rem]/9"
                >
                  {chapter.headline}
                </h3>
                <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
                  {entry.chapters.map(({ surface }) => (
                    <SurfaceRow key={surface.id} surface={surface} />
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-7">
                <SurfaceFrame capture={getCapture(frame.capture)} label={shown.name}>
                  <Ledger label={ledgerKey}>
                    <span className="font-medium text-core">{shown.name}.</span> {leaves(shown)}
                  </Ledger>
                </SurfaceFrame>
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}

/* --------------------------------- private ------------------------------- */

export function PrivateSection() {
  const { ledger, after } = privacy;
  return (
    <Section id="private" index="03" label={privacy.label} band>
      <SectionTitle id="private">{privacy.title}</SectionTitle>
      <SectionIntro>{privacy.intro}</SectionIntro>

      <ul className="mt-10 grid border-t border-hairline sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-4 lg:gap-x-0 lg:border-t-0">
        {privacy.guarantees.map((item, index) => (
          <li
            key={item.key}
            className={`border-b border-hairline py-5 lg:border-b-0 lg:py-0 ${
              index === 0 ? "lg:pe-7" : "lg:border-l lg:px-7"
            }`}
          >
            <p className="font-mono text-xs/5 font-medium text-primary">{item.key}</p>
            <h3 className="mt-2.5 text-lg/7 font-semibold tracking-tight text-core">{item.title}</h3>
            <p className="mt-1.5 text-[0.9375rem]/6 text-ink text-pretty">{item.body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-12 overflow-hidden rounded-2xl border border-hairline bg-ground/70">
        <h3 className={`${monoLabel} flex flex-wrap gap-x-3 border-b border-hairline px-5 py-4`}>
          <span className="text-primary">{ledger.caption}</span>
          <span className="text-muted">{ledger.captionDetail}</span>
        </h3>
        <dl>
          {egressLedger(surfaces).map((row) => (
            <div
              key={row.reach}
              className="grid gap-x-8 gap-y-1.5 border-b border-hairline px-5 py-4 md:grid-cols-[17rem_minmax(0,1fr)]"
            >
              <dt className="text-[0.9375rem]/6 font-medium text-core">{privacyLabels[row.reach]}</dt>
              <dd className="text-[0.9375rem]/6 text-ink">
                {row.surfaces.map((surface, index) => (
                  <span key={surface.id}>
                    {index > 0 ? ", " : null}
                    <Link href={`/features/${surface.id}`} className={textLink}>
                      {surface.name}
                    </Link>
                  </span>
                ))}
              </dd>
            </div>
          ))}
          <div className="grid gap-x-8 gap-y-1.5 px-5 py-4 text-primary md:grid-cols-[17rem_minmax(0,1fr)]">
            <dt className="text-[0.9375rem]/6 font-medium">{ledger.company.reach}</dt>
            <dd className="text-[0.9375rem]/6">{ledger.company.surfaces}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-6 max-w-3xl text-[0.9375rem]/6 text-ink text-pretty">
        {after.before}{" "}
        <Link href="/security" className={textLink}>
          {after.link}
        </Link>
        {after.after}
      </p>
    </Section>
  );
}

/* ----------------------------------- tour -------------------------------- */

export function TourSection() {
  const surface = getSurface(tourTeaser.surface);
  const chapter = tourChapters(surfaces).find((entry) => entry.surface.id === surface.id);
  const capture = getCapture(surface.capture);
  const { intro } = tourTeaser;
  return (
    <Section id="tour" index="04" label={tourTeaser.label}>
      <SectionTitle id="tour">{tourTeaser.title}</SectionTitle>
      <SectionIntro>
        {intro.before}{" "}
        <Link href="/tour" className={textLink}>
          {intro.link}
        </Link>{" "}
        {intro.after}
      </SectionIntro>

      <div className="mt-12 border-t border-hairline pt-10">
        {chapter ? (
          <p className={`${monoLabel} text-muted`}>
            <span className="text-primary">
              {tourPage.chapterWord} {twoDigits(chapter.number)}
            </span>{" "}
            verified on {surface.verifiedOn}
          </p>
        ) : null}
        <h3 className="mt-3 text-2xl/8 font-semibold tracking-tight text-core sm:text-[1.75rem]/9">
          {surface.name}
        </h3>
        <p className="mt-2 max-w-2xl text-base/7 text-ink text-pretty">{surface.tagline}</p>

        <div className="mt-8">
          {capture ? (
            <SyncedCapture capture={capture} stepsLabel={featurePage.recording}>
              <Ledger label={ledgerKey}>{leaves(surface)}</Ledger>
            </SyncedCapture>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
              <SurfaceFrame capture={null} label={surface.name} />
              <Ledger label={ledgerKey}>{leaves(surface)}</Ledger>
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href={`/tour#${surface.id}`} variant="secondary">
          {tourTeaser.chapter}
          <ArrowIcon className="size-4 text-primary" />
        </ButtonLink>
        <ButtonLink href="/tour" variant="ghost">
          {tourTeaser.all}
        </ButtonLink>
      </div>
    </Section>
  );
}
/* ---------------------------------- teams -------------------------------- */

export function TeamsSection() {
  const { pricing } = teams;
  return (
    <Section id="teams" index="05" label={teams.label}>
      <SectionTitle id="teams">{teams.title}</SectionTitle>
      <SectionIntro>{teams.intro}</SectionIntro>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {teams.tiers.map((tier, index) => (
          <Card key={tier.label} className="flex flex-col p-6">
            <p className={`${monoLabel} ${index === 0 ? "text-primary" : "text-muted"}`}>{tier.label}</p>
            <h3 className="mt-2.5 text-lg/7 font-semibold tracking-tight text-core">{tier.title}</h3>
            <ul className="mt-4 flex flex-wrap gap-2">
              {tier.items.map((item) => (
                <li
                  key={item}
                  className="rounded-md border border-hairline bg-ground px-2.5 py-1.5 font-mono text-xs/4 text-ink"
                >
                  {item}
                </li>
              ))}
            </ul>
            {"note" in tier && tier.note ? (
              <p className="mt-auto pt-5 text-sm/6 text-muted text-pretty">{tier.note}</p>
            ) : null}
          </Card>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
        <ButtonLink href="/teams" variant="secondary">
          {teams.cta}
          <ArrowIcon className="size-4 text-primary" />
        </ButtonLink>
        <p className="text-sm/6 text-muted">
          {pricing.before}{" "}
          <Link href="/pricing" className={textLink}>
            {pricing.link}
          </Link>
          {pricing.after}
        </p>
      </div>
    </Section>
  );
}

/* ---------------------------------- close -------------------------------- */

export function ClosingSection({
  download,
  checksumsHref,
  dockerCommands,
  dockerPort,
}: {
  download: DownloadProps;
  checksumsHref: string;
  dockerCommands: readonly string[];
  dockerPort: number;
}) {
  const { verify, feed, airplay } = closing;
  return (
    <section aria-labelledby="close-title" className="border-y border-hairline bg-surface/70">
      <Wide className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
        <div>
          <h2
            id="close-title"
            className="text-4xl/[1.05] font-semibold tracking-[-0.03em] text-core sm:text-5xl/[1.05] lg:text-6xl/[1.04]"
          >
            <span className="block">{closing.headline[0]}</span>
            <span className="text-flame block pb-[0.12em]">{closing.headline[1]}</span>
          </h2>
          <p className="mt-4 max-w-xl text-base/7 text-ink text-pretty">{closing.body}</p>
          <div className="mt-8">
            <DownloadCta
              {...download}
              align="start"
              secondary={{ href: "/tour", label: hero.tourLabel }}
            />
          </div>
          <p className="mt-5 max-w-xl text-sm/6 text-muted text-pretty">
            {verify.before}{" "}
            <a href={checksumsHref} className={textLink}>
              {verify.link}
            </a>
            {verify.after} {feed.before}{" "}
            <Link href="/changelog" className={textLink}>
              {feed.changelog}
            </Link>{" "}
            {feed.middle}{" "}
            <a href="/changelog/feed.xml" className={textLink}>
              {feed.feed}
            </a>
            {feed.after}
          </p>
        </div>

        <Card className="min-w-0 p-5 sm:p-6">
          <h3 className={`${monoLabel} text-primary`}>{closing.dockerTitle}</h3>
          <div className="mt-4 space-y-2">
            {dockerCommands.map((command) => (
              <CopyCommand key={command} command={command} />
            ))}
          </div>
          <p className="mt-4 text-sm/6 text-muted text-pretty">
            {closing.dockerOpens} <UiLabel>{`localhost:${dockerPort}`}</UiLabel>. {airplay.before}{" "}
            {dockerPort}
            {airplay.middle} <UiLabel>APP_PORT</UiLabel> {airplay.after}
          </p>
        </Card>
      </Wide>
    </section>
  );
}

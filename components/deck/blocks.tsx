import type { Block, Bullet } from "@/lib/decks/types";
import { RichText } from "./rich-text";

/*
 * One renderer per block kind, all of them built from the site's own tokens:
 * `panel` for cards, `primary`/`glow` for the accent, `core`/`ink`/`muted` for
 * type, `hairline` for rules. Nothing here defines a colour of its own, which
 * is what keeps the deck and the marketing site the same design system rather
 * than two that merely look alike today.
 *
 * Type scale is projector-first. The source deck holds a hard 18pt floor on
 * body copy so a slide survives a conference-room projector and a thumbnail;
 * the clamps below keep that floor on a laptop and let it grow on a large
 * display. Anything set smaller is annotation - a kicker, a marker, an axis
 * label, a citation - never a sentence read for meaning.
 */

const TYPE = {
  lede: "text-[length:var(--deck-lede)] leading-[var(--deck-lh-body)]",
  bullet: "text-[length:var(--deck-bullet)] leading-[var(--deck-lh-body)]",
  body: "text-[length:var(--deck-body)] leading-snug",
  annot: "text-[length:var(--deck-annot)]",
  micro: "text-[length:var(--deck-micro)]",
  mark: "font-mono text-[length:var(--deck-annot)] text-primary",
} as const;

function BulletList({ items, className = "" }: { items: Bullet[]; className?: string }) {
  return (
    <ul className={`grid gap-[var(--deck-list-gap)] ${className}`}>
      {items.map((item) => (
        <li key={item.mark + item.text} className={`flex items-baseline gap-3.5 text-ink ${TYPE.bullet}`}>
          <span className={`shrink-0 whitespace-nowrap ${TYPE.mark}`}>{item.mark}</span>
          <span>
            <RichText text={item.text} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DeckBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case "lede":
      return (
        <p className={`deck-block max-w-[52ch] text-ink text-pretty ${TYPE.lede}`}>
          <RichText text={block.text} />
        </p>
      );

    case "klist":
      return (
        <BulletList
          items={block.items}
          className={`deck-block ${block.wide ? "" : "max-w-[64ch]"}`}
        />
      );

    case "chips":
      return (
        <div className="deck-block flex max-w-[70ch] flex-wrap gap-2">
          {block.items.map((chip) => (
            <span
              key={chip.label}
              className={`rounded-full border px-3.5 py-2 font-mono text-[length:var(--deck-annot)] ${
                chip.hot
                  ? "border-primary/35 bg-primary/10 text-primary"
                  : "border-hairline bg-surface/70 text-ink"
              }`}
            >
              {chip.label}
            </span>
          ))}
        </div>
      );

    case "pillars":
      return (
        <div className="deck-block grid gap-4 sm:grid-cols-3">
          {block.items.map((pillar) => (
            <div key={pillar.title} className="panel rounded-2xl p-5">
              <p className="font-mono text-[length:var(--deck-annot)] tracking-[0.14em] text-primary uppercase">
                {pillar.title}
              </p>
              <p className="mt-2.5 text-[length:var(--deck-body)] leading-snug text-ink">
                {pillar.body}
              </p>
            </div>
          ))}
        </div>
      );

    case "columns":
      return (
        <div className="deck-block grid gap-4 md:grid-cols-2">
          {block.items.map((column) => (
            <div
              key={column.title}
              className={`deck-column rounded-2xl border p-5 sm:p-6 ${
                column.highlight ? "border-primary/35 bg-primary/8" : "panel"
              }`}
            >
              <p
                className={`font-mono text-[length:var(--deck-annot)] tracking-[0.12em] uppercase ${
                  column.highlight ? "text-primary" : "text-muted"
                }`}
              >
                {column.title}
              </p>
              <p className="mt-1 text-[length:var(--deck-annot)] text-muted">{column.sub}</p>
              <ul className="mt-4 grid gap-2.5">
                {column.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-baseline gap-2.5 text-[length:var(--deck-body)] leading-snug text-ink"
                  >
                    <span aria-hidden="true" className="shrink-0 font-mono text-primary">
                      ·
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );

    case "metrics":
      return (
        <div className="deck-block grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline sm:grid-cols-3">
          {block.items.map((metric) => (
            <div key={metric.label} className="bg-surface/80 px-5 py-6">
              <div className="font-mono text-[length:var(--deck-metric)] font-semibold tracking-tight text-core tabular-nums">
                {metric.value}
                {metric.unit ? (
                  <span className="text-[0.5em] text-primary">{metric.unit}</span>
                ) : null}
              </div>
              <div className="mt-2 text-[length:var(--deck-annot)] leading-snug text-muted">{metric.label}</div>
            </div>
          ))}
        </div>
      );

    case "matrix":
      return (
        <div className="deck-matrix-wrap deck-block grid gap-3 lg:grid-cols-[auto_1fr]">
          {/*
            The vertical axis carries half the argument, so it is never dropped -
            only turned. Too narrow for a rotated label, it becomes a caption
            above the grid instead.
          */}
          <p className="deck-ylab-flat font-mono text-[length:var(--deck-annot)] tracking-[0.14em] text-muted uppercase lg:hidden">
            {block.yLabel}
          </p>
          <div className="deck-ylab hidden items-center justify-center lg:flex">
            <span className="rotate-180 font-mono text-[length:var(--deck-annot)] tracking-[0.14em] whitespace-nowrap text-muted uppercase [writing-mode:vertical-rl]">
              {block.yLabel}
            </span>
          </div>
          <div>
            <div className="deck-matrix grid grid-cols-2 grid-rows-2 gap-3 rounded-2xl border border-hairline bg-surface/40 p-2.5 sm:min-h-[22rem] sm:p-3.5">
              {block.quadrants.map((quadrant) => (
                <div
                  key={quadrant.title}
                  className={`flex min-h-0 flex-col items-center justify-center gap-2 rounded-xl p-3.5 text-center ${
                    quadrant.win
                      ? "border border-primary/60 bg-primary/10 ring-1 ring-primary/25 ring-inset"
                      : "border border-dashed border-hairline"
                  }`}
                >
                  <span
                    className={`font-mono text-[length:var(--deck-annot)] font-semibold tracking-[0.1em] uppercase ${
                      quadrant.win ? "text-primary" : "text-core"
                    }`}
                  >
                    {quadrant.title}
                  </span>
                  {quadrant.win ? (
                    <span className="font-mono text-[length:var(--deck-figure)] font-semibold text-core">
                      CryoZen
                    </span>
                  ) : null}
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {quadrant.names.map((name) => (
                      <span
                        key={name}
                        className={`rounded-md border bg-surface px-2 py-1 text-[length:var(--deck-micro)] ${
                          quadrant.win ? "border-primary/35 text-core" : "border-hairline text-ink"
                        }`}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex justify-between font-mono text-[length:var(--deck-annot)] tracking-[0.14em] text-muted uppercase">
              <span>{block.xLabel.start}</span>
              <span>{block.xLabel.end}</span>
            </div>
          </div>
        </div>
      );

    case "funnel":
      return (
        <div className="deck-funnel deck-block grid max-w-[52rem] gap-3">
          {block.tiers.map((tier) => (
            <div
              key={tier.tag}
              className="deck-tier panel grid items-center gap-3.5 rounded-xl px-5 py-4 sm:grid-cols-[auto_1fr_auto]"
            >
              <span className="font-mono text-[length:var(--deck-micro)] tracking-[0.12em] text-primary uppercase">
                {tier.tag}
              </span>
              <span className="text-[length:var(--deck-body)] leading-snug text-ink">
                <RichText text={tier.desc} />
              </span>
              <span className="font-mono text-[length:var(--deck-figure)] font-semibold whitespace-nowrap text-core tabular-nums">
                {tier.value}
              </span>
            </div>
          ))}
        </div>
      );

    case "assumptions":
      return (
        <div className="deck-block overflow-hidden rounded-xl border border-hairline bg-surface/40">
          {block.rows.map((row) => (
            <div
              key={row.name}
              className={`deck-assum-row grid items-baseline gap-x-3.5 gap-y-1 border-b border-hairline px-5 py-2.5 last:border-b-0 sm:grid-cols-[1.15fr_10rem_1.5fr] ${
                row.total ? "bg-primary/10" : ""
              }`}
            >
              <span className="text-[length:var(--deck-body)] text-ink">{row.name}</span>
              <span
                className={`font-mono text-[length:var(--deck-body)] whitespace-nowrap tabular-nums ${
                  row.total ? "font-semibold text-primary" : "text-core"
                }`}
              >
                {row.value}
              </span>
              <span
                className={`text-[length:var(--deck-micro)] leading-snug ${row.unbenchmarked ? "text-warn" : "text-muted"}`}
              >
                {row.source}
              </span>
            </div>
          ))}
        </div>
      );

    case "plans":
      return (
        <div className="deck-block grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {block.items.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col gap-2 rounded-2xl border p-5 ${
                plan.featured ? "border-primary/35 bg-primary/8" : "panel"
              }`}
            >
              <span
                className={`font-mono text-[length:var(--deck-micro)] tracking-[0.12em] uppercase ${
                  plan.featured ? "text-primary" : "text-muted"
                }`}
              >
                {plan.name}
              </span>
              <span className="font-mono text-[length:var(--deck-figure)] font-semibold text-core">
                {plan.price}
                {plan.priceNote ? (
                  <span className="text-[0.5em] text-muted">{plan.priceNote}</span>
                ) : null}
              </span>
              <span className="text-[length:var(--deck-body)] leading-snug text-ink">
                {plan.desc}
              </span>
            </div>
          ))}
        </div>
      );

    case "funding":
      return (
        <div className="deck-block grid gap-8 lg:grid-cols-2">
          <div className="grid content-start gap-3.5">
            {block.bars.map((bar) => (
              <div key={bar.label} className="grid grid-cols-[minmax(10rem,12.5rem)_1fr_3rem] items-center gap-3.5">
                <span className="font-mono text-[length:var(--deck-annot)] text-ink">{bar.label}</span>
                {/*
                  The track is a meter, not a decoration: a screen reader gets
                  the same percentage the fill draws, from the one number that
                  also sets the width.
                */}
                <span
                  role="meter"
                  aria-valuenow={bar.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${bar.label} share of the raise`}
                  className="h-2 overflow-hidden rounded-full bg-hairline"
                >
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${bar.percent}%` }}
                  />
                </span>
                <span className="text-right font-mono text-[length:var(--deck-annot)] text-core tabular-nums">
                  {bar.percent}%
                </span>
              </div>
            ))}
          </div>
          <BulletList items={block.milestones} />
        </div>
      );

    case "milestones":
      return <BulletList items={block.items} className="deck-block" />;

    case "command":
      return (
        <div className="deck-block overflow-x-auto rounded-xl border border-hairline bg-surface/40 px-5 py-4 font-mono text-[length:var(--deck-annot)] leading-[1.8] text-ink">
          <span className="text-primary">$</span> {block.steps.join("  →  ")}{" "}
          <span aria-hidden="true" className="text-muted">
            &rarr;
          </span>{" "}
          <span className="font-semibold text-core">{block.result}</span>
        </div>
      );

    case "note":
      return (
        <p className="deck-block max-w-[70ch] text-[length:var(--deck-lede)] leading-snug text-muted italic">
          <RichText text={block.text} />
        </p>
      );

    case "signoff":
      return <p className="deck-block font-mono text-[length:var(--deck-micro)] tracking-wide text-muted">{block.text}</p>;

    case "narration":
      /*
       * A speaker aid, not slide copy. Hidden until the Notes toggle in the
       * chrome flips `data-notes` on the deck root, and always hidden in print,
       * which is what the exported PDF is.
       */
      return (
        <aside className="deck-block hidden max-w-[66ch] rounded-r-xl border-l-2 border-primary/40 bg-primary/8 py-3.5 pr-5 pl-4.5 group-data-[notes=on]/deck:block print:hidden">
          <span className="mb-1.5 block font-mono text-[0.68rem] tracking-[0.2em] text-primary uppercase">
            30-sec narration
          </span>
          <p className="text-[length:var(--deck-annot)] leading-normal text-ink">{block.text}</p>
        </aside>
      );
  }
}

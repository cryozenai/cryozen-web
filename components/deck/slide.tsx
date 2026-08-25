import { Logo } from "@/components/logo";
import type { ContentSlide, TitleSlide } from "@/lib/decks/types";
import { DeckBlock } from "./blocks";
import { Lemniscate } from "./lemniscate";
import { RichText } from "./rich-text";

/*
 * A slide is a full viewport minus the site header, so paging through the deck
 * on the web feels like paging through it on a projector while the site's own
 * navigation stays where a visitor expects it. In print the height is pinned to
 * a 1280x720 page instead - see `app/pitch/deck.css`.
 */
const SLIDE =
  "deck-slide relative flex min-h-[calc(100svh-4rem)] scroll-mt-16 flex-col justify-center border-b border-hairline px-6 py-16 max-sm:pb-28 sm:px-10 lg:px-14";

/* The same column the rest of the site uses, so a slide and a marketing
   section line up when a visitor scrolls from one into the other. */
const INNER = "mx-auto w-full max-w-6xl";

const pad = (value: number) => String(value).padStart(2, "0");

export function TitleSlideView({ slide }: { slide: TitleSlide }) {
  return (
    <header id={slide.id} className={SLIDE}>
      <div className={`${INNER} grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]`}>
        <div>
          <p className="flex items-center gap-3 font-mono text-[0.72rem] tracking-[0.28em] text-muted uppercase">
            <Logo className="size-5 shrink-0" />
            <span>
              CryoZen <span aria-hidden="true">/</span>{" "}
              <span className="text-primary">{slide.meaning}</span>{" "}
              <span aria-hidden="true">/</span> {slide.version}
            </span>
          </p>
          <h1 className="text-flame deck-block text-[length:var(--deck-h1)] leading-[var(--deck-lh-head)] font-semibold tracking-tight text-balance">
            <RichText text={slide.title} />
          </h1>
          <p className="deck-block text-[length:var(--deck-lede)] leading-[var(--deck-lh-body)] text-ink text-pretty">
            <RichText text={slide.lede} />
          </p>
          <p className="deck-block font-mono text-[length:var(--deck-micro)] tracking-wide text-muted">{slide.foot}</p>
        </div>

        <div className="order-first lg:order-none">
          <Lemniscate className="block h-[34vh] w-full lg:h-[min(58vh,32rem)] print:h-[380px]" />
        </div>
      </div>
    </header>
  );
}

export function ContentSlideView({ slide, total }: { slide: ContentSlide; total: number }) {
  return (
    <section id={slide.id} className={SLIDE}>
      <div className={INNER}>
        <p className="flex items-center gap-3 font-mono text-[length:var(--deck-annot)] tracking-[0.24em] text-primary uppercase">
          <span aria-hidden="true" className="inline-block h-px w-6 bg-primary" />
          {slide.index !== undefined ? `${pad(slide.index)} / ` : null}
          {slide.eyebrow}
        </p>

        <h2 className="deck-block text-[length:var(--deck-h2)] leading-[var(--deck-lh-head)] font-semibold tracking-tight text-core text-balance">
          <RichText text={slide.title} />
        </h2>

        {slide.blocks.map((block, index) => (
          <DeckBlock key={`${block.kind}-${index}`} block={block} />
        ))}
      </div>

      {slide.index !== undefined ? (
        <span
          aria-hidden="true"
          className="absolute right-6 bottom-6 font-mono text-[0.72rem] tracking-[0.14em] text-muted sm:right-10 lg:right-16 print:hidden"
        >
          {pad(slide.index)} / {pad(total)}
        </span>
      ) : null}
    </section>
  );
}

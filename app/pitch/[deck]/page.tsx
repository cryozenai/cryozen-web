import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeckShell } from "@/components/deck/deck-shell";
import { ContentSlideView, TitleSlideView } from "@/components/deck/slide";
import { plainText } from "@/components/deck/rich-text";
import { decks, findDeck, numberedSlideCount } from "@/lib/decks";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return decks.map((deck) => ({ deck: deck.slug }));
}

/** Only the two decks exist; anything else is a 404 rather than a rendered miss. */
export const dynamicParams = false;

export async function generateMetadata(props: PageProps<"/pitch/[deck]">): Promise<Metadata> {
  const { deck: slug } = await props.params;
  const deck = findDeck(slug);
  if (!deck) return {};

  return {
    title: `${deck.label} seed deck`,
    description: deck.summary,
    alternates: { canonical: `/pitch/${deck.slug}` },
    openGraph: {
      title: `${site.name} ${deck.label} seed deck - ${deck.raise}`,
      description: deck.summary,
      url: `${site.url}/pitch/${deck.slug}`,
    },
  };
}

export default async function DeckPage(props: PageProps<"/pitch/[deck]">) {
  const { deck: slug } = await props.params;
  const deck = findDeck(slug);
  if (!deck) notFound();

  const total = numberedSlideCount(deck);
  const otherDeck = decks.find((candidate) => candidate.slug !== deck.slug) ?? deck;

  // The rail needs a label per slide for its `aria-label`; the title slide has
  // no eyebrow, so it borrows the deck's own name.
  const rail = deck.slides.map((slide) => ({
    id: slide.id,
    label: slide.kind === "title" ? `${deck.label} deck, title` : plainText(slide.eyebrow),
  }));

  return (
    <DeckShell slides={rail} otherDeck={{ slug: otherDeck.slug, label: otherDeck.label }}>
      <article className="deck-root">
        {deck.slides.map((slide) =>
          slide.kind === "title" ? (
            <TitleSlideView key={slide.id} slide={slide} />
          ) : (
            <ContentSlideView key={slide.id} slide={slide} total={total} />
          ),
        )}
      </article>
    </DeckShell>
  );
}

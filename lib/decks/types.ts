/**
 * The pitch decks are data, not markup.
 *
 * Every slide is a title plus an ordered list of typed blocks, and each block
 * kind has exactly one renderer in `components/deck`. That split is the point:
 * the copy is what changes between raises, and it changes without anyone
 * touching a class name, so the deck cannot drift away from the site's theme
 * the way a hand-written HTML deck does.
 *
 * Inline emphasis inside any string uses the two markers in `rich-text.tsx`:
 * `**strong**` for the white-hot core weight, and `==accent==` for cyan.
 */

export type Bullet = {
  /** The monospace marker in the gutter: "01", "→", "Q1", "Milestone 1". */
  mark: string;
  text: string;
};

export type Quadrant = {
  title: string;
  /** The named products, or for the winning quadrant a single descriptor. */
  names: string[];
  /** The occupied corner: rendered as the cyan-lit position, not a label. */
  win?: boolean;
};

export type AssumptionRow = {
  name: string;
  value: string;
  source: string;
  /**
   * A target we set rather than a figure someone published. Rendered in amber,
   * because a deck that cannot tell those apart is the one that gets caught.
   */
  unbenchmarked?: boolean;
  /** The summed row; gets the accent wash. */
  total?: boolean;
};

export type Block =
  | { kind: "lede"; text: string }
  | {
      kind: "klist";
      items: Bullet[];
      /**
       * Drop the 64ch reading measure. Only the appendix source lists set it:
       * they are citations scanned for a name and a date, not prose read line
       * by line, and at the deck's 24px print floor the narrow measure wraps
       * them off the bottom of the page.
       */
      wide?: boolean;
    }
  | { kind: "chips"; items: { label: string; hot?: boolean }[] }
  | { kind: "pillars"; items: { title: string; body: string }[] }
  | {
      kind: "columns";
      items: { title: string; sub: string; points: string[]; highlight?: boolean }[];
    }
  | { kind: "metrics"; items: { value: string; unit?: string; label: string }[] }
  | {
      kind: "matrix";
      yLabel: string;
      xLabel: { start: string; end: string };
      /** Reading order: top-left, top-right, bottom-left, bottom-right. */
      quadrants: [Quadrant, Quadrant, Quadrant, Quadrant];
    }
  | { kind: "funnel"; tiers: { tag: string; desc: string; value: string }[] }
  | { kind: "assumptions"; rows: AssumptionRow[] }
  | {
      kind: "plans";
      items: { name: string; price: string; priceNote?: string; desc: string; featured?: boolean }[];
    }
  | { kind: "funding"; bars: { label: string; percent: number }[]; milestones: Bullet[] }
  | { kind: "milestones"; items: Bullet[] }
  | { kind: "command"; steps: string[]; result: string }
  | { kind: "note"; text: string }
  | { kind: "signoff"; text: string }
  /**
   * The 30-second spoken track for the slide. Hidden by default on the web and
   * in print, and revealed by the Notes toggle in the deck chrome, because it
   * is a speaker aid rather than slide copy.
   */
  | { kind: "narration"; text: string };

export type TitleSlide = {
  kind: "title";
  id: string;
  /** The mark line above the headline: name, meaning, version. */
  meaning: string;
  version: string;
  title: string;
  lede: string;
  foot: string;
};

export type ContentSlide = {
  kind: "content";
  id: string;
  /**
   * Position in the numbered body of the deck. Present on the slides an
   * investor pages through; absent on appendix slides, which are unnumbered so
   * the "07 / 12" counter keeps meaning what it says.
   */
  index?: number;
  eyebrow: string;
  title: string;
  blocks: Block[];
};

export type Slide = TitleSlide | ContentSlide;

export type Deck = {
  slug: string;
  /** Short label for the deck switcher and the index page. */
  label: string;
  title: string;
  /** One line for the index card and the page description. */
  summary: string;
  beachhead: string;
  raise: string;
  slides: Slide[];
};

/**
 * The denominator in the "07 / 12" stamp.
 *
 * It is the highest slide number, not a count of numbered slides: the deck
 * opens on an unnumbered title slide and the body picks up at 02, so counting
 * would print "02 / 11" under a slide labelled 02 of a twelve-slide run.
 * Derived rather than stored, so adding a slide cannot leave a stale total
 * printed in the corner of every other one.
 */
export function numberedSlideCount(deck: Deck): number {
  return deck.slides.reduce(
    (highest, slide) =>
      slide.kind === "content" && slide.index !== undefined
        ? Math.max(highest, slide.index)
        : highest,
    0,
  );
}

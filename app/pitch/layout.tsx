import "./deck.css";

/**
 * The pitch decks are unlisted, not secret: they carry a "confidential" mark
 * and a live URL is what gets pasted into an investor email, so they must not
 * turn up in a search for the product. `noindex` here covers `/pitch` and both
 * decks in one place, and they are left out of `app/sitemap.ts` and the nav for
 * the same reason. Delete this block to make them public.
 */
export const metadata = {
  robots: { index: false, follow: false },
};

export default function PitchLayout({ children }: LayoutProps<"/pitch">) {
  return children;
}

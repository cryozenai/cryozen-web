import { developerDeck } from "./developer";
import { enterpriseDeck } from "./enterprise";
import type { Deck } from "./types";

/**
 * Ordered as they are pitched: the enterprise variant leads, because it is the
 * one that matches the founder's access to the buyer.
 */
export const decks: Deck[] = [enterpriseDeck, developerDeck];

export function findDeck(slug: string): Deck | undefined {
  return decks.find((deck) => deck.slug === slug);
}

export const deckSlugs = decks.map((deck) => deck.slug);

export * from "./types";

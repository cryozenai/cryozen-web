/**
 * Measured product facts the pitch decks quote.
 *
 * Seam: the public cryozen-releases channel publishes a `facts.json`, vendored as
 * `lib/release-facts.json`, but it does not carry measured metrics yet
 * (`metrics: null`), so these stay here in one place. When it does, derive them
 * from that snapshot and delete this constant.
 *
 * `version` is the release the decks were verified against (v1.1.0), kept
 * deliberately separate from the channel's current `version` (v1.2.0).
 *
 * Never type these from memory. How each was measured, on cryozen 314d7e1:
 * - version: the latest tag published to cryozen-releases at measurement time.
 * - testsPassing: `pytest tests -q`, 3207 passed and 4 skipped of 3211 collected.
 *
 * The decks state the module and service counts as "51 / 94" in their own text:
 * `.py` files directly in routers/ and services/, not counting `__init__.py`.
 * services/ also has three subpackages, so its recursive count is 119.
 */
export const productFacts = {
  version: "v1.1.0",
  testsPassing: "3,207",
} as const;

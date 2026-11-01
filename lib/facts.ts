/**
 * Measured product facts the pitch decks quote.
 *
 * Seam: the org plan publishes a `facts.json` from the product's release job to
 * the public cryozen-releases repository. It does not exist yet, so these stay
 * here in one place. When it ships, read it at build time and delete this
 * constant; nothing else needs to change.
 *
 * Never type these from memory. How each was measured, on cryozen 314d7e1:
 * - version: the latest tag published to cryozen-releases.
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

# cryozen-web

The marketing and download site for [CryoZen](https://github.com/shreejitverma/cryozen), served at **cryozen.ai**.

It is a Next.js App Router site on Vercel.
Every download button resolves to a real asset on GitHub Releases when release metadata is readable, and falls back to the releases page when it is not.
Metadata is fetched from the GitHub API and revalidated hourly, so a new product release appears on the site without a redeploy.

## Stack

- Next.js 16 (App Router, TypeScript, React Compiler)
- Tailwind CSS v4, configured entirely in `app/globals.css`
- `react-markdown` + `remark-gfm` for rendering release notes on the changelog
- Deployed on Vercel

## Local development

Node 24, pinned in two places that are kept in lockstep on purpose.
`.nvmrc` pins local development and CI, which reads it through `actions/setup-node`'s `node-version-file`.
`engines.node` is pinned to `24.x` in `package.json` and is what Vercel resolves the build and function runtime from; Vercel never reads `.nvmrc`.
Neither pin is redundant, so do not drop one for the other: whichever half loses its pin drifts to a different major than the other two.
Bump `.nvmrc` and `engines.node` together, in one commit, so the move is deliberate and visible.
`@types/node` belongs to that same lockstep: its major *is* the Node major it describes, so Dependabot is configured never to raise it on its own.
Move all three in the same commit.

```bash
npm install
npm run dev
```

The site runs on `http://localhost:3000`.

```bash
npm run build   # production build, also type-checks the project
npm run lint    # eslint
```

## Continuous integration

`.github/workflows/ci.yml` runs `npm ci`, `npm run lint`, and `npm run build` on every pull request and on every push to `main`.
The build step type-checks the whole project, so there is no separate `tsc` job.

CI deliberately runs **without** a `GITHUB_TOKEN`.
That keeps the fallback path in `lib/releases.ts` under test: if an unreachable GitHub API ever started failing the build instead of degrading to the releases page, CI would catch it.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `GITHUB_TOKEN` | No, but see below | Authenticates the GitHub API calls that read releases, and lifts the unauthenticated rate limit (60 requests/hour per IP) during builds and revalidation. |

The product repository `shreejitverma/cryozen` is private today.
Until it is made public, the releases API returns 404 to anonymous callers, so a token with `repo` scope is required for any release data to appear on the site at all.
Once the repository is public, a token with no scopes is enough and only serves to raise the rate limit.

Copy `.env.example` to `.env.local` and fill in the token.
Without a working token the site still builds: every GitHub call degrades to the releases page instead of failing, so the download buttons and the changelog quietly fall back rather than reporting the 404.

## Theme

The palette lives in one place, the `@theme` block in `app/globals.css`.
It is an ice-fire scheme: a near-black blue ground, a glacial cyan primary, and a white-hot core reserved for headlines and emphasis.

| Token | Value | Used for |
| --- | --- | --- |
| `--color-ground` | `#05080F` | Page ground |
| `--color-surface` | `#0B1119` | Panels |
| `--color-elevated` | `#101A24` | Inputs, code blocks |
| `--color-hairline` | `#1A2836` | Borders |
| `--color-primary` | `#4FE3E8` | Links, CTAs |
| `--color-primary-strong` | `#2CCFD6` | Pressed state of primary CTAs |
| `--color-glow` | `#7FF2FF` | Hover, flame edge |
| `--color-core` | `#EAFCFF` | Headings, emphasis |
| `--color-deep` | `#1E5F8C` | Cold ember shadow |
| `--color-ink` | `#C9D6E3` | Body text |
| `--color-muted` | `#7C8DA1` | Secondary text |

Two custom utilities carry the look: `text-flame` (the headline gradient) and `panel` (the hairline card with a cold inner light).

Links inside prose use the exported `textLink` style from `components/ui.tsx`, which underlines them.
That underline is a WCAG 1.4.1 requirement rather than a stylistic preference; the comment on `textLink` records why this palette cannot be exempted from it, and Lighthouse flags a regression as `link-in-text-block`.

Colour tokens must not reuse a name from Tailwind's default font-size scale (`xs`, `sm`, `base`, `lg`, `xl`, and the `Nxl` steps).
`text-<name>` resolves font sizes before colours, so a `--color-base` token would make `text-base` a font size everywhere and silently drop the colour.
That is why the page ground is `--color-ground`.

## Structure

```
app/
  page.tsx            home
  download/           per-platform installers and the Docker path
  pricing/            tiers and FAQ
  changelog/          GitHub releases, rendered as markdown
  privacy/ terms/     legal
  opengraph-image.tsx generated social card
  sitemap.ts robots.ts
components/           header, footer, CTAs, primitives
lib/
  site.ts             names, URLs, nav
  platforms.ts        per-platform asset names, requirements, install steps
  releases.ts         GitHub Releases client with graceful fallbacks
  pricing.ts          tiers and FAQ copy
```

## Keeping downloads correct

`lib/platforms.ts` hardcodes the release asset filenames:

| Platform | Asset |
| --- | --- |
| macOS | `CryoZen.dmg` |
| Windows | `CryoZen-Windows-Portable.zip` |
| Linux | `CryoZen-Linux-Portable.tar.gz` |

These must match what `.github/workflows/release.yml` in the product repository uploads.
If a build script renames an artifact, update `lib/platforms.ts` in the same change, otherwise the button silently falls back to the releases page.

## Before launch

Open items are marked `TODO(cryozen)` in the source:

- `lib/site.ts` — confirm the `hello@cryozen.ai` mailbox exists.
- `lib/pricing.ts` — set real prices on the Team and Enterprise tiers. They currently render as "Pricing on request" rather than an invented number.
- `app/privacy/page.tsx`, `app/terms/page.tsx` — have counsel review.
- `components/workspace-preview.tsx` — replace the stylized frame with a real screenshot of the running app.

## Security headers

`next.config.ts` sets a Content Security Policy, HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and `X-DNS-Prefetch-Control` on every route.
The reasoning for each non-obvious choice is in the comments there rather than repeated here, but three are worth knowing before you touch them:

- `script-src` allows `'unsafe-inline'`. Next inlines its bootstrap and streaming payload, so the alternative is per-request nonces, which require middleware and make every page dynamic. This site has no forms, no auth, and no cookies, and the only third-party content is release-note markdown that `react-markdown` escapes. Add nonces when any of that stops being true.
- `Strict-Transport-Security` includes `includeSubDomains`, which commits every future `*.cryozen.ai` host to HTTPS. It deliberately omits `preload`, since being baked into browsers is slow to reverse and should be an explicit submission.
- `img-src` allows `github.com` and `*.githubusercontent.com` so screenshots embedded in GitHub release notes render on `/changelog`. Those are the only third-party origins the site can load, and it means viewing a changelog entry with an embedded screenshot reveals the visitor to GitHub.

The policy is verified by loading every page in a real browser and confirming zero console messages, and by checking that every request the site makes of its own accord is same-origin, with release-note images the sole exception.
That is what makes the strict `font-src` and `connect-src` correct: `next/font` self-hosts Geist at build time, so there is no font CDN to allow.

## Dependencies

`.github/dependabot.yml` opens weekly npm updates, with minor and patch bumps grouped into one pull request so review attention goes to majors, and monthly updates for the pinned GitHub Actions.

## Deploying

Import the repository into Vercel, set the production domain to `cryozen.ai`, and add `GITHUB_TOKEN`.
While the product repository is private that token is what makes release data resolve at all; once it is public the token only raises the API rate limit.
The framework preset, build command, and output are all detected automatically.

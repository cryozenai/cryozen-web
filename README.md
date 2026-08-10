# cryozen-web

The marketing and download site for [CryoZen](https://github.com/shreejitverma/cryozen), served at **cryozen.ai**.

It is a Next.js App Router site on Vercel.
Every download button points at a real asset on GitHub Releases, and release metadata is fetched from the GitHub API and revalidated hourly, so a new product release appears on the site without a redeploy.

## Stack

- Next.js 16 (App Router, TypeScript, React Compiler)
- Tailwind CSS v4, configured entirely in `app/globals.css`
- `react-markdown` + `remark-gfm` for rendering release notes on the changelog
- Deployed on Vercel

## Local development

```bash
npm install
npm run dev
```

The site runs on `http://localhost:3000`.

```bash
npm run build   # production build
npm run lint    # eslint
```

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `GITHUB_TOKEN` | No | Lifts the unauthenticated GitHub API rate limit (60 requests/hour per IP) during builds and revalidation. A token with no scopes is enough; the repository is public. |

Copy `.env.example` to `.env.local` if you need it locally.
Without a token the site still builds: every GitHub call degrades to the releases page instead of failing.

## Theme

The palette lives in one place, the `@theme` block in `app/globals.css`.
It is an ice-fire scheme: a near-black blue ground, a glacial cyan primary, and a white-hot core reserved for headlines and emphasis.

| Token | Value | Used for |
| --- | --- | --- |
| `--color-base` | `#05080F` | Page ground |
| `--color-surface` | `#0B1119` | Panels |
| `--color-elevated` | `#101A24` | Inputs, code blocks |
| `--color-hairline` | `#1A2836` | Borders |
| `--color-primary` | `#4FE3E8` | Links, CTAs |
| `--color-glow` | `#7FF2FF` | Hover, flame edge |
| `--color-core` | `#EAFCFF` | Headings, emphasis |
| `--color-deep` | `#1E5F8C` | Cold ember shadow |
| `--color-ink` | `#C9D6E3` | Body text |
| `--color-muted` | `#7C8DA1` | Secondary text |

Two custom utilities carry the look: `text-flame` (the headline gradient) and `panel` (the hairline card with a cold inner light).

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

## Deploying

Import the repository into Vercel, set the production domain to `cryozen.ai`, and add `GITHUB_TOKEN` if you want the higher API rate limit.
The framework preset, build command, and output are all detected automatically.

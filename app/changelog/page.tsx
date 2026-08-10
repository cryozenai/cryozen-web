import type { Metadata } from "next";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ButtonLink, Card, Container, Eyebrow, textLink } from "@/components/ui";
import { formatBytes, formatDate, getReleases } from "@/lib/releases";
import { releasesUrl } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Changelog",
  description: "Every CryoZen release, straight from GitHub Releases.",
  alternates: { canonical: "/changelog" },
};

/*
 * react-markdown hands every override the hast `node` alongside the DOM props,
 * so each one is destructured away before the rest is spread onto an intrinsic
 * element. Spreading it through would serialize as node="[object Object]".
 */
const markdownComponents: Components = {
  h1: ({ node, ...props }) => (
    <h3 className="mt-6 mb-3 text-base font-semibold text-core" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h3 className="mt-6 mb-3 text-base font-semibold text-core" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h4 className="mt-5 mb-2 text-sm font-semibold text-core" {...props} />
  ),
  p: ({ node, ...props }) => <p className="my-3 text-sm/7 text-muted" {...props} />,
  ul: ({ node, ...props }) => (
    <ul className="my-3 list-disc space-y-1.5 pl-5 text-sm/7 text-muted marker:text-primary/60" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="my-3 list-decimal space-y-1.5 pl-5 text-sm/7 text-muted marker:text-primary/60" {...props} />
  ),
  a: ({ node, ...props }) => (
    <a className={textLink} target="_blank" rel="noreferrer" {...props} />
  ),
  code: ({ node, ...props }) => (
    <code
      className="rounded border border-hairline bg-elevated px-1.5 py-0.5 font-mono text-[0.85em] text-glow"
      {...props}
    />
  ),
  pre: ({ node, ...props }) => (
    <pre
      className="my-4 overflow-x-auto rounded-lg border border-hairline bg-elevated/70 p-4 font-mono text-xs text-ink"
      {...props}
    />
  ),
  hr: () => <hr className="my-6 border-hairline" />,
  strong: ({ node, ...props }) => (
    <strong className="font-semibold text-ink" {...props} />
  ),
};

export default async function ChangelogPage() {
  const releases = await getReleases(20);

  return (
    <Container className="py-16 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>Changelog</Eyebrow>
        <h1 className="text-flame mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          What changed, and when.
        </h1>
        <p className="mt-5 text-base/7 text-muted text-pretty">
          Notes are pulled from GitHub Releases and refreshed hourly.
        </p>
      </div>

      {releases.length === 0 ? (
        <Card className="mx-auto mt-14 max-w-2xl p-10 text-center">
          <h2 className="text-lg font-semibold text-core">No releases published yet</h2>
          <p className="mx-auto mt-3 max-w-md text-sm/6 text-muted">
            Once a version tag is pushed, its notes and build artifacts appear here
            automatically.
          </p>
          <ButtonLink href={releasesUrl} variant="secondary" className="mt-7">
            Check GitHub Releases
          </ButtonLink>
        </Card>
      ) : (
        <div className="mx-auto mt-14 max-w-3xl space-y-4">
          {releases.map((release) => (
            <Card key={release.tag} className="p-7 sm:p-9">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-mono text-lg font-semibold text-core">{release.tag}</h2>
                {release.prerelease ? (
                  <span className="rounded-full border border-hairline px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
                    Pre-release
                  </span>
                ) : null}
                {release.publishedAt ? (
                  <time
                    dateTime={release.publishedAt}
                    className="text-xs text-muted"
                  >
                    {formatDate(release.publishedAt)}
                  </time>
                ) : null}
              </div>

              {release.name !== release.tag ? (
                <p className="mt-2 text-sm text-ink">{release.name}</p>
              ) : null}

              {release.body ? (
                <div className="mt-4">
                  <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {release.body}
                  </Markdown>
                </div>
              ) : (
                <p className="mt-4 text-sm/6 text-muted">No notes were attached to this release.</p>
              )}

              {release.assets.length > 0 ? (
                <div className="mt-6 border-t border-hairline pt-5">
                  <h3 className="text-xs font-semibold tracking-[0.14em] text-core uppercase">
                    Downloads
                  </h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {release.assets.map((asset) => (
                      <li key={asset.name}>
                        <a
                          href={asset.downloadUrl}
                          className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-elevated/60 px-3 py-2 font-mono text-xs text-ink transition-colors duration-150 hover:border-primary/50 hover:text-core"
                        >
                          {asset.name}
                          <span className="text-muted">{formatBytes(asset.size)}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <a
                href={release.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className={`${textLink} mt-6 inline-flex text-xs`}
              >
                View on GitHub
              </a>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}

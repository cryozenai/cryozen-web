import type { Metadata } from "next";
import {
  ButtonLink,
  Card,
  Container,
  Eyebrow,
  InlineCode,
  primaryButton,
  textLink,
} from "@/components/ui";
import { PlatformIcon } from "@/components/platform-icon";
import { CopyCommand } from "@/components/copy-command";
import { desktopPlatforms, dockerCommands, getPlatform } from "@/lib/platforms";
import {
  assetSizeFor,
  assetUrlByName,
  downloadUrlFor,
  formatDate,
  getLatestRelease,
} from "@/lib/releases";
import { ghcrImage, releasesRepoUrl, deploymentDocsUrl, releasesUrl } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Download",
  description:
    "Download CryoZen for macOS, Windows, or Linux, or run it with Docker. Every build is published on GitHub Releases.",
  alternates: { canonical: "/download" },
};

export default async function DownloadPage() {
  const release = await getLatestRelease();
  const docker = getPlatform("docker");
  const published = formatDate(release?.publishedAt ?? null);

  return (
    <Container className="py-16 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>Download</Eyebrow>
        <h1 className="text-flame mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Install CryoZen on your machine.
        </h1>
        <p className="mt-5 text-base/7 text-muted text-pretty">
          {release ? (
            <>
              Latest release{" "}
              <span className="font-mono text-primary">{release.tag}</span>
              {published ? `, published ${published}` : null}. Builds come straight from GitHub
              Releases.
            </>
          ) : (
            <>
              Builds are published on{" "}
              <a
                href={releasesUrl}
                target="_blank"
                rel="noreferrer"
                className={textLink}
              >
                GitHub Releases
              </a>
              . If a button below sends you to the releases page, that platform&apos;s asset is
              not attached to the latest tag yet.
            </>
          )}
        </p>
      </div>

      {/*
        Desktop builds. The subgrid keeps Requirements, After downloading, and
        the download button on the same baseline across all three cards, even
        though the copy above them wraps to different heights.
      */}
      <div className="mt-14 grid gap-4 lg:grid-cols-3 lg:grid-rows-[repeat(8,auto)]">
        {desktopPlatforms.map((platform) => {
          const href = downloadUrlFor(platform.id, release);
          const size = assetSizeFor(platform.id, release);
          return (
            <Card
              key={platform.id}
              className="flex flex-col p-7 lg:row-span-8 lg:grid lg:grid-rows-subgrid"
            >
              <PlatformIcon platform={platform.id} className="size-7 text-primary" />
              <h2 className="mt-5 text-xl font-semibold text-core">{platform.name}</h2>
              <p className="mt-1 font-mono text-xs text-muted">
                {platform.fileLabel}
                {size ? ` · ${size}` : ""}
              </p>
              <p className="mt-4 text-sm/6 text-muted">{platform.summary}</p>

              <div className="mt-6">
                <h3 className="text-xs font-semibold tracking-[0.14em] text-core uppercase">
                  Requirements
                </h3>
                <ul className="mt-3 space-y-1.5">
                  {platform.requirements.map((requirement) => (
                    <li key={requirement} className="text-sm/6 text-muted">
                      {requirement}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 flex-1">
                <h3 className="text-xs font-semibold tracking-[0.14em] text-core uppercase">
                  After downloading
                </h3>
                <ol className="mt-3 space-y-2">
                  {platform.steps.map((step, index) => (
                    <li key={step} className="flex gap-3 text-sm/6 text-muted">
                      <span className="font-mono text-xs text-primary">{index + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <a
                href={href}
                className={`${primaryButton} mt-8 inline-flex gap-2 px-5 py-3`}
              >
                Download for {platform.shortName}
              </a>

              {platform.alternates?.length ? (
                <ul className="mt-4 space-y-1.5">
                  {platform.alternates.map((alternate) => (
                    <li key={alternate.assetName} className="text-center">
                      <a
                        href={assetUrlByName(alternate.assetName, release)}
                        className="font-mono text-xs text-muted transition-colors duration-150 hover:text-core"
                      >
                        {alternate.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          );
        })}
      </div>

      {/* Docker */}
      <Card id="docker" className="mt-6 scroll-mt-24 p-7 lg:p-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <PlatformIcon platform="docker" className="size-7 text-primary" />
            <h2 className="mt-5 text-xl font-semibold text-core">Docker</h2>
            <p className="mt-1 font-mono text-xs text-muted">{docker.fileLabel}</p>
            <p className="mt-4 text-sm/6 text-muted">{docker.summary}</p>
            <ul className="mt-6 space-y-1.5">
              {docker.requirements.map((requirement) => (
                <li key={requirement} className="text-sm/6 text-muted">
                  {requirement}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm/6 text-muted">
              Images are also published to <InlineCode>{ghcrImage}</InlineCode> on every tagged
              release.
            </p>
          </div>

          <div className="min-w-0">
            <div className="space-y-2">
              {dockerCommands.map((command) => (
                <CopyCommand key={command} command={command} />
              ))}
            </div>
            <p className="mt-4 text-sm/6 text-muted">
              The stack comes up on <InlineCode>http://localhost:7000</InlineCode>. Create the
              first administrator account when prompted, then connect a model on the
              integrations page.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href={deploymentDocsUrl} variant="secondary">
                Deployment guide
              </ButtonLink>
              <ButtonLink href={releasesRepoUrl} variant="secondary">
                Compose bundle on GitHub
              </ButtonLink>
            </div>
          </div>
        </div>
      </Card>

      {/* Notes */}
      <div className="mt-14 grid gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-core">
            The desktop builds are not code-signed yet
          </h3>
          <p className="mt-3 text-sm/6 text-muted">
            macOS Gatekeeper blocks the first launch of an unsigned app. Right-click CryoZen in
            Applications, choose Open, then confirm. Windows SmartScreen shows a similar prompt:
            choose More info, then Run anyway.
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-core">Self-contained, and your data stays put</h3>
          <p className="mt-3 text-sm/6 text-muted">
            Every desktop build bundles its own runtime - no Python, no dependencies, no first-run
            setup. Your data lives in your user folder, so upgrading is replacing the app, and
            uninstalling never touches your data.
          </p>
        </Card>
      </div>

      <p className="mt-10 text-center text-sm text-muted">
        Looking for an older version?{" "}
        <a
          href={releasesUrl}
          target="_blank"
          rel="noreferrer"
          className={textLink}
        >
          Browse every release on GitHub
        </a>
        .
      </p>
    </Container>
  );
}

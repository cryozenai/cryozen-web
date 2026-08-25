import Link from "next/link";
import {
  ButtonLink,
  Card,
  Container,
  Eyebrow,
  SectionHeading,
  textLink,
} from "@/components/ui";
import { DownloadCta } from "@/components/download-cta";
import { WorkspacePreview } from "@/components/workspace-preview";
import { PlatformIcon } from "@/components/platform-icon";
import { ArrowIcon, CheckIcon } from "@/components/icons";
import { platforms } from "@/lib/platforms";
import {
  assetSizeFor,
  assetUrlByName,
  downloadUrlFor,
  getLatestRelease,
} from "@/lib/releases";
import { quickstartUrl, releasesUrl } from "@/lib/site";

export const revalidate = 3600;

const features = [
  {
    title: "Chat with any model",
    body: "Connect local backends (Ollama, llama.cpp, vLLM, LM Studio) or hosted providers (OpenAI, Anthropic, Groq, DeepSeek, GitHub Copilot). Compare answers from several models side by side.",
  },
  {
    title: "Agents with real tools",
    body: "Give a model shell access, file access, web search, and MCP servers so it can finish multi-step work, inside a workspace boundary that confines what it can touch.",
  },
  {
    title: "Research that cites its sources",
    body: "An engine that searches, crawls, and synthesizes a cited report, backed by its own SearXNG instance so queries never reach a third-party search engine.",
  },
  {
    title: "Your documents, indexed locally",
    body: "PDFs, Office files, and text go into a local vector store for retrieval-augmented generation, plus long-term semantic memory that carries across conversations.",
  },
  {
    title: "Mail, calendar, and contacts",
    body: "A full IMAP and SMTP client with scheduled sending and reminders, CalDAV and CardDAV sync, tasks, and automations that run on a schedule or fire a webhook.",
  },
  {
    title: "Serve models on your own hardware",
    body: "Scan GPU and memory, get quantization recommendations that actually fit, and start or stop model servers, including over SSH on a remote host.",
  },
];

const guarantees = [
  {
    title: "Binds to localhost by default",
    body: "The server listens on 127.0.0.1. Nothing is reachable from your network until you decide it should be.",
  },
  {
    title: "Credentials encrypted at rest",
    body: "API keys, mail passwords, and OAuth tokens are encrypted in your own database, on your own disk.",
  },
  {
    title: "No telemetry",
    body: "No analytics, no phone-home, no usage beacons. There is no build of CryoZen that reports on you.",
  },
  {
    title: "Data leaves only when you say so",
    body: "Connect a hosted model or an external mailbox and traffic goes there. Connect nothing and nothing leaves.",
  },
];

const audiences = [
  {
    label: "Individuals",
    body: "One private workspace for chat, research, mail, and notes.",
  },
  {
    label: "Teams",
    body: "A shared instance behind your own reverse proxy, with per-user accounts and per-user data.",
  },
  {
    label: "Developers",
    body: "An agent that runs shell commands, reads and writes files, searches the web, and calls MCP servers under your supervision.",
  },
];

export default async function HomePage() {
  const latest = await getLatestRelease();
  const release = latest.release;

  const links = {
    macos: downloadUrlFor("macos", latest),
    windows: downloadUrlFor("windows", latest),
    linux: downloadUrlFor("linux", latest),
    docker: "/download#docker",
  };

  const sizes = {
    macos: assetSizeFor("macos", latest),
    windows: assetSizeFor("windows", latest),
    linux: assetSizeFor("linux", latest),
  };

  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-16 sm:pt-28">
        <Container className="flex flex-col items-center text-center">
          {release ? (
            <Link href="/changelog" className="group">
              <Eyebrow>
                <span className="size-1.5 animate-ember rounded-full bg-primary" />
                {release.tag} is out
                <ArrowIcon className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
              </Eyebrow>
            </Link>
          ) : (
            <Eyebrow>Self-hosted AI workspace</Eyebrow>
          )}

          <h1 className="text-flame mt-7 max-w-4xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Your AI workspace. On hardware you control.
          </h1>

          <p className="mt-6 max-w-2xl text-lg/8 text-muted text-pretty">
            CryoZen runs chat, autonomous agents, document search, and a mail, calendar, and
            contacts client as one application on your own machine. Point it at local models or
            your own API keys. Nothing leaves unless you configure an integration that sends it
            there.
          </p>

          <div className="mt-10">
            <DownloadCta
              links={links}
              sizes={sizes}
              intelHref={assetUrlByName("CryoZen-Intel.dmg", latest)}
            />
          </div>

          <div className="mt-16 w-full max-w-5xl text-left">
            <WorkspacePreview />
          </div>
        </Container>
      </section>

      {/* Privacy guarantees */}
      <section className="py-16">
        <Container>
          <SectionHeading
            eyebrow="Private by construction"
            title="Not a promise in a policy. A property of where it runs."
            description="CryoZen is a server you start on your own hardware. The guarantees below are structural, not contractual."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {guarantees.map((item) => (
              <Card key={item.title} className="p-6">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <CheckIcon />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-core">{item.title}</h3>
                    <p className="mt-2 text-sm/6 text-muted">{item.body}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="py-16">
        <Container>
          <SectionHeading
            eyebrow="What it does"
            title="Everything below ships in the application today."
            description="Not a roadmap. These are the surfaces you get on first launch."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="p-6">
                <h3 className="text-base font-semibold text-core">{feature.title}</h3>
                <p className="mt-3 text-sm/6 text-muted">{feature.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Audiences */}
      <section className="py-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <SectionHeading
              align="left"
              eyebrow="Who it is for"
              title="People who want the capability without handing over the data."
              description="The same install scales from one laptop to a shared instance behind your own proxy."
            />
            <div className="grid gap-4">
              {audiences.map((audience) => (
                <Card key={audience.label} className="flex gap-5 p-6">
                  <span className="font-mono text-xs tracking-widest text-primary uppercase">
                    {audience.label}
                  </span>
                  <p className="text-sm/6 text-muted">{audience.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Platforms */}
      <section className="py-16">
        <Container>
          <SectionHeading
            eyebrow="Install it"
            title="macOS, Windows, Linux, and Docker."
            description="Desktop builds run a local server and open CryoZen in your browser. Docker is the path for servers and GPUs."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {platforms.map((platform) => (
              <Link key={platform.id} href="/download" className="group">
                <Card className="h-full p-6 transition-colors duration-150 group-hover:border-primary/40">
                  <PlatformIcon platform={platform.id} className="size-6 text-primary" />
                  <h3 className="mt-4 text-base font-semibold text-core">{platform.name}</h3>
                  <p className="mt-2 text-xs text-muted">{platform.fileLabel}</p>
                  <p className="mt-4 text-sm/6 text-muted">{platform.summary}</p>
                </Card>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Closing CTA */}
      <section className="py-16">
        <Container>
          <Card className="relative overflow-hidden px-8 py-14 text-center sm:px-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 -top-32 mx-auto h-64 w-2/3 rounded-full blur-3xl"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(127,242,255,0.22), transparent 70%)",
              }}
            />
            <h2 className="text-3xl font-semibold tracking-tight text-core text-balance sm:text-4xl">
              Run it tonight on the machine in front of you.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base/7 text-muted text-pretty">
              Download a build, or clone the repository and bring it up with Docker Compose in
              three commands.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href="/download">Download CryoZen</ButtonLink>
              <ButtonLink href={quickstartUrl} variant="secondary">
                Read the quickstart
              </ButtonLink>
            </div>
            <p className="mt-6 text-xs text-muted">
              Every build is published on{" "}
              <a
                href={releasesUrl}
                target="_blank"
                rel="noreferrer"
                className={textLink}
              >
                GitHub Releases
              </a>
              .
            </p>
          </Card>
        </Container>
      </section>
    </>
  );
}

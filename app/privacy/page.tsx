import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "@/components/legal";
import { site } from "@/lib/site";

/*
 * TODO(cryozen): have counsel review this before launch. It describes the
 * product and this website accurately, but it is not legal advice and it does
 * not attempt to enumerate obligations under any specific jurisdiction.
 */

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What CryoZen collects, which is almost nothing: the application sends no telemetry and this website runs no analytics.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "1 November 2026";

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy" updated={UPDATED}>
      <LegalSection title="The short version">
        <p>
          The CryoZen application runs on hardware you control and sends us nothing. It can contact
          other services, and the main ones are listed below. This website runs no analytics and sets no tracking cookies. We hold no account for you unless you
          email us.
        </p>
      </LegalSection>

      <LegalSection title="The application">
        <p>
          CryoZen is self-hosted. Your conversations, documents, mail, calendar entries, contacts,
          credentials, and model outputs are stored in the database on the machine where you run
          it. We have no access to that machine and no mechanism to reach it.
        </p>
        <LegalList
          items={[
            "The server binds to 127.0.0.1 by default and is not reachable from your network until you change that.",
            "Credentials, including API keys and OAuth tokens, are encrypted at rest in your own database.",
            "The application contains no telemetry, analytics, crash reporting, or usage beacons.",
          ]}
        />
        <p>
          These are the main ways data leaves your machine today. The list is not exhaustive: any service you connect, or that an agent you run can reach, receives what is sent to it.
        </p>
        <LegalList
          items={[
            "Model providers: if you connect a hosted provider, your prompts go to that provider under their terms.",
            "Mail, calendar, contacts, and linked accounts: if you connect a mailbox, a calendar, a contacts server, or a Google or Microsoft account, CryoZen talks to that service on your behalf.",
            "Web search: with the Docker stack, queries go through your own SearXNG proxy, which asks public search engines (Bing, Mojeek, and Presearch by default). If SearXNG is unavailable or returns nothing, as on a desktop build, CryoZen sends the query directly to DuckDuckGo from your machine. You can change the providers and the fallback, or disable search, in settings.",
            "Research and web pages: research fetches the pages it finds from the sites that host them, and those sites see your IP address. YouTube links you give it are fetched from YouTube.",
            "Agent tools: an MCP server you connect over the network receives the tool calls sent to it, and shell commands an agent runs can reach whatever your machine can.",
            "Webhooks: a webhook you configure receives the events you subscribe it to.",
            "Remote model hosts and downloads: serving a model over SSH sends commands to that host, and downloading a model fetches it from its source, such as Hugging Face or Ollama.",
            "Rendering libraries: from v1.2.0, math, diagrams, and emoji are bundled with the app, so its pages load nothing from a CDN and render without internet access. Version 1.1.0 and earlier load KaTeX and Mermaid from the public jsDelivr CDN, which sees your IP address and browser details, not your conversations.",
            "Local embeddings: if no embedding server is configured, the first use of the built-in embedding model downloads it from the internet.",
          ]}
        />
      </LegalSection>

      <LegalSection title="This website">
        <p>
          {site.domain} is a static marketing site hosted on Vercel. We do not run analytics
          scripts, advertising pixels, or session recording, and we set no cookies. Vercel
          processes standard server request logs, including IP address and user agent, as part of
          serving and protecting the site.
        </p>
        <p>
          Download buttons link directly to GitHub Releases. When you download a build, GitHub
          serves that file and applies its own privacy practices. Release metadata shown on the
          download and changelog pages is fetched from the GitHub API by our server, not by your
          browser.
        </p>
      </LegalSection>

      <LegalSection title="Email">
        <p>
          If you contact {site.contactEmail}, we keep that correspondence so we can answer you and
          maintain a record of what was agreed. We do not add you to a mailing list from a support
          email.
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          Because the application stores your data on your own hardware, deletion and export are
          in your hands: remove the data directory, or use the application&apos;s own export
          tools. For any personal data we hold from correspondence, write to{" "}
          {site.contactEmail} to request access or deletion.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If this policy changes materially, the updated date above changes with it and the
          previous text stays in the site&apos;s git history.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

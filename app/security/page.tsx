import type { Metadata } from "next";
import { Card, Container, Eyebrow, SectionHeading, textLink } from "@/components/ui";
import { breadcrumbJsonLd, JsonLd, softwareApplicationJsonLd } from "@/lib/seo";
import { desktopPort, dockerPort } from "@/lib/platforms";
import { latestReleaseUrl, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Security",
  description: "What CryoZen stores, when it connects to other services, and the limits of its protections.",
  alternates: { canonical: "/security" },
};

const protections = [
  ["App listener", `The desktop app and the default Docker Compose port mapping bind to 127.0.0.1: port ${desktopPort} for the desktop app and ${dockerPort} for Docker Compose.`],
  ["Compose services", "ChromaDB (8100), SearXNG (8080), and ntfy (8091) publish on host loopback. Containers also communicate over the Compose network."],
  ["Encrypted at rest", "Stored model endpoint keys, mail passwords, linked-account tokens, the vault session, and saved signatures use Fernet encryption. The key lives in the data directory. API bearer tokens are hashed."],
  ["Other local data", "CardDAV contact credentials are stored in plain text in the instance settings. Protect the data directory and backups, which hold application data and key material."],
  ["Cross-site requests", "Session cookies use HttpOnly and SameSite=Lax. The app checks browser origin and fetch metadata for cookie-authenticated API writes. Creating API tokens or outbound webhooks also requires JSON."],
  ["Browser and tool boundaries", "The app uses a nonce-based Content Security Policy. The JavaScript runner uses an isolated worker with no network access and a 15-second limit. Agent file tools are confined to allowed workspace paths."],
  ["Backups", "CryoZen takes a backup before database migrations and runs daily backups when the scheduler is active. Backup verification checks archive integrity and runs a SQLite integrity check before restore."],
] as const;

const outbound = [
  ["Local workspace", "Nothing leaves the host for local notes, calendars, editing, offline rendering, or chat and document retrieval using locally running models with all remote integrations disabled. The interface loads bundled assets and sends no telemetry."],
  ["Hosted chat, research synthesis, and embeddings", "Only to the model provider you chose when that model is called. Requests can contain prompts, retrieved passages, tool results, or text to embed, depending on the feature."],
  ["Web search and Deep Research", "Queries go to the search service in use, including fallback providers when used. A local SearXNG instance can forward queries to upstream engines. Research also fetches source pages."],
  ["Mail, calendars, and contacts", "Only to the configured IMAP, SMTP, CalDAV, or CardDAV service when the app syncs, sends mail, or checks the connection."],
  ["Sign-in and linked accounts", "Only to the provider you chose when you sign in, authorize a connection, or sync a linked account."],
  ["Vault and remote tools", "Only to the configured vault or remote MCP service when you use that integration. Enabled tools may make their own requests."],
  ["Compute and model downloads", "Only to the configured SSH host for remote compute operations, or to the model registry when searching for or downloading model files. Local embedding models may download on first use."],
  ["Outbound webhooks and notifications", "Only to the configured destination when a subscribed event fires, a test runs, or a notification is delivered. Webhook event payloads can include chat content."],
] as const;

function SecurityTable({ label, rows }: { label: string; rows: readonly (readonly [string, string])[] }) {
  return (
    <Card className="mt-6 p-5 sm:p-7">
      <table aria-label={label} className="w-full table-fixed text-left text-sm/6">
        <thead>
          <tr className="text-core">
            <th scope="col" className="w-2/5 pb-3 pr-3 sm:w-1/3">Feature</th>
            <th scope="col" className="pb-3">Behavior</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([feature, behavior]) => (
            <tr key={feature} className="border-t border-hairline align-top">
              <th scope="row" className="py-3 pr-3 font-medium text-ink">{feature}</th>
              <td className="py-3 text-muted">{behavior}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default function SecurityPage() {
  return (
    <Container className="py-16 sm:py-20">
      <JsonLd data={softwareApplicationJsonLd()} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Security", path: "/security" }])} />
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>Security</Eyebrow>
        <h1 className="text-flame mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          How CryoZen handles your data.
        </h1>
        <p className="mt-5 text-base/7 text-muted text-pretty">
          CryoZen runs on your hardware and is designed for trusted users on a private network.
          These are the protections and limits in v1.2.0.
        </p>
      </div>

      <section className="mx-auto mt-14 max-w-3xl">
        <SectionHeading title="On the host" align="left" />
        <SecurityTable label="On the host" rows={protections} />
      </section>

      <section className="mx-auto mt-14 max-w-3xl">
        <SectionHeading title="What leaves the machine" align="left" />
        <SecurityTable label="What leaves the machine" rows={outbound} />
      </section>

      <section className="mx-auto mt-14 max-w-3xl">
        <SectionHeading title="Known gaps" align="left" />
        <Card className="mt-6 p-5 sm:p-7">
          <ul className="list-disc space-y-3 pl-5 text-sm/6 text-muted marker:text-primary/60">
            <li>Admin agent shell and Python tools run with the app process&apos;s permissions and have no operating-system sandbox or outbound network filtering.</li>
            <li>The chat API does not adequately validate all caller-supplied model destinations. Treat access to chat tokens as sensitive.</li>
            <li>Some web search logic exists in duplicate. Fixes can diverge between search paths.</li>
            <li>Sessions inherit the account&apos;s privileges. Companion tokens have broad chat or admin access with limited per-capability control.</li>
          </ul>
        </Card>
      </section>

      <section className="mx-auto mt-14 max-w-3xl">
        <SectionHeading title="Report a vulnerability" align="left" />
        <Card className="mt-6 space-y-3 p-5 text-sm/6 text-muted sm:p-7">
          <p>
            Report privately by emailing{" "}
            <a href={`mailto:${site.contactEmail}?subject=CryoZen%20security%20report`} className={`${textLink} break-all`}>{site.contactEmail}</a>.
            Include the vulnerability type, release or commit, relevant configuration, steps to reproduce,
            impact, and supporting evidence with secrets removed. Keep details private until a fix ships.
          </p>
          <p>
            The security policy targets acknowledgement within 48 hours and an assessment with a remediation
            plan within seven days. Security fixes support the{" "}
            <a href={latestReleaseUrl} className={textLink}>latest public release</a>.
          </p>
        </Card>
      </section>
    </Container>
  );
}

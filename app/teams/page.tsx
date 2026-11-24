import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, Container, Eyebrow, InlineCode, SectionHeading, textLink } from "@/components/ui";
import { tiers } from "@/lib/pricing";
import { breadcrumbJsonLd, JsonLd, softwareApplicationJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Teams",
  description: "Run one CryoZen instance for a trusted team on a private network you operate.",
  alternates: { canonical: "/teams" },
};

const team = tiers.find(({ id }) => id === "team")!;

export default function TeamsPage() {
  return (
    <Container className="py-16 sm:py-20">
      <JsonLd data={softwareApplicationJsonLd()} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Teams", path: "/teams" }])} />
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>Teams</Eyebrow>
        <h1 className="text-flame mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Run one CryoZen instance for your team.
        </h1>
        <p className="mt-5 text-base/7 text-muted text-pretty">
          For trusted coworkers on a private network, with an administrator who manages the host,
          user accounts, and shared integrations.
          Proving isolation between accounts under concurrent use is current work, so share an
          instance only with people you trust.
        </p>
      </div>

      <section className="mx-auto mt-14 max-w-3xl">
        <SectionHeading title="What each account owns" align="left" />
        <Card className="mt-6 p-5 sm:p-7">
          <table className="w-full table-fixed text-left text-sm/6">
            <thead className="text-core">
              <tr>
                <th scope="col" className="w-2/5 pb-3 pr-3">Scope</th>
                <th scope="col" className="pb-3">Data and controls</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              <tr className="border-t border-hairline align-top">
                <th scope="row" className="py-3 pr-3 font-medium text-ink">Per user</th>
                <td className="py-3">
                  Individual accounts with owner-scoped mail, calendars, notes, model endpoints,
                  scheduled tasks and their webhook triggers, Deep Research, and automatic conversation compaction.
                </td>
              </tr>
              <tr className="border-t border-hairline align-top">
                <th scope="row" className="py-3 pr-3 font-medium text-ink">Shared and admin-managed</th>
                <td className="py-3">
                  Contacts and CardDAV, global model and search credentials, compute serving,
                  and outbound event webhooks.
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
        <p className="mt-4 text-sm/6 text-muted">
          Keep authentication enabled. In v1.2.0, the calendar router reads{" "}
          <InlineCode>CRYOZEN_SINGLE_USER</InlineCode> but does not use its value.
          Signed-in calendar requests use the account as owner, so a team deployment does not need to change this variable.
        </p>
      </section>

      <section className="mx-auto mt-14 max-w-3xl">
        <SectionHeading title="Deployment checklist" align="left" />
        <Card className="mt-6 p-5 sm:p-7">
          <ul className="list-disc space-y-3 pl-5 text-sm/6 text-muted marker:text-primary/60">
            <li>Keep <InlineCode>APP_BIND=127.0.0.1</InlineCode> in the Compose <InlineCode>.env</InlineCode>.</li>
            <li>Run an HTTPS reverse proxy on the CryoZen host in front of the app and forward <InlineCode>X-Forwarded-Proto</InlineCode>.</li>
            <li>
              Set <InlineCode>FORWARDED_ALLOW_IPS</InlineCode> for the <InlineCode>cryozen</InlineCode> service in a{" "}
              <InlineCode>docker-compose.override.yml</InlineCode> to the Compose network gateway, which is where the proxy&apos;s connection arrives from.
              Without it, OAuth sign-in builds <InlineCode>http://</InlineCode> redirect URIs and fails. See{" "}
              <Link href="/docs/operations/deployment#put-cryozen-behind-a-reverse-proxy-with-https" className={textLink}>putting CryoZen behind a reverse proxy</Link>.
            </li>
            <li>
              Set a persistent high-entropy <InlineCode>SESSION_SECRET</InlineCode> for OAuth state in the same{" "}
              <InlineCode>docker-compose.override.yml</InlineCode>, because the published Compose file does not pass it through from{" "}
              <InlineCode>.env</InlineCode>. See{" "}
              <Link href="/docs/operations/deployment#deploy-with-docker-compose" className={textLink}>deploying with Docker Compose</Link>.
            </li>
            <li>Once HTTPS works, set <InlineCode>SECURE_COOKIES=true</InlineCode> and set <InlineCode>ALLOWED_ORIGINS</InlineCode> to your HTTPS origin.</li>
            <li>Keep a protected copy of your backups off the host and verify that you can restore them.</li>
          </ul>
          <p className="mt-5 text-sm/6 text-muted">
            See the <Link href="/docs/operations/deployment" className={textLink}>deployment guide</Link> for setup details
            and the <Link href="/security" className={textLink}>security page</Link> for deployment limits.
          </p>
        </Card>
      </section>

      <Card className="mx-auto mt-14 max-w-3xl p-7 sm:p-9">
        <SectionHeading title={team.name} description={team.tagline} align="left" />
        <p className="mt-4 text-xl font-medium text-core">{team.price ?? "Pricing on request"}</p>
        <ButtonLink href={team.cta.href} className="mt-6">{team.cta.label}</ButtonLink>
      </Card>
    </Container>
  );
}

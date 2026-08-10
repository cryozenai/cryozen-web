import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "@/components/legal";
import { textLink } from "@/components/ui";
import { githubUrl, site } from "@/lib/site";

/*
 * TODO(cryozen): have counsel review this before launch. LICENSE.md in the
 * product repository is the controlling document for the software itself; this
 * page governs the website and states the relationship in plain language.
 */

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Terms for using the CryoZen website and the CryoZen application, and how they relate to the software license.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "9 August 2026";

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms" updated={UPDATED}>
      <LegalSection title="Scope">
        <p>
          These terms cover your use of {site.domain} and the builds distributed through it. The
          software itself is licensed separately: LICENSE.md in the{" "}
          <a href={githubUrl} target="_blank" rel="noreferrer" className={textLink}>
            product repository
          </a>{" "}
          is the controlling document, and where the two disagree, the license wins.
        </p>
      </LegalSection>

      <LegalSection title="The software is proprietary">
        <p>
          CryoZen&apos;s source is published so you can read it, audit it, and run it. It is not
          released under an open source license. Rights to copy, modify, redistribute, or use it
          commercially are the rights granted in LICENSE.md and no more.
        </p>
      </LegalSection>

      <LegalSection title="You run it, so you are responsible for it">
        <p>
          CryoZen executes work on your machine, including shell commands and file access when you
          enable agent tools. You decide what it may reach.
        </p>
        <LegalList
          items={[
            "You are responsible for securing the host, especially if you expose it beyond 127.0.0.1.",
            "You are responsible for the data you index and the accounts you connect.",
            "You are responsible for complying with the terms of any model provider or service you connect.",
            "Model output can be wrong. Verify anything you act on.",
          ]}
        />
      </LegalSection>

      <LegalSection title="No warranty">
        <p>
          The software and this website are provided as is, without warranty of any kind, express
          or implied, including merchantability, fitness for a particular purpose, and
          non-infringement. To the maximum extent permitted by law, we are not liable for any
          damages arising from your use of the software or the site, including lost data, lost
          profits, or business interruption.
        </p>
      </LegalSection>

      <LegalSection title="Availability">
        <p>
          Builds are distributed through GitHub Releases. We do not guarantee that any particular
          version stays available, that this site stays online, or that any release is free of
          defects.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          These terms may change. The updated date above reflects the current version. Continuing
          to use the site or the software after a change means you accept it. Questions go to{" "}
          {site.contactEmail}.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

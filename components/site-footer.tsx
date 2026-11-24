import Link from "next/link";
import { Logo } from "@/components/logo";
import { GitHubIcon } from "@/components/icons";
import { footerNote } from "@/lib/home/copy";
import {
  configDocsUrl,
  issuesUrl,
  quickstartUrl,
  releasesRepoUrl,
  releasesUrl,
  site,
} from "@/lib/site";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Download", href: "/download" },
      { label: "Tour", href: "/tour" },
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Changelog", href: "/changelog" },
      { label: "Release feed (Atom)", href: "/changelog/feed.xml" },
    ],
  },
  {
    title: "Documentation",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Teams", href: "/teams" },
      { label: "Security", href: "/security" },
      { label: "Docker quickstart", href: quickstartUrl },
      { label: "Configuration reference", href: configDocsUrl },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "GitHub", href: releasesRepoUrl },
      { label: "Releases", href: releasesUrl },
      { label: "Report an issue", href: issuesUrl },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-hairline bg-surface/40">
      <div className="mx-auto w-full max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="col-span-2 max-w-xs md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5" aria-label="CryoZen home">
              <Logo className="size-7" />
              <span className="text-[15px] font-semibold tracking-[0.14em] text-core uppercase">
                CryoZen
              </span>
            </Link>
            <p className="mt-4 text-sm/6 text-muted">{site.tagline}</p>
            <a
              href={releasesRepoUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="CryoZen releases on GitHub"
              className="mt-5 -ml-2 inline-flex rounded-md p-2 text-muted transition-colors duration-150 hover:text-core"
            >
              <GitHubIcon />
            </a>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-semibold tracking-[0.14em] text-core uppercase">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => {
                  const external = link.href.startsWith("http");
                  const className =
                    "text-sm text-muted transition-colors duration-150 hover:text-core";
                  return (
                    <li key={link.label}>
                      {link.href.endsWith(".xml") ? (
                        // A feed is a file, not a page: a plain anchor, so the router does not prefetch it.
                        <a href={link.href} className={className}>
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                          className={className}
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-hairline pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <p>{footerNote}</p>
        </div>
      </div>
    </footer>
  );
}

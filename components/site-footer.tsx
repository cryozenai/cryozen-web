import Link from "next/link";
import { Logo } from "@/components/logo";
import { GitHubIcon } from "@/components/icons";
import {
  configDocsUrl,
  deploymentDocsUrl,
  docsUrl,
  githubUrl,
  issuesUrl,
  quickstartUrl,
  releasesUrl,
  site,
} from "@/lib/site";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Download", href: "/download" },
      { label: "Pricing", href: "/pricing" },
      { label: "Changelog", href: "/changelog" },
      { label: "Releases", href: releasesUrl },
    ],
  },
  {
    title: "Documentation",
    links: [
      { label: "Documentation index", href: docsUrl },
      { label: "Local quickstart", href: quickstartUrl },
      { label: "Deployment guide", href: deploymentDocsUrl },
      { label: "Configuration reference", href: configDocsUrl },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "GitHub", href: githubUrl },
      { label: "Report an issue", href: issuesUrl },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-hairline bg-surface/40">
      <div className="mx-auto w-full max-w-6xl px-6 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Link href="/" className="inline-flex items-center gap-2.5" aria-label="CryoZen home">
              <Logo className="size-7" />
              <span className="text-[15px] font-semibold tracking-[0.14em] text-core uppercase">
                CryoZen
              </span>
            </Link>
            <p className="mt-4 text-sm/6 text-muted">{site.tagline}</p>
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="CryoZen on GitHub"
              className="mt-5 inline-flex rounded-md p-2 text-muted transition-colors duration-150 hover:text-core"
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
                  return (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                        className="text-sm text-muted transition-colors duration-150 hover:text-core"
                      >
                        {link.label}
                      </Link>
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
          <p>Self-hosted. No telemetry. Your data stays on your hardware.</p>
        </div>
      </div>
    </footer>
  );
}

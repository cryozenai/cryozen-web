import Link from "next/link";
import type { DocLink, DocNavGroup } from "@/lib/docs";

function SidebarLinks({
  overview,
  groups,
  currentHref,
}: {
  overview: DocLink;
  groups: DocNavGroup[];
  currentHref: string;
}) {
  const linkClass = (href: string) =>
    `block rounded-md px-3 py-1.5 text-sm transition-colors duration-150 ${
      href === currentHref
        ? "border border-primary/30 bg-elevated/80 font-medium text-core"
        : "text-muted hover:text-core"
    }`;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={overview.href}
          aria-current={overview.href === currentHref ? "page" : undefined}
          className={linkClass(overview.href)}
        >
          {overview.title}
        </Link>
      </div>
      {groups.map((group) => (
        <div key={group.label}>
          <h2 className="px-3 text-[11px] font-semibold tracking-[0.14em] text-core uppercase">
            {group.label}
          </h2>
          <ul className="mt-2 space-y-1">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.href === currentHref ? "page" : undefined}
                  className={linkClass(item.href)}
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function DocsSidebar({
  overview,
  groups,
  currentHref,
  currentTitle,
}: {
  overview: DocLink;
  groups: DocNavGroup[];
  currentHref: string;
  currentTitle: string;
}) {
  return (
    <>
      <details className="panel rounded-xl lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-core">
          <span>
            <span className="text-muted">Docs: </span>
            {currentTitle}
          </span>
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="size-4 text-muted"
            aria-hidden="true"
          >
            <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <nav aria-label="Documentation navigation" className="border-t border-hairline px-3 py-4">
          <SidebarLinks overview={overview} groups={groups} currentHref={currentHref} />
        </nav>
      </details>

      <aside className="hidden lg:block">
        <nav
          aria-label="Documentation navigation"
          className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2"
        >
          <SidebarLinks overview={overview} groups={groups} currentHref={currentHref} />
        </nav>
      </aside>
    </>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowIcon } from "@/components/icons";

/*
 * The building blocks shared by the home page, the tour, and the feature
 * pages. None of them holds state or touches the browser, so they render on
 * the server and are equally safe inside a client component.
 */

/** The page column. Wider than the site's default container: a split hero needs the room. */
export function Wide({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`mx-auto w-full max-w-7xl px-6 lg:px-8 ${className}`}>{children}</div>;
}

/** Small mono capitals: the label above a heading, a table header, a ledger key. */
export const monoLabel = "font-mono text-xs/5 font-medium tracking-[0.08em] uppercase";

/**
 * A numbered section of a long page. From `xl` up its label sits in a sticky
 * rail on the left, which gives the page one strong vertical line and an index
 * that stays readable while scrolling; below that the label is a line above
 * the heading. `band` paints the full-width surface behind it.
 */
export function Section({
  id,
  index,
  label,
  band = false,
  children,
}: {
  id: string;
  index: string;
  label: string;
  band?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`scroll-mt-16 ${band ? "border-y border-hairline bg-surface/70" : ""}`}
    >
      <Wide className="py-16 sm:py-20 xl:grid xl:grid-cols-[11.5rem_minmax(0,1fr)]">
        <p
          className={`${monoLabel} mb-5 flex gap-3 text-muted xl:sticky xl:top-24 xl:mb-0 xl:flex-col xl:gap-1 xl:self-start xl:pt-2.5`}
        >
          <span className="text-primary">{index}</span>
          <span>{label}</span>
        </p>
        <div className="min-w-0">{children}</div>
      </Wide>
    </section>
  );
}

export function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={`${id}-title`}
      className="max-w-3xl text-3xl font-semibold tracking-tight text-core text-balance sm:text-4xl lg:text-[2.75rem]/[1.1]"
    >
      {children}
    </h2>
  );
}

export function SectionIntro({ children }: { children: ReactNode }) {
  return <p className="mt-4 max-w-2xl text-base/7 text-ink text-pretty">{children}</p>;
}

/** A control or address exactly as the app shows it. */
export function UiLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-md border border-hairline bg-elevated px-1.5 py-0.5 font-mono text-xs/4 font-medium whitespace-nowrap text-core">
      {children}
    </span>
  );
}

/**
 * The ledger line: a mono key and the statement of what leaves the machine.
 * It is the one device every page repeats, always fed from `surface.privacy`.
 */
export function Ledger({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 text-[0.8125rem]/5 text-ink ${className}`}>
      <span className={`${monoLabel} text-[0.6875rem]/5 text-primary`}>{label}</span>
      <span className="text-pretty">{children}</span>
    </p>
  );
}

/** A pill-shaped link to another page, with an arrow. */
export function PillLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-9 items-center gap-1.5 rounded-full border border-hairline px-3.5 text-sm text-core transition-colors duration-150 hover:border-primary/50 hover:text-glow"
    >
      {children}
      <ArrowIcon className="size-3.5 text-primary transition-transform duration-150 group-hover:translate-x-0.5" />
    </Link>
  );
}

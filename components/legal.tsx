import type { ReactNode } from "react";
import { Container, Eyebrow } from "@/components/ui";

export function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <Container className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="text-flame mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-sm text-muted">Last updated {updated}</p>
        <div className="mt-12 space-y-10">{children}</div>
      </div>
    </Container>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-core">{title}</h2>
      <div className="mt-4 space-y-4 text-sm/7 text-muted">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-primary/60">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

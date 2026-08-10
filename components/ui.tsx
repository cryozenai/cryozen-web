import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Container({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-6 lg:px-8 ${className}`}>{children}</div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/70 px-3 py-1 text-xs font-medium tracking-[0.14em] text-primary uppercase">
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) {
  const alignment = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <div className={`max-w-2xl ${alignment}`}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-5 text-3xl font-semibold tracking-tight text-core text-balance sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base/7 text-muted text-pretty">{description}</p>
      ) : null}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-base hover:bg-glow shadow-[0_0_40px_-12px_var(--color-primary)]",
  secondary:
    "border border-hairline bg-surface/80 text-ink hover:border-primary/50 hover:text-core",
  ghost: "text-muted hover:text-core",
};

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors duration-150";

export function ButtonLink({
  variant = "primary",
  className = "",
  href,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  const external = typeof href === "string" && href.startsWith("http");
  return (
    <Link
      href={href}
      className={`${buttonBase} ${variants[variant]} ${className}`}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      {...props}
    />
  );
}

export function Card({
  className = "",
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div className={`panel rounded-2xl ${className}`} {...props}>
      {children}
    </div>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md border border-hairline bg-elevated px-1.5 py-0.5 font-mono text-[0.85em] text-glow">
      {children}
    </code>
  );
}

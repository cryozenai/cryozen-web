import type { Metadata } from "next";
import { ButtonLink, Card, Container, Eyebrow } from "@/components/ui";
import { CheckIcon } from "@/components/icons";
import { faq, tiers } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "CryoZen is free for personal use and self-hosted on your own hardware. Team and Enterprise add shared instances, deployment support, and commercial licensing.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <Container className="py-16 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>Pricing</Eyebrow>
        <h1 className="text-flame mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Free on your own machine. Priced when we run alongside you.
        </h1>
        <p className="mt-5 text-base/7 text-muted text-pretty">
          You always host CryoZen yourself, so you never pay us for compute or storage. Paid tiers
          cover shared deployments, support, and commercial licensing.
        </p>
      </div>

      <div className="mt-14 grid gap-4 lg:grid-cols-3">
        {tiers.map((tier) => (
          <Card
            key={tier.id}
            className={`flex flex-col p-7 ${
              tier.featured ? "border-primary/40 ring-1 ring-primary/20" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-core">{tier.name}</h2>
              {tier.featured ? (
                <span className="rounded-full bg-primary/12 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-primary uppercase">
                  Most common
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex min-h-9 items-baseline gap-2">
              {tier.price ? (
                <>
                  <span className="text-3xl font-semibold text-core">{tier.price}</span>
                  {tier.cadence ? (
                    <span className="text-xs text-muted">{tier.cadence}</span>
                  ) : null}
                </>
              ) : (
                <span className="text-xl font-medium text-muted">Pricing on request</span>
              )}
            </div>

            <p className="mt-4 text-sm/6 text-muted">{tier.tagline}</p>

            <ul className="mt-7 flex-1 space-y-3">
              {tier.features.map((feature) => (
                <li key={feature} className="flex gap-3 text-sm/6 text-muted">
                  <CheckIcon className="mt-1.5 size-3.5 shrink-0 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <ButtonLink
              href={tier.cta.href}
              variant={tier.featured ? "primary" : "secondary"}
              className="mt-8 w-full"
            >
              {tier.cta.label}
            </ButtonLink>
          </Card>
        ))}
      </div>

      <div className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-core sm:text-3xl">
          Questions people ask first
        </h2>
        <dl className="mt-10 space-y-4">
          {faq.map((item) => (
            <Card key={item.question} className="p-6">
              <dt className="text-sm font-semibold text-core">{item.question}</dt>
              <dd className="mt-3 text-sm/6 text-muted">{item.answer}</dd>
            </Card>
          ))}
        </dl>
      </div>
    </Container>
  );
}

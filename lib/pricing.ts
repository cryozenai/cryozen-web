import { site } from "@/lib/site";

/**
 * Pricing tiers.
 *
 * TODO(cryozen): set `price` on the paid tiers before announcing the site.
 * A null price renders as "Pricing on request" rather than an invented number,
 * so the page is safe to ship while the commercial terms are still being set.
 */
export interface Tier {
  id: string;
  name: string;
  /** e.g. "$12" — null renders as "Pricing on request". */
  price: string | null;
  cadence: string | null;
  tagline: string;
  features: string[];
  cta: { label: string; href: string };
  featured?: boolean;
}

export const tiers: Tier[] = [
  {
    id: "personal",
    name: "Personal",
    price: "Free",
    cadence: null,
    tagline: "One person, one machine, every feature in the application.",
    features: [
      "Chat, agents, research, and document search",
      "Mail, calendar, contacts, tasks, and automations",
      "Local model backends and your own provider API keys",
      "Image generation, gallery, and the layer editor",
      "HTTP API tokens and outbound webhooks",
      "Community support through GitHub issues",
    ],
    cta: { label: "Download CryoZen", href: "/download" },
  },
  {
    id: "team",
    name: "Team",
    price: null,
    cadence: "per user / month",
    tagline: "One shared instance behind your own reverse proxy.",
    features: [
      "Everything in Personal",
      "Per-user accounts; isolation between users has open bugs being fixed, so share only with people you trust",
      "Administrator controls for models and integrations; tool switches have open bugs being fixed",
      "Deployment guidance for servers, GPUs, and proxies",
      "Priority issue triage",
    ],
    cta: {
      label: "Talk to us",
      href: `mailto:${site.contactEmail}?subject=CryoZen%20Team`,
    },
    featured: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    cadence: null,
    tagline: "Restricted networks, procurement, and a support agreement.",
    features: [
      "Everything in Team",
      "Offline installation support, with known limits until CDN-loaded libraries are bundled",
      "Security review support and deployment hardening",
      "Named contact and an agreed response time",
      "Commercial licensing terms",
    ],
    cta: {
      label: "Contact sales",
      href: `mailto:${site.contactEmail}?subject=CryoZen%20Enterprise`,
    },
  },
];

export const faq = [
  {
    question: "Is CryoZen open source?",
    answer:
      `No. The source repository is private, and CryoZen is released under a proprietary license, not an OSI-approved open source license. Questions about the terms go to ${site.contactEmail}.`,
  },
  {
    question: "Do I pay per model call?",
    answer:
      "Not to us. CryoZen talks to model backends you choose. Local backends cost you nothing but electricity, and hosted providers bill you directly on your own API keys.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "On the machine running CryoZen. The server binds to 127.0.0.1 by default, credentials are encrypted at rest, and the application sends no telemetry.",
  },
  {
    question: "What happens if I stop paying?",
    answer:
      "The instance is yours and keeps running on your hardware. A lapsed subscription affects support and commercial licensing terms, not your access to your own data.",
  },
];

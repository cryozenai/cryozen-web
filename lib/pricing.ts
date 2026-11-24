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
  /** e.g. "$12" - null renders as "Pricing on request". */
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
    tagline: "A self-hosted workspace for one person.",
    features: [
      "Chat, agents, research, and document search",
      "Mail, calendar, contacts, tasks, and automations",
      "Local model backends and your own provider API keys",
      "Image gallery and layer editor",
      "Scoped bearer tokens for the /api/v1 HTTP API, the CryoZen CLI, and signed outbound webhooks",
      "Agent token setup in Settings for Claude and Codex. Use the HTTP API to create other scoped tokens and configure outbound webhooks.",
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
      "Per-user accounts with owner-scoped data for mail, calendars, notes, and other supported features",
      "Shared, admin-managed contacts, global model and search credentials, and compute serving",
      "Multi-user isolation is still being hardened, so share an instance only with people you trust",
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
      "Offline installation support",
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
      "Not to us. CryoZen talks to model backends you choose. Local backends run on your hardware. Hosted providers bill you directly when you use your own API keys.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "On the machine running CryoZen. The server binds to 127.0.0.1 by default and sends no telemetry. Stored provider keys, mail passwords, and linked-account tokens are encrypted. CardDAV contact credentials are stored in plain text. Features that use remote providers send the data needed for that request.",
  },
  {
    question: "What happens if I stop paying?",
    answer:
      "The instance is yours and keeps running on your hardware. A lapsed subscription affects support and commercial licensing terms, not your access to your own data.",
  },
];

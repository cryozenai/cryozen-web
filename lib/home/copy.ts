/**
 * The words on the home page, the tour, and the feature pages that are not a
 * description of a surface.
 *
 * What a surface does, how to use it, and what leaves the machine all come
 * from `lib/product`; this file holds only the framing around them (section
 * headings, the activation steps, the guarantees, the team summary), so a
 * product claim is never written twice. UI labels quoted here are the ones the
 * v1.2.0 recordings show on screen.
 */
import { desktopAddress } from "@/lib/media/address";
import type { SurfaceGroup, SurfaceId } from "@/lib/product/types";

/* ---------------------------------- hero --------------------------------- */

export const hero = {
  fallbackEyebrow: "Self-hosted AI workspace",
  headline: ["Your AI workspace.", "On hardware you control."],
  lede: "Chat, agents, deep research, documents, mail, and calendar in one application that runs on your own machine. Point it at local models or your own API keys.",
  tourLabel: "Take the tour",
  switcherLabel: "Product surfaces",
} as const;

export interface HeroSlot {
  surface: SurfaceId;
  /** Recordings for this slot, preferred first. With none on disk it shows a static frame. */
  captures: readonly string[];
}

export const heroSlots: readonly HeroSlot[] = [
  // Only recordings that passed independent video QA for v1.2.0. Research and
  // agents return here once their re-records pass (see the capture README).
  { surface: "chat", captures: ["chat"] },
  { surface: "websearch", captures: ["websearch"] },
  { surface: "documents", captures: ["documents"] },
  { surface: "mail", captures: ["mail"] },
  { surface: "compute", captures: ["compute"] },
];

/* ---------------------------------- start -------------------------------- */

export interface StartStep {
  title: string;
  body: string;
  /** What to look for or press, in the app's own words. */
  cue: { verb: string; labels: readonly string[] };
  /** The recording that shows this step, when there is one. */
  capture?: string;
}

export const start = {
  label: "Start",
  title: "From download to first answer in four steps.",
  steps: [
    {
      title: "Install",
      body: "Run the installer for your OS. The server starts on your machine and CryoZen opens in your browser.",
      cue: { verb: "You see", labels: [desktopAddress] },
    },
    {
      title: "Create your admin account",
      body: "The first screen asks for a username and a password of at least 8 characters. The account lives on your machine.",
      cue: { verb: "Click", labels: ["Create Admin Account"] },
      capture: "first-run",
    },
    {
      title: "Connect a model",
      body: "Paste the address of a local server such as Ollama into Local URL, or add a key for a hosted provider.",
      cue: { verb: "Open", labels: ["Settings", "Add Models", "Test", "Add"] },
      capture: "connect-model",
    },
    {
      title: "Ask your first question",
      body: "Pick the model in the message box and send. The reply streams in as it is written.",
      cue: { verb: "Click", labels: ["Select model"] },
    },
  ] satisfies StartStep[] as readonly StartStep[],
  /** Printed after the Docker address, which the page reads from the release facts. */
  dockerNote: "With Docker, the address is",
  slashNote: "Typing /setup in the message box also opens step 3.",
  tourLink: "Watch every step in the tour",
} as const;

/* -------------------------------- chapters ------------------------------- */

export interface GroupChapter {
  /** The benefit of this kind of work, as a heading. */
  headline: string;
  /**
   * The frame beside the chapter: recordings to try, preferred first, each
   * with the surface it shows, whose ledger line is printed under it.
   */
  frames: readonly { capture: string; surface: SurfaceId }[];
}

export const inside = {
  label: "What is inside",
  title: "One application. Five kinds of work.",
  intro:
    "Everything below ships in v1.2.0. Each surface says how far its data travels, and each frame says exactly what leaves.",
} as const;

export const chapters: Record<SurfaceGroup, GroupChapter> = {
  converse: {
    headline: "Ask any model you run, and see which one answers best.",
    frames: [
      { capture: "compare", surface: "compare" },
      { capture: "search", surface: "chat" },
    ],
  },
  know: {
    headline: "Get answers with the sources attached.",
    frames: [
      { capture: "websearch", surface: "websearch" },
      { capture: "research", surface: "research" },
    ],
  },
  organize: {
    headline: "Keep the notes, the inbox, and the calendar next to the model.",
    frames: [
      { capture: "notes", surface: "notes" },
      { capture: "calendar", surface: "calendar" },
    ],
  },
  run: {
    headline: "Hand over the work, and keep the approval.",
    frames: [
      { capture: "compute", surface: "compute" },
      { capture: "automations", surface: "automations" },
    ],
  },
  build: {
    headline: "Write it, edit it, script it, and make it yours.",
    frames: [
      { capture: "images", surface: "images" },
      { capture: "themes", surface: "themes" },
      { capture: "documents", surface: "documents" },
    ],
  },
};

/* --------------------------------- private ------------------------------- */

export interface Guarantee {
  /** The property written the way a config file would state it. */
  key: string;
  title: string;
  body: string;
}

export const privacy = {
  label: "Private by construction",
  title: "Not a promise in a policy. A property of where it runs.",
  intro:
    "CryoZen is a server you start on your own hardware. These four things follow from how it is built.",
  guarantees: [
    {
      key: "bind 127.0.0.1",
      title: "Binds to localhost by default",
      body: "The server listens on 127.0.0.1. Nothing is reachable from your network until you decide it should be.",
    },
    {
      key: "credentials: encrypted",
      title: "Credentials encrypted at rest",
      body: "API keys, mail passwords, and OAuth tokens are encrypted in your own database, on your own disk.",
    },
    {
      key: "telemetry: none",
      title: "No telemetry",
      body: "No analytics and no usage beacons. CryoZen sends us nothing.",
    },
    {
      key: "egress: configured only",
      title: "Data goes where you point it",
      body: "Prompts go to the model you connect, mail and calendar traffic to the accounts you add, and web search to your search provider.",
    },
  ] satisfies Guarantee[] as readonly Guarantee[],
  ledger: {
    caption: "The egress ledger",
    captionDetail: "every surface, by how far its data travels",
    columns: ["Reach", "Surfaces"],
    /** The closing row: the one destination no surface has. */
    company: { reach: "Goes to CryoZen, the company", surfaces: "Nothing, from any surface. Never." },
  },
  after: {
    before: "Each surface page states exactly what is sent and when. The full account, including known gaps, is on the",
    link: "security page",
    after: ".",
  },
} as const;

/* ----------------------------------- tour -------------------------------- */

export const tourTeaser = {
  label: "Tour",
  title: "See it used, step by step.",
  intro: {
    before: "The",
    link: "tour",
    after:
      "walks through every surface and names the exact buttons to press, most with a short recording. Here is one chapter.",
  },
  surface: "documents" as SurfaceId,
  chapter: "Read the full chapter",
  all: "See all chapters",
} as const;

/* ---------------------------------- teams -------------------------------- */

export interface TeamTier {
  label: string;
  title: string;
  items: readonly string[];
  note?: string;
}

export const teams = {
  label: "Teams",
  title: "One instance for the whole team, on a machine you own.",
  intro:
    "Run CryoZen on a shared server and give each person an account. This is what is separate and what is shared in v1.2.0.",
  tiers: [
    {
      label: "Per user",
      title: "Owned by each account",
      items: [
        "Mail",
        "Calendar",
        "Notes",
        "Model endpoints",
        "Scheduled tasks",
        "Research",
        "Compaction",
      ],
      note: "Mail and calendar are off for accounts that are not administrators until the administrator grants them.",
    },
    {
      label: "Admin only",
      title: "Reserved for administrators",
      items: [
        "Agent shell, file, and MCP tools",
        "Compute",
        "API tokens",
        "User management",
      ],
    },
    {
      label: "Shared",
      title: "Shared and admin-managed",
      items: [
        "Contacts",
        "Outbound webhooks",
        "Global model credentials",
        "Global search credentials",
        "Compute serving",
      ],
    },
  ] satisfies TeamTier[] as readonly TeamTier[],
  cta: "How a shared instance works",
  pricing: { before: "Team and enterprise pricing is", link: "on request", after: "." },
} as const;

/* ---------------------------------- close -------------------------------- */

export const closing = {
  headline: ["Install it once.", "Keep everything."],
  body: "Download a build for macOS, Windows, or Linux, or bring up the full stack with Docker Compose in three commands.",
  dockerTitle: "Docker Compose",
  dockerOpens: "Opens",
  /** Printed around the port and the variable name, which the page supplies. */
  airplay: { before: "If AirPlay on macOS is using port", middle: ", set", after: "in .env to a free port first." },
  verify: { before: "Verify a download against", link: "SHA256SUMS.txt", after: "." },
  feed: { before: "Follow releases in the", changelog: "changelog", middle: "or the", feed: "Atom feed", after: "." },
} as const;

/* ------------------------------- tour page ------------------------------- */

export const tourPage = {
  metaTitle: "Tour: how to use CryoZen",
  metaDescription:
    "A chaptered walkthrough of CryoZen v1.2.0: install it, connect a model, then every surface with a short recording, the exact buttons to press, and what leaves your machine.",
  eyebrow: "Tour",
  title: ["How to use CryoZen,", "one chapter at a time."],
  lede: "Start with the four steps from download to first answer, then take the surfaces in any order. Every chapter names the buttons as the app labels them, and says what leaves your machine.",
  indexLabel: "Tour chapters",
  startLabel: "Start",
  startTitle: "Start here: from download to first answer.",
  startIntro:
    "Four steps, and the recordings show the two that happen inside the app. Nothing leaves your machine while you install and create the account.",
  chapterWord: "Chapter",
  featureLink: "Open the feature page",
  next: {
    title: "Now run it yourself.",
    intro: "Everything in the tour is in the free download.",
    cards: [
      {
        title: "Download CryoZen",
        body: "Installers for macOS, Windows, and Linux, and a Docker Compose stack for servers.",
        href: "/download",
        cta: "Get the build",
      },
      {
        title: "Read the docs",
        body: "Guides for connecting models and services, the configuration and CLI references, and operations.",
        href: "/docs",
        cta: "Open the docs",
      },
      {
        title: "Run it for a team",
        body: "One shared instance with an account per person, and an exact list of what is separate and what is shared.",
        href: "/teams",
        cta: "See how teams work",
      },
    ],
  },
} as const;

/* ------------------------------ feature pages ---------------------------- */

export const featurePage = {
  indexMetaTitle: "Features",
  indexMetaDescription:
    "Every surface of CryoZen v1.2.0 on one page: what each does, how far its data travels, and a link to its how-to.",
  indexEyebrow: "Features",
  indexTitle: ["Everything in the application,", "and what each part sends."],
  indexLede:
    "One page per surface, each with a recording where there is one, numbered steps that use the app's own labels, and what leaves your machine.",
  breadcrumb: "Features",
  tourCta: "See it in the tour",
  recording: "In this recording",
  howTo: "How to use it",
  prerequisites: "Before you start",
  noPrerequisites: "Nothing to set up. It works as soon as CryoZen is running.",
  teams: "On a shared instance",
  noTeams: "Nothing changes: it behaves the same for every account.",
  docs: "in the docs",
  more: "Also on this surface",
  related: "Related surfaces",
  verified: "Verified on",
  previous: "Previous chapter",
  next: "Next chapter",
} as const;

/** Recordings that belong to a surface besides its own, shown lower on its feature page. */
export const extraCaptures: Partial<Record<SurfaceId, readonly string[]>> = {
  chat: ["search"],
};

/* ---------------------------------- shared ------------------------------- */

/** The mono key on every ledger line. */
export const ledgerKey = "Leaves";

export const footerNote = "This site runs no analytics and asks for no email.";

import type { Deck } from "./types";

const NB = " ";

/**
 * The open-core / self-hoster positioning. Beachhead is developers already
 * running models locally; the raise is $1.5M pre-seed.
 *
 * Copy is carried over verbatim from the deck of record. The honesty notes are
 * deliberate and stay in: pre-launch traction, an explicitly bottom-up market
 * model with its unbenchmarked inputs flagged, and enterprise controls shown
 * as the funded build rather than a shipped feature.
 */
export const developerDeck: Deck = {
  slug: "developer",
  label: "Developer",
  title: "Self-hosted, open-core AI workspace",
  summary:
    "The open-core positioning: one self-hosted app that replaces the five-tool private AI stack, wedged in at developers already running models locally.",
  beachhead: "Developers and self-hosters",
  raise: "$1.5M pre-seed",
  slides: [
    {
      kind: "title",
      id: "title",
      meaning: "preserved · composed",
      version: "v1.0.0",
      title: `Your entire AI${NB}workspace. ==Self-hosted.== One command.`,
      lede: "Private agents, RAG, deep research, and model serving, plus your mail, calendar, and notes. **Nothing leaves your machine.**",
      foot: "seed deck · confidential · 2026",
    },
    {
      kind: "content",
      id: "problem",
      index: 2,
      eyebrow: "Problem",
      title: "To get useful AI today, you either leak your data or glue five tools together.",
      blocks: [
        {
          kind: "klist",
          items: [
            {
              mark: "01",
              text: "Cloud AI reads your **code, email, and documents** on someone else's servers.",
            },
            {
              mark: "02",
              text: "The private alternative is **5+ single-purpose tools** you wire up yourself.",
            },
            {
              mark: "03",
              text: "Every tool is another subscription, and another **path your data can leak through**.",
            },
          ],
        },
        {
          kind: "chips",
          items: [
            { label: "chat UI" },
            { label: "+ RAG app" },
            { label: "+ local model server" },
            { label: "+ automation" },
            { label: "+ notes/second-brain" },
            { label: "= 0 private end-to-end", hot: true },
          ],
        },
        {
          kind: "narration",
          text: "Developers who care about privacy face a bad choice: send everything to a cloud model, or assemble five tools yourself. Both cost money every month, and neither gives you an AI that can act across your own data privately.",
        },
      ],
    },
    {
      kind: "content",
      id: "solution",
      index: 3,
      eyebrow: "Solution",
      title: "One app that does all of it. Private by architecture, not by policy.",
      blocks: [
        {
          kind: "lede",
          text: `Agents that act across your files, email, calendar, and local models. Self-hosted, offline-capable, and installed with **one Docker${NB}Compose command**.`,
        },
        {
          kind: "pillars",
          items: [
            { title: "Unified", body: "15 surfaces, one login. Not fifteen tabs and five bills." },
            { title: "Private", body: "Runs on your hardware. Your keys, your models, your data." },
            { title: "Actionable", body: "Agents and MCP tools that do work, not just chat." },
          ],
        },
        {
          kind: "lede",
          text: "**Not a private chatbot. A private operating layer for your work.**",
        },
        {
          kind: "narration",
          text: "CryoZen replaces that whole stack with one self-hosted app: chat, RAG, research, model serving, and your email, calendar, and notes, under one login, on your hardware. This is not a nicer chatbot. It is an AI that acts across everything you own, and none of it leaves your machine.",
        },
      ],
    },
    {
      kind: "content",
      id: "why-now",
      index: 4,
      eyebrow: "Why now",
      title: 'Private AI just crossed the "good enough" line.',
      blocks: [
        {
          kind: "klist",
          items: [
            {
              mark: "→",
              text: "**15.3% of surveyed developers** worked with Ollama in the past year, and 51% of those building agents did (Stack Overflow Developer Survey 2025, n=21,329).",
            },
            {
              mark: "→",
              text: "**MCP (2024)** standardized how agents use tools across apps.",
            },
            {
              mark: "→",
              text: "Ollama reports **8.9M monthly developers** and raised a $65M Series B in July 2026. Local inference is now mainstream infrastructure, not a hobby.",
            },
            {
              mark: "→",
              text: "Regulation and enterprise bans turned cloud AI into a **liability**.",
            },
          ],
        },
        {
          kind: "narration",
          text: "Two years ago this was impossible, because local models were toys. Today one in seven surveyed developers has worked with Ollama, and Ollama alone reports nearly nine million monthly developers. MCP standardized agent tooling. Regulated organizations are banning public LLMs. One honest caveat: Docker's 2025 survey shows professional development moving toward cloud environments, so the local wave is personal infrastructure and privacy, not a return to local dev. Those are different behaviours by the same people.",
        },
      ],
    },
    {
      kind: "content",
      id: "product",
      index: 5,
      eyebrow: "Product",
      title: "Plug and play private AI. One command, any operating system.",
      blocks: [
        {
          kind: "lede",
          text: "Install it, sign in, connect a model. An agent then triages your email, searches your files, and books your calendar, entirely on your hardware.",
        },
        {
          kind: "columns",
          items: [
            {
              title: "Works out of the box",
              sub: "Running the moment it boots. No account, no key.",
              highlight: true,
              points: [
                "Chat, agents, and MCP tools",
                "Document search and long-term memory",
                "Deep research on a bundled private search engine",
              ],
            },
            {
              title: "Connect what you own",
              sub: "Opt in per surface, whenever you want it.",
              points: [
                "Your models: local, or a hosted key you supply",
                "Mail, calendar, and contacts over open protocols",
                "Google, Microsoft, or Apple accounts, read-only",
              ],
            },
          ],
        },
        {
          kind: "lede",
          text: "**Runs where you already work:** macOS, Windows, and Linux, natively or in Docker.",
        },
        {
          kind: "narration",
          text: "One command brings up the stack. You sign in, connect a local model or your own key, and an agent can triage your email, search your files, and put things on your calendar, all locally. It installs the same way on macOS, Windows, and Linux, so it fits whatever a team already runs.",
        },
      ],
    },
    {
      kind: "content",
      id: "market",
      index: 6,
      eyebrow: "Market · bottom-up",
      title: "A wedge from self-hosters, expanding to every knowledge worker.",
      blocks: [
        {
          kind: "funnel",
          tiers: [
            {
              tag: `SOM · yr${NB}3`,
              desc: "**Serviceable Obtainable Market**, from the funnel below",
              value: "~$16M ARR",
            },
            {
              tag: "SAM",
              desc: "**Serviceable Addressable Market**: 7.4M developers already running models locally, at $144/yr Pro",
              value: "~$1.1B",
            },
            {
              tag: "TAM",
              desc: "**Total Addressable Market**: worldwide AI software spend, 2026 (Gartner), not the $2.59T infrastructure total",
              value: "$453B",
            },
          ],
        },
        {
          kind: "note",
          text: "**The takeaway:** 69,405 paid seats is **0.94% of the 7.4M already running models locally**. Expansion is modelled at 1.2x (GitLab 118%, MongoDB 121%, Datadog ~120%).",
        },
        {
          kind: "assumptions",
          rows: [
            { name: "Developers worldwide", value: "48.4M", source: "SlashData, Q3 2025" },
            {
              name: "Worked with Ollama",
              value: "15.3%",
              source: "Stack Overflow Developer Survey 2025, n=21,329",
            },
            {
              name: "Active by year 3",
              value: "2%",
              source: "Our target, not a benchmark. Launch data replaces it first.",
              unbenchmarked: true,
            },
            {
              name: "Convert to paid",
              value: "5%",
              source: "Developer-tools median (OpenView, Pendo). Docker discloses 7.6%.",
            },
            {
              name: "Ten-seat teams by year 3",
              value: "6,200",
              source: "Our target, not a benchmark. 62,000 seats at $2,400/yr per team.",
              unbenchmarked: true,
            },
            {
              name: "Year-3 SOM",
              value: "~$16M ARR",
              source: "7,405 individuals × $144, plus 6,200 teams × $2,400",
              total: true,
            },
          ],
        },
        {
          kind: "narration",
          text: "Bottom-up, with every input on the slide. SlashData counts 48.4 million developers. Stack Overflow's 2025 survey says 15.3% of them worked with Ollama in the past year, so roughly 7.4 million have already chosen to run models locally. That is the pool. Year three needs 2% of them active, 5% of those paying, which is the published median for developer tools rather than a number I picked, plus about 6,200 ten-seat teams. That is 69,405 paid seats, under one percent of the pool. Two inputs are still unbenchmarked, the 2% active rate and the 6,200 teams, and launch data replaces both first.",
        },
      ],
    },
    {
      kind: "content",
      id: "business-model",
      index: 7,
      eyebrow: "Business model",
      title: "Open-core. Free to self-host, paid to scale.",
      blocks: [
        {
          kind: "plans",
          items: [
            {
              name: "Free",
              price: "$0",
              desc: "Self-host the open-source core. This is the growth engine.",
            },
            {
              name: "Pro",
              price: "$12",
              priceNote: "/mo",
              desc: "Encrypted sync, backups, priority model access.",
              featured: true,
            },
            {
              name: "Team",
              price: "$20",
              priceNote: "/seat",
              desc: "Collaboration, SSO, admin, audit log.",
              featured: true,
            },
            {
              name: "Cloud / Ent.",
              price: "Later",
              desc: "Managed hosting; on-prem support contracts.",
            },
          ],
        },
        {
          kind: "klist",
          items: [
            {
              mark: "$",
              text: "Open-source distribution gives **low customer acquisition cost**.",
            },
            {
              mark: "$",
              text: "Users bring their own compute, so **inference cost is near zero** and gross margin is software-grade.",
            },
          ],
        },
        {
          kind: "note",
          text: "This requires open-sourcing the core. The repository is proprietary today, and that is the one structural decision this go-to-market depends on.",
        },
        {
          kind: "narration",
          text: "Classic open-core. The core is free and open, and that is the growth engine, the motion that built GitLab and Supabase. We charge for what individuals and teams pay for: sync, backup, collaboration, single sign-on, and audit. Because users bring their own compute, inference cost is near zero and margins are software-grade.",
        },
      ],
    },
    {
      kind: "content",
      id: "traction",
      index: 8,
      eyebrow: "Traction · velocity",
      title: "Pre-launch. Here is the velocity.",
      blocks: [
        {
          kind: "metrics",
          items: [
            { value: "6", unit: " wks", label: "solo, to a working product" },
            { value: "266", unit: "K", label: "lines of application code" },
            { value: "2,826", label: "automated tests passing" },
            { value: "15", label: "integrated surfaces" },
            { value: "51 / 94", label: "API modules / services" },
            { value: "v1.0.0", label: "boots today, verified" },
          ],
        },
        {
          kind: "lede",
          text: "**No users yet.** This is execution speed and product depth, not a vanity metric. Next: open-source launch, then installs, stars, and design partners.",
        },
        {
          kind: "narration",
          text: "No users yet. This is pre-launch. What I can show is velocity: solo, in six weeks, a 266-thousand-line working product with more than 2,800 passing tests and fifteen integrated surfaces. That is the pace this gets built at. The open-source launch is the next step.",
        },
      ],
    },
    {
      kind: "content",
      id: "competition",
      index: 9,
      eyebrow: "Competition",
      title: "Two buying questions decide this market. Nobody answers both.",
      blocks: [
        {
          kind: "lede",
          text: "Buyers ask where their data is processed, and how much of the workday one install covers. Both are verifiable before purchase.",
        },
        {
          kind: "matrix",
          yLabel: "Data stays on your hardware →",
          xLabel: { start: "One job", end: "The whole workday →" },
          quadrants: [
            {
              title: "Local building blocks",
              names: ["Ollama", "LM Studio", "Open WebUI", "AnythingLLM", "LibreChat"],
            },
            {
              title: "Private workspace",
              names: ["15 surfaces, one install"],
              win: true,
            },
            { title: "Point SaaS", names: ["Perplexity", "NotebookLM"] },
            {
              title: "Cloud suites",
              names: ["ChatGPT", "Microsoft Copilot", "Glean", "Notion AI"],
            },
          ],
        },
        {
          kind: "note",
          text: "Placement is by two testable facts: no outbound data path, and how much of the workday one install covers. Open WebUI is the one moving right.",
        },
        {
          kind: "narration",
          text: "Two axes, both things a buyer can verify themselves. Vertically, does your data stay on hardware you control. Horizontally, how much of the workday does one install cover. The cloud suites are strong on coverage and disqualified on residency. The local tools are strong on residency and cover one job each. The top-right corner is the position, and Open WebUI is the one moving toward it.",
        },
      ],
    },
    {
      kind: "content",
      id: "moat",
      index: 10,
      eyebrow: "Moat",
      title: "Breadth compounds, and incumbents cannot copy it without eating their own cloud.",
      blocks: [
        {
          kind: "klist",
          items: [
            {
              mark: "01",
              text: "**Integration surface:** 51 API modules and 94 services behind one adapter and MCP framework. Years to replicate.",
            },
            {
              mark: "02",
              text: "**Data gravity:** it hosts your mail, notes, and memory. Switching means moving your working life.",
            },
            {
              mark: "03",
              text: "**Open-source flywheel:** community-contributed integrations compound over time.",
            },
            {
              mark: "04",
              text: "**Structural:** cloud incumbents will not ship local-first, because it cannibalizes the revenue they are measured on.",
            },
          ],
        },
        {
          kind: "narration",
          text: "Four things make this hard to copy. The sheer integration surface. Data gravity, because once it hosts your mail and memory you do not leave. An open-source integration flywheel. And structurally, OpenAI and Google will not ship a local-first product that eats their own cloud revenue.",
        },
      ],
    },
    {
      kind: "content",
      id: "team",
      index: 11,
      eyebrow: "Team",
      title: "Seven years building systems that cannot fail, shipped alone.",
      blocks: [
        {
          kind: "lede",
          text: "**Shreejit Verma**, Founder. **Seven years as a quant developer** writing production C++ for live markets. Today at **BNP Paribas CIB** on FPGA automated market-making (~$500M/day), now embedding agentic AI into a bank's quant engineering lifecycle.",
        },
        {
          kind: "chips",
          items: [
            { label: "BNP Paribas: FPGA market-making, $500M/day", hot: true },
            { label: "Bank of America: ML platform +67%, taught AI/ML to 2,500+ engineers" },
            { label: "Versor: $8.5B AUM quant" },
          ],
        },
        {
          kind: "lede",
          text: "**Why this founder:** seven years in systems where a wrong answer costs money in microseconds, and nobody ships a prototype. That is the discipline behind 2,826 passing tests and a product that boots on the first try. Add real LLM productization inside a bank and a record of teaching 2,500+ engineers, which is the same work as building a community.",
        },
        {
          kind: "milestones",
          items: [{ mark: "hire", text: "Hiring two senior engineers and a developer-relations lead." }],
        },
        {
          kind: "narration",
          text: "I have spent seven years as a quant developer, in systems where a wrong answer costs money in microseconds. At BNP Paribas I build FPGA market-making systems moving $500 million a day. At Bank of America and Versor I shipped ML platforms across $8.5 billion in assets. At LogiNext I led twelve people and shipped an internal LLM that cut bug-resolution time by 80%. CryoZen is that same production discipline, applied to private AI.",
        },
      ],
    },
    {
      kind: "content",
      id: "ask",
      index: 12,
      eyebrow: "The ask",
      title:
        "Raising ==$1.5M pre-seed== to turn a working product into an open-source category.",
      blocks: [
        {
          kind: "funding",
          bars: [
            { label: "Engineering", percent: 55 },
            { label: "DevRel / community", percent: 20 },
            { label: "Cloud tier / infra", percent: 15 },
            { label: "Ops / G&A", percent: 10 },
          ],
          milestones: [
            {
              mark: `Milestone${NB}1`,
              text: "**Months 1-3:** open-source launch and community; first install and star targets.",
            },
            {
              mark: `Milestone${NB}2`,
              text: "**Months 4-7:** v1.0 general availability, multi-user and the Team plan shipped.",
            },
            {
              mark: `Milestone${NB}3`,
              text: "**Months 8-11:** first 100 paying Pro and Team customers, five design-partner teams.",
            },
            {
              mark: `Milestone${NB}4`,
              text: "**Month 12:** team of four and the metrics a seed round needs, with three months of runway still in hand.",
            },
          ],
        },
        {
          kind: "note",
          text: "**15-month plan at roughly $100K per month blended burn.** Hiring three people brings the team to four. Milestones land by month 12, which leaves a three-month buffer to close the seed rather than raising on an empty tank. The product already exists, so this capital buys distribution and a team, not a first prototype.",
        },
        {
          kind: "narration",
          text: "We are raising one and a half million pre-seed. Fifteen months at about one hundred thousand a month: open-source the core and build the community, ship v1.0 with team collaboration, land the first hundred paying customers and five design partners, and grow to a team of four. Those milestones land at month twelve, so I am raising the seed with three months in hand. The product already exists. This capital turns it into a category.",
        },
      ],
    },
    {
      kind: "content",
      id: "straight-talk",
      eyebrow: "Appendix / straight talk",
      title: "The three questions you're about to ask.",
      blocks: [
        {
          kind: "klist",
          items: [
            {
              mark: "Q1",
              text: '**"How do you monetize self-hosted?"** Open-core: free drives adoption; sync, collaboration, SSO, and audit are paid. Compute is the user\'s.',
            },
            {
              mark: "Q2",
              text: '**"Bus factor of one?"** True today. The first dollars hire two senior engineers. The velocity is the de-risk, not the risk.',
            },
            {
              mark: "Q3",
              text: '**"Isn\'t this a mile wide?"** Breadth is the moat, but v1 leads with one workflow: a private agent that acts across your mail, files, and calendar.',
            },
          ],
        },
        {
          kind: "signoff",
          text: "CryoZen · seed deck · confidential · built on a verified, running v1.0.0",
        },
      ],
    },
    {
      kind: "content",
      id: "sources-market",
      eyebrow: "Appendix / sources",
      title: "Where the market numbers come from.",
      blocks: [
        {
          kind: "klist",
          wide: true,
          items: [
            {
              mark: "01",
              text: "**48.4M developers worldwide.** SlashData, Developer Population Sizing, Q3 2025. Survey-based and methodology-published. We do not use GitHub's 180M, which counts accounts, not people.",
            },
            {
              mark: "02",
              text: "**15.3% worked with Ollama; 51% among agent builders.** Stack Overflow Developer Survey 2025, n=21,329 and n=3,758, published December 2025.",
            },
            {
              mark: "03",
              text: "**8.9M monthly Ollama developers, $65M Series B.** TechCrunch, 9 July 2026, attributed to Ollama's founder.",
            },
            {
              mark: "04",
              text: "**Pricing sits mid-market.** Pro at $12/mo and Team at $20/seat against GitLab Premium $29/user/mo, Notion Business $20, Linear Business $16, Tailscale Premium $18.",
            },
            {
              mark: "05",
              text: "**$453B AI software spend, 2026.** Gartner, May 2026. We cite the software segment, not the $2.59T total that infrastructure dominates.",
            },
          ],
        },
      ],
    },
    {
      kind: "content",
      id: "sources-model",
      eyebrow: "Appendix / sources",
      title: "How the model is built, and what is still unproven.",
      blocks: [
        {
          kind: "klist",
          wide: true,
          items: [
            {
              mark: "06",
              text: "**Counterpoint we raise ourselves.** Docker's 2025 State of Application Development reports professional development shifting to non-local environments. Self-hosting here is personal infrastructure and privacy, a different behaviour by the same people.",
            },
            {
              mark: "07",
              text: "**5% paid conversion.** Median for developer-focused products, OpenView and Pendo Product Benchmarks. Docker is the only open-core company to disclose an actual rate: 1.1M paid seats of 14.5M registered, or 7.6%. We model the lower number.",
            },
            {
              mark: "08",
              text: "**1.2x annual expansion.** GitLab 118% (FY2026), MongoDB 121% (FY2026), Datadog ~120% (FY2025). Note GitLab caps its reported figure at 130%, so historical prints of exactly 130% are censored.",
            },
            {
              mark: "09",
              text: "**Two inputs still have no benchmark:** the 2% active rate and the 6,200 ten-seat teams. Both are our targets, and the first cohort replaces them.",
            },
          ],
        },
        {
          kind: "signoff",
          text: "CryoZen · seed deck · confidential · figures verified August 2026",
        },
      ],
    },
  ],
};

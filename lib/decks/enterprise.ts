import type { Deck } from "./types";

const NB = " ";

/**
 * The on-prem / regulated-finance positioning, and the recommended lead: it is
 * the variant that matches the founder's access to the buyer. Beachhead is
 * banks, funds, and advisers that legally cannot send data to a cloud model;
 * the raise is $2M pre-seed.
 *
 * Enterprise controls (SSO, RBAC, audit export, SOC 2) appear throughout as
 * the funded build, never as shipped features. Keep it that way.
 */
export const enterpriseDeck: Deck = {
  slug: "enterprise",
  label: "Enterprise",
  title: 'On-prem private AI, "zero data egress"',
  summary:
    "The on-prem positioning: modern AI that runs inside a regulated firm's perimeter, sold land-and-expand into banks, funds, and advisers.",
  beachhead: "Regulated finance (banks, funds, advisers)",
  raise: "$2M pre-seed",
  slides: [
    {
      kind: "title",
      id: "title",
      meaning: "preserved · composed",
      version: "v1.0.0",
      title: "The AI platform for firms that ==can't send data to the cloud.==",
      lede: "Agents, RAG, and model serving that run entirely inside your perimeter. **On-prem. Auditable. Zero data egress.**",
      foot: "seed deck · confidential · 2026",
    },
    {
      kind: "content",
      id: "problem",
      index: 2,
      eyebrow: "Problem",
      title: "Regulated firms banned public AI - so their people use it anyway, off the record.",
      blocks: [
        {
          kind: "klist",
          items: [
            {
              mark: "01",
              text: "Major banks restricted ChatGPT (JPMorgan, Goldman, Citi, BofA, Deutsche) - **client data + MNPI can't leave**.",
            },
            {
              mark: "02",
              text: 'Employees route around the ban: **"shadow AI"** pasting sensitive data into personal accounts.',
            },
            {
              mark: "03",
              text: "One leak or MNPI breach = **regulatory action + reputational damage**.",
            },
          ],
        },
        {
          kind: "chips",
          items: [
            { label: "public-LLM bans across every major bank" },
            { label: "avg breach $4.9M (IBM)" },
            { label: "finance sector higher" },
            { label: "compliance wall vs. productivity gap", hot: true },
          ],
        },
        {
          kind: "narration",
          text: "Every major bank restricted ChatGPT internally, because client data and material non-public information legally can't go to a third-party cloud. But employees still want AI, so they route around it: shadow AI, sensitive data pasted into personal accounts. Firms are stuck between a compliance wall and a productivity gap.",
        },
      ],
    },
    {
      kind: "content",
      id: "solution",
      index: 3,
      eyebrow: "Solution",
      title: "Modern AI that runs inside your walls. An architecture, not a policy promise.",
      blocks: [
        {
          kind: "lede",
          text: "Deploy in your own VPC, data center, or air-gapped desk. Agents + RAG over internal data + on-prem model serving. **Your keys, your models, your audit trail.**",
        },
        {
          kind: "pillars",
          items: [
            {
              title: "On-prem",
              body: "Your environment: cloud VPC, data center, or air-gapped.",
            },
            {
              title: "Compliant",
              body: "Single sign-on, role-based access, and audit log. The funded build.",
            },
            { title: "Capable", body: "Agents that act across internal systems, not just chat." },
          ],
        },
        { kind: "lede", text: "**ChatGPT-grade capability, zero data egress.**" },
        {
          kind: "narration",
          text: "CryoZen deploys inside your environment: cloud VPC, data center, even an air-gapped desk. Employees get ChatGPT-grade agents and RAG over internal data, with on-prem model serving, and everything is logged for compliance. It is not a policy promise that data will not leak. Architecturally, it cannot.",
        },
      ],
    },
    {
      kind: "content",
      id: "why-now",
      index: 4,
      eyebrow: "Why now",
      title: "On-prem AI finally matches the cloud, right as regulators tighten.",
      blocks: [
        {
          kind: "klist",
          items: [
            {
              mark: "→",
              text: "**More than 95%** of nearly 5,000 senior decision-makers call private and sovereign AI important, yet only 29% are acting on it (NTT DATA Global AI Report, May 2026).",
            },
            {
              mark: "→",
              text: "**81%** of 5,200 privacy professionals report heightened data-localization demand, and the share spending $5M+ on privacy rose from 14% to 38% in two years (Cisco Data and Privacy Benchmark, Jan 2026).",
            },
            {
              mark: "→",
              text: "Forrester expects **at least 15% of enterprises** to seek private AI on private clouds in 2026. **MCP (2024)** standardized how agents act across internal systems.",
            },
            {
              mark: "→",
              text: "Nearly **60%** of AI leaders name cross-border data restrictions a major challenge, and 35% of chief AI officers cite private or sovereign environments as their top adoption barrier (NTT DATA, May 2026).",
            },
          ],
        },
        {
          kind: "narration",
          text: "The timing is measurable, not anecdotal. NTT DATA surveyed nearly five thousand senior decision-makers: over 95% call private and sovereign AI important, and only 29% are acting on it. Cisco surveyed 5,200 privacy professionals: 81% face heightened localization demand, and the share spending five million or more on privacy went from 14% to 38% in two years. Forrester expects at least 15% of enterprises to seek private AI in 2026. One honest counterpoint from the same Cisco study: confidence that local storage is inherently safer is slipping, so we win on control and audit, not on a slogan.",
        },
      ],
    },
    {
      kind: "content",
      id: "product",
      index: 5,
      eyebrow: "Product",
      title: "Plug and play inside your perimeter. Any operating system.",
      blocks: [
        {
          kind: "command",
          steps: [
            "deploy in your VPC / on-prem / air-gapped",
            "SSO login",
            "point at internal models + data",
          ],
          result: "agents draft, research, and analyze, with every action logged",
        },
        {
          kind: "chips",
          items: [
            { label: "Chat", hot: true },
            { label: "Agents", hot: true },
            { label: "RAG (internal docs)", hot: true },
            { label: "Deep Research", hot: true },
            { label: "On-prem model serving (local + GPU cluster)" },
            { label: "Email" },
            { label: "Calendar" },
            { label: "Encrypted secrets at rest" },
            { label: "MCP tools" },
            { label: "Roadmap: SSO / SAML" },
            { label: "Roadmap: RBAC" },
            { label: "Roadmap: audit export" },
          ],
        },
        {
          kind: "lede",
          text: "**Runs where your estate already runs:** Linux, Windows, and macOS, natively or containerized, in your VPC, on-prem, or fully air-gapped. Working today: 51 modules, 94 services, secrets encrypted at rest. Enterprise controls (single sign-on, role-based access, audit) are the funded build.",
        },
        {
          kind: "narration",
          text: "Deploy it in your environment, employees sign in, point it at internal models and data, and agents draft, research, and analyze, with every action logged. It installs the same way on Linux, Windows, or macOS, so it fits whatever the estate already runs. Fifty-one modules, ninety-four services, secrets encrypted at rest. The enterprise controls, single sign-on, role-based access, and audit export, are exactly what this raise funds. They are the plan, not a claim.",
        },
      ],
    },
    {
      kind: "content",
      id: "market",
      index: 6,
      eyebrow: "Market · bottom-up",
      title: "High-ACV land-and-expand across regulated industries.",
      blocks: [
        {
          kind: "funnel",
          tiers: [
            {
              tag: `SOM · yr${NB}3`,
              desc: "**Serviceable Obtainable Market**, from firms landed",
              value: "~$14M ARR",
            },
            {
              tag: "SAM",
              desc: "**Serviceable Addressable Market**: the 26,906 firms below",
              value: "~$3.2B",
            },
            {
              tag: "TAM",
              desc: "**Total Addressable Market**: worldwide AI software spend, 2026 (Gartner, May 2026), not the $2.59T infrastructure total",
              value: "$453B",
            },
          ],
        },
        {
          kind: "note",
          text: "**The takeaway:** 120 firms at $120K is a $14M ARR business, **0.45% of the 26,906 institutions above**, every one counted by a regulator. Contract value decides the outcome.",
        },
        {
          kind: "assumptions",
          rows: [
            {
              name: "SEC-registered investment advisers",
              value: "16,544",
              source: "IAA and Comply Industry Snapshot 2026",
            },
            {
              name: "FDIC-insured banks",
              value: "4,278",
              source: "FDIC Quarterly Banking Profile, Q1 2026",
            },
            {
              name: "NCUA-insured credit unions",
              value: "4,250",
              source: "NCUA system performance data, March 2026",
            },
            {
              name: "Hedge-fund advising firms",
              value: "1,834",
              source: "SEC Form PF, 2025 Q3. Firms, not funds: the firm is the buyer.",
            },
            {
              name: "Firms landed by year 3",
              value: "120",
              source: "Our target, not a benchmark. 0.45% of the 26,906 above.",
              unbenchmarked: true,
            },
            {
              name: "Average contract value",
              value: "$120K",
              source: "Asserted from on-prem norms. The first pilot settles it.",
              unbenchmarked: true,
            },
            {
              name: "Year-3 SOM",
              value: "~$14M ARR",
              source: "120 firms × $120K. The four counts above sum to 26,906.",
              total: true,
            },
          ],
        },
        {
          kind: "narration",
          text: "This is high-ACV land-and-expand. Roughly nine thousand hedge funds and four thousand US banks, plus asset managers. Land a hundred-twenty firms in three years at a hundred-twenty-thousand-dollar average contract, expand seats inside each, and you're at low-eight-figure ARR from the finance beachhead alone, with healthcare, legal, and government as the same playbook.",
        },
      ],
    },
    {
      kind: "content",
      id: "business-model",
      index: 7,
      eyebrow: "Business model",
      title: "Annual on-prem licenses. Land a desk, expand to the firm.",
      blocks: [
        {
          kind: "plans",
          items: [
            {
              name: "Pilot",
              price: "60-90d",
              desc: "Fixed-fee, one desk or department. The land.",
            },
            {
              name: "License",
              price: "Annual",
              desc: "Per-seat or per-deployment, on-prem.",
              featured: true,
            },
            {
              name: "Enterprise",
              price: "Firm-wide",
              desc: "SSO, audit, RBAC, support SLA. The expand.",
              featured: true,
            },
            {
              name: "Services",
              price: "One-time",
              desc: "Deployment + integration into internal systems.",
            },
          ],
        },
        {
          kind: "klist",
          items: [
            {
              mark: "$",
              text: "High ACV, founder-led sales → **capital-efficient early revenue**.",
            },
            {
              mark: "$",
              text: "Customers bring their own compute → **software-grade margins**; land-and-expand → strong net retention.",
            },
          ],
        },
        {
          kind: "note",
          text: "Fits the founder's direct access to regulated-finance buyers: warm pilots, not cold twelve-month requests for proposal.",
        },
        {
          kind: "narration",
          text: "Annual on-prem licenses, sold land-and-expand. Start with a paid pilot on one desk, convert to a per-seat or per-deployment license, then expand firm-wide with SSO, audit, and support. Customers bring their own compute, so gross margins are software-grade, and every landed firm expands into more seats.",
        },
      ],
    },
    {
      kind: "content",
      id: "traction",
      index: 8,
      eyebrow: "Traction",
      title: "Pre-revenue. The product is built, and the founder is inside the buyer.",
      blocks: [
        {
          kind: "metrics",
          items: [
            { value: "6", unit: " wks", label: "solo, to a working product" },
            { value: "266", unit: "K", label: "lines of application code" },
            { value: "2,826", label: "automated tests passing" },
            { value: "51 / 94", label: "API modules / services" },
            { value: "15", label: "integrated surfaces" },
            { value: "v1.0.0", label: "boots today, verified" },
          ],
        },
        {
          kind: "lede",
          text: "**Unfair access:** the founder builds AI inside **BNP Paribas** today, a direct line to the exact regulated-finance buyers this sells to. No signed customers yet. The assets are a working product and a warm pipeline to convert.",
        },
        {
          kind: "narration",
          text: "Pre-revenue, no signed customers. What this has that most pre-seed teams do not: a working, tested product today, and a founder who builds AI inside a global bank right now, with direct access to the exact buyers this sells to. The next step is turning that access into design-partner pilots.",
        },
      ],
    },
    {
      kind: "content",
      id: "competition",
      index: 9,
      eyebrow: "Competition",
      title: "Two procurement questions decide this. Nobody passes both.",
      blocks: [
        {
          kind: "lede",
          text: "Security asks whether data ever leaves the perimeter. The business asks how much of the workday one deployment covers. Both are answered in a proof of concept, not a pitch.",
        },
        {
          kind: "matrix",
          yLabel: "Runs inside your perimeter →",
          xLabel: { start: "One job", end: "The whole workday →" },
          quadrants: [
            { title: "Self-managed chat", names: ["OSS LLM servers", "internal builds"] },
            {
              title: "Turnkey private platform",
              names: ["15 surfaces, one deployment"],
              win: true,
            },
            {
              title: "General cloud assistants",
              names: ["ChatGPT Enterprise", "Microsoft Copilot"],
            },
            { title: "Cloud knowledge platforms", names: ["Glean", "Hebbia"] },
          ],
        },
        {
          kind: "note",
          text: "Placement is by two testable facts: whether the product can run with no outbound data path, and how much of the workday one deployment covers. Glean and Hebbia are broad, and sit low because the data still leaves.",
        },
        {
          kind: "narration",
          text: "Two axes, both answered in a proof of concept. Vertically, can it run with no outbound data path. Horizontally, how much of the workday one deployment covers. Glean and Hebbia are genuinely broad, and I have placed them that way, but the data still leaves, which the strictest desks cannot accept. On-prem today means chat-only open-source tools or a multi-year internal build. Turnkey, on-prem, and integrated is the open corner.",
        },
      ],
    },
    {
      kind: "content",
      id: "moat",
      index: 10,
      eyebrow: "Moat",
      title: "Compliance depth + founder access + data gravity compound.",
      blocks: [
        {
          kind: "klist",
          items: [
            {
              mark: "01",
              text: "**Compliance and integration surface:** 51 modules, encrypted at rest, audit-ready. Years to replicate.",
            },
            {
              mark: "02",
              text: "**Founder-market access:** a warm line into regulated finance you can't just hire.",
            },
            {
              mark: "03",
              text: "**Data gravity:** becomes the firm's internal AI layer over its own data. Switching means moving the firm's working memory.",
            },
            {
              mark: "04",
              text: "**Structural:** cloud incumbents will not ship true air-gapped on-prem, because it eats their cloud.",
            },
          ],
        },
        {
          kind: "narration",
          text: "Four compounding moats. The integration and compliance surface takes years to build. Founder access, a warm line into regulated finance you cannot simply hire. Data gravity, because once it is the firm's internal AI layer, ripping it out is painful. And structurally, OpenAI and Google won't ship true air-gapped on-prem; it cannibalizes their cloud.",
        },
      ],
    },
    {
      kind: "content",
      id: "team",
      index: 11,
      eyebrow: "Team",
      title: "Seven years inside the buyer, building systems that cannot fail.",
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
            { label: "LogiNext: led a team of 12, shipped an internal LLM (-80% bug time)" },
            { label: "Versor: $8.5B AUM quant" },
          ],
        },
        {
          kind: "lede",
          text: "**Why this founder:** seven years in systems where a wrong answer costs money in microseconds, which is the same standard a bank applies to anything it deploys. Add real LLM productization inside a bank and, the unfair part, **direct access to regulated-finance buyers** from inside the industry.",
        },
        {
          kind: "milestones",
          items: [
            {
              mark: "hire",
              text: "1 enterprise-security engineer (SSO/audit/SOC2) + 1 solutions engineer for deployments.",
            },
          ],
        },
        {
          kind: "narration",
          text: "I'm a systems engineer who works inside the buyer. At BNP Paribas I build FPGA market-making systems moving $500 million a day and I'm embedding agentic AI into a bank's quant workflow; at Bank of America and Versor I shipped ML platforms across $8.5 billion in AUM; at LogiNext I led twelve people and shipped an internal LLM. I know these firms, their compliance walls, and how they buy. CryoZen is that same production rigor applied to private AI.",
        },
      ],
    },
    {
      kind: "content",
      id: "ask",
      index: 12,
      eyebrow: "The ask",
      title: "Raising ==$2M pre-seed== to land the first regulated-finance deployments.",
      blocks: [
        {
          kind: "funding",
          bars: [
            { label: "Eng (SSO/RBAC/audit)", percent: 50 },
            { label: "Security & SOC 2", percent: 20 },
            { label: "Sales / design partners", percent: 20 },
            { label: "Ops / G&A", percent: 10 },
          ],
          milestones: [
            {
              mark: `Milestone${NB}1`,
              text: "**Months 1-4:** three to five design-partner firms on paid pilots or letters of intent.",
            },
            {
              mark: `Milestone${NB}2`,
              text: "**Months 5-9:** single sign-on, role-based access, and audit export shipped; SOC 2 Type I.",
            },
            {
              mark: `Milestone${NB}3`,
              text: "**Months 10-12:** two paid on-prem deployments live.",
            },
            {
              mark: `Milestone${NB}4`,
              text: "**Month 12:** team of five and the reference customers a seed round needs, with three months of runway in hand.",
            },
          ],
        },
        {
          kind: "note",
          text: "**15-month plan at roughly $133K per month blended burn.** Enterprise controls, the compliance build, and a longer sales cycle are what the $2M funds. Milestones land by month 12, leaving a three-month buffer to close the seed. The product exists and the founder is inside the buyer.",
        },
        {
          kind: "narration",
          text: "Raising two million pre-seed. Fifteen months at about one hundred thirty-three thousand a month: ship the enterprise controls, single sign-on, role-based access, and audit, reach SOC 2 Type I, land three to five design-partner firms and two paid on-prem deployments, and grow to a team of five. Those land at month twelve, so I raise the seed with three months in hand. The product exists and I am inside the buyer.",
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
              text: '**"Solo founder, long enterprise sales cycles?"** I am inside the buyer, leading with paid pilots rather than twelve-month requests for proposal. The first hire is a solutions engineer.',
            },
            {
              mark: "Q2",
              text: '**"Not enterprise-ready, no single sign-on or audit?"** Core + encrypted-at-rest exist; SSO, RBAC, audit, and SOC 2 are exactly what this raise funds. Honest roadmap, not claimed as done.',
            },
            {
              mark: "Q3",
              text: '**"Why not ChatGPT Enterprise or build in-house?"** ChatGPT Enterprise still egresses to OpenAI\'s cloud; in-house is a multi-year cost center. We\'re turnkey and on-prem.',
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
      id: "sources",
      eyebrow: "Appendix / sources",
      title: "Every number on the market slide, and where it comes from.",
      blocks: [
        {
          kind: "klist",
          wide: true,
          items: [
            {
              mark: "01",
              text: "**4,278 FDIC-insured banks and savings institutions.** FDIC Quarterly Banking Profile, Q1 2026, released 27 May 2026.",
            },
            {
              mark: "02",
              text: "**4,250 federally insured credit unions.** NCUA system performance data, as of 31 March 2026.",
            },
            {
              mark: "03",
              text: "**16,544 SEC-registered investment advisers.** Investment Adviser Industry Snapshot 2026, IAA and Comply, published 3 June 2026 on 2025 data.",
            },
            {
              mark: "04",
              text: "**9,940 hedge funds, 1,834 advising firms.** SEC Form PF Private Fund Statistics, 2025 Q3. A floor, not a ceiling: only advisers above $150M in private-fund assets file.",
            },
            {
              mark: "05",
              text: "**Private AI demand.** NTT DATA Global AI Report, May 2026, nearly 5,000 senior decision-makers. Cisco Data and Privacy Benchmark, January 2026, 5,200 privacy professionals. Forrester Predictions 2026, November 2025.",
            },
            {
              mark: "06",
              text: "**1.2x annual expansion.** GitLab 118% (FY2026), MongoDB 121% (FY2026), Datadog ~120% (FY2025). No filing supports a larger multiplier.",
            },
            {
              mark: "07",
              text: "**$453B AI software spend, 2026.** Gartner, May 2026. We cite the software segment, not the $2.59T total that infrastructure dominates.",
            },
            {
              mark: "08",
              text: "**Counterpoint we raise ourselves.** The same Cisco study finds confidence that local storage is inherently safer slipping from 90% to 86%.",
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

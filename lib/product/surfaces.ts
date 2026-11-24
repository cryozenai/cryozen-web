import { findCaptureId } from "@/lib/media/index";
import type { ReleaseVersion } from "@/lib/media/types";
import type { Surface, SurfaceId } from "./types";

/*
 * What CryoZen does, one entry per surface, in the order the tour walks them.
 *
 * Rules for editing this file:
 * - Claim only what a user of the pinned release can reach in the UI. Each
 *   entry lists the product source it was written from under `evidence`
 *   (paths in the product repository at that release).
 * - `howTo` quotes the app's labels exactly as the UI shows them, including
 *   where the UI's name differs from ours: Memory is "Brain", Mail is "Email",
 *   the image gallery is "Gallery", and automations are "Tasks".
 * - Deliberately absent, because the release does not ship them in the UI:
 *   voice input and read-aloud, creating images from a text prompt, indexing
 *   of Office and EPUB files, mirrors of linked Google, Microsoft, or Apple
 *   accounts, a confirmation before each individual agent tool call, and
 *   agents or tasks running several at once. `scripts/product.test.mjs` fails
 *   if copy here starts claiming any of them.
 * - `capture` asks the manifest for the recording named after the surface, so
 *   a chapter gains its video the moment the recording lands and shows a
 *   static frame until then.
 */

const VERIFIED_ON: ReleaseVersion = "v1.2.0";

export const surfaces: readonly Surface[] = [
  {
    id: "chat",
    name: "Chat",
    group: "converse",
    tagline: "One chat for local models and hosted ones, on your own keys.",
    summary:
      "Talk to Ollama, llama.cpp, vLLM, or LM Studio on your hardware, or to OpenAI, Anthropic, Groq, or DeepSeek with your own API key. Replies stream in with Markdown, math, and diagrams rendered offline. Presets, saved sessions, search, and slash commands are built in.",
    verifiedOn: VERIFIED_ON,
    howTo: [
      {
        title: "Pick a model",
        detail: "Click Select model in the message box and choose one of your connected models.",
      },
      {
        title: "Choose Chat",
        detail: "The Chat and Agent buttons sit in the message box. Chat is plain conversation.",
      },
      {
        title: "Send a message",
        detail:
          "Type into Message CryoZen... and press Enter. The reply streams in as it is written.",
      },
      {
        title: "Shape the reply",
        detail: "Open + and click Prompt to pick a persona or set the temperature and max tokens.",
      },
      {
        title: "Find an old conversation",
        detail: "Press Ctrl+K, or Cmd+K on macOS, to search across your saved sessions.",
      },
    ],
    prerequisites: [
      "At least one connected model. Type /setup in the message box, or open Settings and choose Add Models.",
    ],
    privacy: {
      leaves: "chosen-provider",
      detail:
        "Your messages, system prompt, and attachments go only to the model endpoint you select. With a local model, that endpoint is your own hardware. Rendering, conversation search, and local slash commands stay on your machine.",
    },
    capture: findCaptureId("chat"),
    docs: "guides/integrations",
    teams:
      "Model endpoints you add belong to your account. Model credentials set for the whole instance are shared and managed by the administrator.",
    evidence: [
      "frontend/index.html:3134-3196",
      "frontend/index.html:3664-3864",
      "routers/chat_router.py:400",
      "frontend/js/markdown.js:557-597",
      "frontend/js/markdown.js:673-729",
      "frontend/js/presets.js:30-77",
      "frontend/js/anveshana-chat.js:17-99",
      "frontend/js/keyboard-shortcuts.js:7-29",
      "frontend/js/slashCommands.js:6295-6315",
    ],
  },
  {
    id: "compare",
    name: "Compare models",
    group: "converse",
    tagline: "Put up to 8 models side by side and vote blind on the best answer.",
    summary:
      "Send one prompt to as many as 8 models and read the answers in adjacent panes, with speed and cost shown for each. Compare in Chat, Agent, Search, or Research mode. Blind voting hides the names until you choose, and a scoreboard keeps the running tally.",
    verifiedOn: VERIFIED_ON,
    howTo: [
      {
        title: "Open Compare",
        detail: "Click Compare in the sidebar or the icon rail to open Model Comparison.",
      },
      {
        title: "Pick a mode and models",
        detail:
          "Choose Chat, Agent, Search, or Research, then select 2 to 8 of your connected models.",
      },
      {
        title: "Set the rules",
        detail: "Leave Blind on to hide the model names, and choose Parallel or Sequential.",
      },
      {
        title: "Start and ask",
        detail:
          "Click Start, then type your prompt in the message box. Each pane streams its own answer.",
      },
      {
        title: "Vote",
        detail:
          "Vote for the best pane, call a Tie, or click Reveal. Scoreboard shows win rates, speed, and cost.",
      },
    ],
    prerequisites: ["Two or more connected models that respond."],
    privacy: {
      leaves: "chosen-provider",
      detail:
        "Each pane sends the prompt only to its own model endpoint. Votes and the scoreboard are stored on your machine.",
    },
    capture: findCaptureId("compare"),
    docs: null,
    evidence: [
      "frontend/index.html:1934",
      "frontend/index.html:2653-2671",
      "frontend/js/compare/selector.js:85-1155",
      "frontend/js/compare/index.js:330-420",
      "frontend/js/compare/vote.js:27-160",
      "frontend/js/compare/scoreboard.js:1-284",
      "routers/compare_router.py:53-200",
      "frontend/js/slashCommands.js:3279-3413",
    ],
  },
  {
    id: "agents",
    name: "Agents",
    group: "run",
    tagline: "Agents that run commands and edit files, inside the folder you choose.",
    summary:
      "In Agent mode a model can run shell commands, read and edit files, search the web, and call MCP servers over stdio, SSE, or streamable HTTP with OAuth. A workspace folder confines the file tools. Plan mode has the agent investigate read-only and wait for you to approve its plan.",
    verifiedOn: VERIFIED_ON,
    howTo: [
      { title: "Switch to Agent", detail: "Click Agent in the message box." },
      {
        title: "Choose a workspace",
        detail: "Open + and click Workspace, pick a project folder, then click Use this folder.",
      },
      {
        title: "Turn on the tools it needs",
        detail: "Toggle Web search and Shell Access in the message box.",
      },
      {
        title: "Plan first",
        detail:
          "Toggle Plan mode. The agent investigates without changing anything and proposes a checklist.",
      },
      {
        title: "Approve and run",
        detail:
          "Read the proposed plan, then click Approve & Run. If the agent needs a decision on the way, it asks you with clickable choices.",
      },
      {
        title: "Add an MCP server",
        detail:
          "Open Settings, then Integrations, click + Add Integration, and choose MCP Tool Server. Pick stdio, SSE, or Streamable HTTP and click Save.",
      },
    ],
    prerequisites: [
      "A connected model that supports tool calling.",
      "An administrator account for the shell, file, and MCP tools. On a single-user install, that is you.",
      "Shell Access switched on before the agent can run commands.",
    ],
    privacy: {
      leaves: "configured-service",
      detail:
        "Prompts and every tool result go to the model endpoint you select. Shell and file tools run on the machine that hosts CryoZen. Web search contacts your configured search provider and the pages it fetches, and a remote MCP server receives the calls made to it.",
    },
    capture: findCaptureId("agents"),
    docs: "guides/integrations",
    evidence: [
      "frontend/index.html:3278-3295",
      "frontend/index.html:3348-3465",
      "frontend/index.html:3664-3676",
      "frontend/js/workspace.js:127-195",
      "frontend/js/planWindow.js:18-84",
      "frontend/js/chat.js:3054-3150",
      "frontend/js/chat.js:3633-3683",
      "frontend/js/settings.js:8513-8593",
      "services/tool_execution.py:367-433",
      "services/tool_security.py:65-197",
      "services/mcp_manager.py:165-399",
      "services/mcp_oauth.py:1-201",
    ],
  },
  {
    id: "research",
    name: "Deep Research",
    group: "know",
    tagline: "Ask a hard question and get back a report with its sources.",
    summary:
      "Deep Research plans sub-questions, searches the web over several rounds, reads the pages it finds, and writes a long-form report that cites them. Queue several questions, watch each phase live, then open the visual report or carry the findings into a chat.",
    verifiedOn: VERIFIED_ON,
    howTo: [
      {
        title: "Open Deep Research",
        detail: "Click Deep Research in the sidebar or the icon rail.",
      },
      {
        title: "Ask a specific question",
        detail:
          "Type the question and, if you like, pick a category: Auto, Product, Compare, How-to, or Fact-check.",
      },
      {
        title: "Set the depth",
        detail:
          "Open Settings in the panel to set Rounds, from Auto up to 20, or to change the search engine and model.",
      },
      {
        title: "Start",
        detail: "Click Start, or click + Queue to line up several questions first.",
      },
      {
        title: "Read the report",
        detail:
          "When it finishes, click Visual Report for the full page, or Discuss to open a chat seeded with the findings.",
      },
    ],
    prerequisites: [
      "A connected model.",
      "A working search provider. The Docker install bundles a private SearXNG, and DuckDuckGo is the default fallback.",
    ],
    privacy: {
      leaves: "configured-service",
      detail:
        "Search queries go to your configured search provider, and CryoZen fetches the result pages itself. The question and page excerpts go to the model endpoint you chose for research. Reports are stored on your machine.",
    },
    capture: findCaptureId("research"),
    docs: "reference/configuration",
    teams: "Research reports belong to the account that ran them.",
    evidence: [
      "frontend/index.html:1969",
      "frontend/index.html:2719-2735",
      "frontend/index.html:3296-3299",
      "frontend/js/shodh/panel.js:439-488",
      "frontend/js/shodh/panel.js:1049-1055",
      "frontend/js/shodh/panel.js:1238-1242",
      "frontend/js/shodh/jobs.js:275-296",
      "routers/shodh_router.py:469-519",
      "services/deep_research.py:198-205",
      "services/deep_research.py:250-389",
      "docker-compose.yml:90-138",
    ],
  },
  {
    id: "websearch",
    name: "Web search in chat",
    group: "know",
    tagline: "Turn on web search and see the sources behind the answer.",
    summary:
      "With one button, the model answers from live web results instead of memory alone. CryoZen searches through SearXNG, falls back to other providers if it is unavailable, reads the top pages, and lists the sources it used with the reply.",
    verifiedOn: VERIFIED_ON,
    howTo: [
      {
        title: "Turn it on",
        detail:
          "Click the Web search button in the message box, or send /search followed by your question.",
      },
      { title: "Ask", detail: "Send your question as usual." },
      {
        title: "Check the sources",
        detail: "Expand Web sources on the answer to open each page it used.",
      },
      {
        title: "Choose a provider",
        detail:
          "Open Settings, then Search, to pick the Provider, set the Fallbacks, and click Test.",
      },
    ],
    prerequisites: [
      "A connected model.",
      "A reachable search provider. SearXNG (self-hosted) is the default, and DuckDuckGo is the default fallback.",
    ],
    privacy: {
      leaves: "configured-service",
      detail:
        "Your query goes to the configured search provider. CryoZen fetches the top result pages itself, then sends your question and the text it extracted to the model endpoint you selected.",
    },
    capture: findCaptureId("websearch"),
    docs: "guides/integrations",
    teams: "Search credentials set for the whole instance are shared and managed by the administrator.",
    evidence: [
      "frontend/index.html:3350-3371",
      "frontend/index.html:4939-5075",
      "frontend/js/chat.js:1059-1065",
      "frontend/js/chat.js:2380-2398",
      "frontend/js/chatRenderer.js:1079-1140",
      "engines/anveshana/dharma.py:116-218",
      "engines/anveshana/providers.py:165-280",
      "services/chat_processor.py:306-342",
      "services/settings.py:53-84",
      "frontend/js/slashCommands.js:7697-7705",
    ],
  },
  {
    id: "documents",
    name: "Living documents",
    group: "build",
    tagline: "Write alongside the model and keep every version.",
    summary:
      "A tabbed editor beside your chat for documents, code, email, and PDFs. Ask the model to draft or rewrite and watch the edits stream in, review them as an inline diff, and restore any earlier version. Fill in PDF forms, and export to Markdown, PDF, or Word.",
    verifiedOn: VERIFIED_ON,
    howTo: [
      {
        title: "Create a document",
        detail:
          "Click + new on the Library row in the sidebar, or open + in the message box and click Documents.",
      },
      {
        title: "Write, or ask",
        detail:
          "Type in the editor, or ask the model in chat to draft, rewrite, or summarize. Its edits stream into the open document.",
      },
      {
        title: "Pick the type",
        detail:
          "Switch the document type: markdown shows a preview, email shows To, Subject, and Send, and PDF lets you fill in form fields.",
      },
      {
        title: "Review versions",
        detail:
          "Click the version badge, such as v1, to open the history. Select a version to preview it with its changes highlighted, or click Restore.",
      },
      {
        title: "Export",
        detail: "Click Export, then Export Markdown, Print as PDF, or Export as Word.",
      },
    ],
    prerequisites: [
      "A connected model for drafting and edits. Writing by hand and version history need nothing.",
    ],
    privacy: {
      leaves: "chosen-provider",
      detail:
        "Documents and their version history are stored on your machine. Their content goes to the model endpoint you select only when you chat with a document open or run Tidy.",
    },
    capture: findCaptureId("documents"),
    docs: null,
    evidence: [
      "frontend/index.html:2754-2792",
      "frontend/index.html:3245-3261",
      "frontend/js/documentLibrary.js:2025-2170",
      "frontend/js/document.js:4849-4880",
      "frontend/js/document.js:5799-5840",
      "frontend/js/document.js:10465-10514",
      "frontend/js/document.js:11802-12035",
      "routers/shastra_router.py:595",
      "routers/shastra_router.py:801-828",
      "routers/shastra_router.py:947-1050",
      "frontend/js/chat.js:1050-1057",
      "frontend/js/slashCommands.js:6004-6025",
    ],
  },
  {
    id: "knowledge",
    name: "Answers from your documents",
    group: "know",
    tagline: "Ask a question and get an answer drawn from your own files.",
    summary:
      "CryoZen indexes your files into a local vector store and retrieves the matching passages when you chat. Each answer comes with a Sources list that names the file, its match score, and the passage used. It indexes text, Markdown, code, JSON, YAML, CSV, HTML, and PDF.",
    verifiedOn: VERIFIED_ON,
    /*
     * PROVISIONAL: these steps are written from the source audit, which found
     * no panel in the v1.2.0 UI for adding files to the index (the upload UI
     * has no mount in index.html), only the command line, the HTTP API, and a
     * hidden slash command. The capture stream will confirm the in-UI flow;
     * rewrite the first step from what it records before this ships.
     */
    howTo: [
      {
        title: "Add your files to the index",
        detail:
          "An administrator indexes a folder from the command line or over the HTTP API. The CLI reference lists the commands.",
      },
      {
        title: "Turn on RAG",
        detail: "Open + in the message box and click RAG. A RAG badge shows while it is active.",
      },
      { title: "Ask your question", detail: "Send it as usual." },
      {
        title: "Check the sources",
        detail:
          "Expand Sources under the reply to see each file, its match percentage, and the passage.",
      },
    ],
    prerequisites: [
      "A connected model.",
      "An administrator account to add folders to the index.",
    ],
    privacy: {
      leaves: "chosen-provider",
      detail:
        "Indexing and retrieval run on your machine. Only your question and the retrieved passages, up to 10,000 characters, go to the model endpoint you select.",
    },
    capture: findCaptureId("knowledge"),
    docs: "reference/cli",
    evidence: [
      "frontend/index.html:3262-3277",
      "frontend/index.html:3467-3500",
      "frontend/js/chat.js:1097-1100",
      "frontend/js/chatRenderer.js:1148-1173",
      "services/chat_processor.py:269-304",
      "services/veda_vector.py:33-45",
      "services/veda_vector.py:460-467",
      "routers/nija_router.py:1-334",
      "frontend/js/slashCommands.js:2240-2310",
    ],
  },
  {
    id: "memory",
    name: "Memory",
    group: "know",
    tagline: "It remembers what matters, and shows you what it used.",
    summary:
      "CryoZen keeps durable facts about you and your work across conversations. Pin the ones that should always apply, let it extract new ones as you chat, and see which memories shaped a reply. Tidy merges duplicates, and everything can be imported and exported.",
    verifiedOn: VERIFIED_ON,
    howTo: [
      { title: "Open Brain", detail: "Click Brain in the sidebar or the icon rail." },
      {
        title: "Add a memory",
        detail:
          "On the Add tab, type a fact and choose its category. Import reads a file and offers candidate memories for you to review.",
      },
      {
        title: "Manage them",
        detail:
          "On the Memories tab, search, filter by category, and edit, pin, or delete any entry. Click Tidy to merge duplicates.",
      },
      {
        title: "See recall in chat",
        detail:
          "Under a reply, click the pill that counts pinned and recalled memories to see exactly which ones were used.",
      },
      {
        title: "Control extraction",
        detail: "On the Settings tab, switch Auto-extract on or off.",
      },
    ],
    prerequisites: [
      "A connected model for automatic extraction, Tidy, and importing from files. Saving and browsing memories need nothing.",
    ],
    privacy: {
      leaves: "chosen-provider",
      detail:
        "Memories are stored on your machine. Pinned memories and up to three recalled ones are included in what goes to the model endpoint you select. Automatic extraction, Tidy, and file import send the relevant text to the model you configured for background work.",
    },
    capture: findCaptureId("memory"),
    docs: "concepts/glossary",
    evidence: [
      "frontend/index.html:437-540",
      "frontend/index.html:2031",
      "frontend/index.html:2612-2633",
      "frontend/js/smarana.js:402-1600",
      "frontend/js/chatRenderer.js:1982-2035",
      "routers/smarana_router.py:1-586",
      "routers/chat_helpers.py:977-999",
      "engines/smriti/smriti_extractor.py:233-434",
    ],
  },
  {
    id: "notes",
    name: "Notes",
    group: "organize",
    tagline: "Notes, checklists, and reminders, one click from your chat.",
    summary:
      "A notes panel for plain notes, checklists, goals with a Today view, and freehand drawings. Add photos, colors, and tags, pin or archive cards, and set reminders that arrive in the browser or by email, ntfy, or webhook.",
    verifiedOn: VERIFIED_ON,
    howTo: [
      { title: "Open Notes", detail: "Click Notes in the sidebar or the icon rail." },
      {
        title: "Create one",
        detail: "Choose Note, Todo, or Draw, add a Title and the content, then click Save.",
      },
      {
        title: "Organize",
        detail:
          "Add tags such as #work, pick a color, or attach a photo. Filter with Search notes... or the tag chips.",
      },
      {
        title: "Set a reminder",
        detail: "Click the Remind me bell on a note and choose when.",
      },
      {
        title: "Jot from chat",
        detail:
          "Type /note followed by your text in the message box to save a note without leaving the conversation.",
      },
    ],
    prerequisites: [],
    privacy: {
      leaves: "configured-service",
      detail:
        "Notes are stored on your machine. Nothing leaves it unless you set a reminder to be delivered by email, ntfy, or webhook, which sends that reminder to the service you configured.",
    },
    capture: findCaptureId("notes"),
    docs: "reference/cli",
    teams: "Notes belong to the account that wrote them.",
    evidence: [
      "frontend/index.html:2793-2810",
      "frontend/index.html:6380-6454",
      "frontend/js/notes.js:1495-1543",
      "frontend/js/notes.js:2209-2299",
      "frontend/js/notes.js:3640-3740",
      "frontend/js/notes.js:6490-6590",
      "routers/note_router.py:801-924",
      "frontend/js/slashCommands.js:1999-2080",
    ],
  },
  {
    id: "mail",
    name: "Mail",
    group: "organize",
    tagline: "Your inbox next to your model, with summaries and scheduled send.",
    summary:
      "Connect IMAP and SMTP mailboxes to read, search, reply, and compose inside CryoZen. The model can summarize and triage incoming mail, messages can be scheduled to send later or turned into reminders, and you can sign an attached PDF and send it straight back.",
    verifiedOn: VERIFIED_ON,
    howTo: [
      {
        title: "Add a mailbox",
        detail:
          "Open Settings, then Integrations, and add an Email account with its IMAP and SMTP details.",
      },
      {
        title: "Open your mail",
        detail: "Click Email in the sidebar to browse folders and search.",
      },
      {
        title: "Write and schedule",
        detail:
          "Click Compose email and write the message, then choose Schedule Send... to pick a date and time.",
      },
      {
        title: "Set a reminder",
        detail: "Open a message's menu and choose Remind me. It becomes a dated reminder in Notes.",
      },
      {
        title: "Sign and return a PDF",
        detail:
          "Open a PDF attachment, draw or pick your signature, and click Send signed reply.",
      },
    ],
    prerequisites: [
      "An IMAP and SMTP mailbox: its host, port, username, and password.",
      "A connected model for summaries and triage.",
      "On a shared instance, mail is switched off for accounts that are not administrators unless the administrator grants it.",
    ],
    privacy: {
      leaves: "configured-service",
      detail:
        "Mail traffic goes only to the IMAP and SMTP servers you configure. Message text goes to the model endpoint you select only when a summary, triage, or drafted reply runs.",
    },
    capture: findCaptureId("mail"),
    docs: "guides/integrations",
    teams: "Mail accounts and their messages belong to the account that added them.",
    evidence: [
      "frontend/index.html:2470-2505",
      "frontend/index.html:6145-6260",
      "frontend/js/emailInbox.js:1219-1375",
      "frontend/js/emailLibrary.js:970-1160",
      "frontend/js/emailLibrary.js:2139-2203",
      "frontend/js/document.js:4981",
      "frontend/js/document.js:9997",
      "frontend/js/signature.js:1-250",
      "routers/email_router.py:2375-2500",
      "routers/email_pollers.py:1449-1459",
      "services/integrations/adapters/email_account.py:1-94",
      "THREAT_MODEL.md:16-34",
    ],
  },
  {
    id: "calendar",
    name: "Calendar and contacts",
    group: "organize",
    tagline: "A calendar that syncs both ways with the server you already use.",
    summary:
      "Keep local calendars, import and export .ics files, and sync two ways with a CalDAV server. Contacts come from a CardDAV server or from a .vcf or CSV import, and they fill in recipients when you compose mail.",
    verifiedOn: VERIFIED_ON,
    howTo: [
      {
        title: "Open Calendar",
        detail: "Click Calendar in the sidebar, or press Ctrl+Alt+C.",
      },
      {
        title: "Bring in events",
        detail: "In the calendar's settings, click Import .ics to load an existing calendar file.",
      },
      {
        title: "Connect CalDAV",
        detail: "Open Settings, then Integrations, and add your CalDAV account.",
      },
      {
        title: "Sync",
        detail:
          "Click Sync now in the calendar's settings to pull changes straight away. Events you create, change, or delete are written back to the server.",
      },
      {
        title: "Add contacts",
        detail:
          "In Settings, under Integrations, expand Contacts (CardDAV) to connect a server, or Contacts Import to upload a .vcf or CSV file.",
      },
    ],
    prerequisites: [
      "A CalDAV or CardDAV server and its credentials, for sync. Local calendars and .ics files need nothing.",
      "An administrator account to manage contacts.",
      "On a shared instance, calendar management is switched off for accounts that are not administrators unless the administrator grants it.",
    ],
    privacy: {
      leaves: "configured-service",
      detail:
        "Calendar data is stored on your machine. Sync traffic goes only to the CalDAV and CardDAV servers you configure.",
    },
    capture: findCaptureId("calendar"),
    docs: "guides/integrations",
    teams:
      "Calendars belong to the account that created them. Contacts are shared across the instance and managed by the administrator.",
    evidence: [
      "frontend/index.html:2634",
      "frontend/js/kaala.js:835-960",
      "frontend/js/kaala.js:3188-3500",
      "frontend/js/settings.js:7182-7425",
      "frontend/js/keyboard-shortcuts.js:21",
      "routers/kaala_router.py:875",
      "routers/kaala_router.py:975-1427",
      "routers/contacts_router.py:731-860",
      "services/caldav_sync.py:1-250",
      "services/caldav_writeback.py:1-224",
      "services/integrations/adapters/carddav.py:1-66",
      "THREAT_MODEL.md:16-34",
    ],
  },
  {
    id: "automations",
    name: "Tasks and automations",
    group: "run",
    tagline: "Put recurring work on a schedule, or trigger it with a webhook.",
    summary:
      "Run prompts, research jobs, and built-in actions on a cron or interval schedule, on an app event, or when an inbound webhook is called. Describe a task in plain language and have the model draft it. Every run is logged, and tasks run one at a time.",
    verifiedOn: VERIFIED_ON,
    howTo: [
      { title: "Open Tasks", detail: "Click Tasks in the sidebar." },
      {
        title: "Describe the task",
        detail:
          "On the Add tab, describe it in plain language, such as weekday mornings summarize unread email, and click Draft with AI.",
      },
      {
        title: "Or fill in the form",
        detail:
          "Set the Name, the Type (Prompt, Research, or Action), and the Trigger (Schedule, Event, or Webhook), then click Create.",
      },
      {
        title: "Run it now",
        detail:
          "Click Run on the task's card to test it straight away. Edit, Pause, and Resume are in the card's menu.",
      },
      {
        title: "Review the runs",
        detail: "Open the Activity tab, or History on a task, to see what ran and how it went.",
      },
    ],
    prerequisites: [
      "A connected model for Prompt and Research tasks.",
      "Built-in tasks start paused. Resume the ones you want.",
    ],
    privacy: {
      leaves: "configured-service",
      detail:
        "Tasks run on your machine. A Prompt or Research task sends its prompt to the model endpoint and search provider you configured, and run notifications go to the channels you set up.",
    },
    capture: findCaptureId("automations"),
    docs: "guides/integrations",
    teams: "Scheduled tasks belong to the account that created them.",
    evidence: [
      "frontend/index.html:2811",
      "frontend/js/karma.js:878-956",
      "frontend/js/karma.js:1012-1025",
      "frontend/js/karma.js:1325",
      "frontend/js/karma.js:1380-1470",
      "frontend/js/karma.js:3240-3360",
      "routers/karma_router.py:823-1005",
      "routers/karma_router.py:1093-1169",
      "services/kaala.py:353",
      "frontend/js/slashCommands.js:5369-5424",
    ],
  },
  {
    id: "compute",
    name: "Compute",
    group: "run",
    tagline: "See which models fit your hardware, then download and serve them.",
    summary:
      "Compute scans your CPU, memory, and GPU, or takes a manual profile, and shows which models and quantizations fit. Download one, then start and stop vLLM, llama.cpp, or SGLang servers on this machine or over SSH with pinned host keys. Watch VRAM live and schedule serving windows.",
    verifiedOn: VERIFIED_ON,
    howTo: [
      { title: "Open Compute", detail: "Click Compute in the sidebar." },
      {
        title: "Scan your hardware",
        detail:
          "On the Download tab, Scan / Download reads your hardware and lists the models that will run on it. Sort by Fit, Score, or VRAM.",
      },
      {
        title: "Download a model",
        detail:
          "Click Download on a listed model, or paste a Hugging Face reference such as org/model:Q4_K_M.",
      },
      {
        title: "Serve it",
        detail:
          "On the Serve tab, expand the model, choose a backend and one of the suggested profiles, check the VRAM readout, and click Launch.",
      },
      {
        title: "Schedule or stop",
        detail:
          "Use the arrow beside Launch to set a recurring serving window. Stop a server from the Running tab.",
      },
    ],
    prerequisites: [
      "An administrator account.",
      "A supported runtime. The Dependencies tab checks for it and installs what is missing.",
      "For a remote machine, SSH key access. Its host key is pinned the first time you connect.",
    ],
    privacy: {
      leaves: "configured-service",
      detail:
        "Hardware scans and local serving stay on your machine. Model downloads come from huggingface.co. Remote serving sends commands over SSH only to the hosts an administrator added.",
    },
    capture: findCaptureId("compute"),
    docs: "operations/deployment",
    teams: "Compute serving is shared across the instance and managed by the administrator.",
    evidence: [
      "frontend/index.html:2672",
      "frontend/js/shakti.js:2155-2327",
      "frontend/js/shaktiServe.js:577-612",
      "frontend/js/shaktiServe.js:1062-1077",
      "frontend/js/shaktiServe.js:1189-1339",
      "routers/shakti_router.py:108-311",
      "routers/shakti_serve_router.py:193-250",
      "routers/shakti_serve_router.py:1771",
      "THREAT_MODEL.md:57-65",
      "frontend/js/slashCommands.js:3624-3672",
    ],
  },
  {
    id: "images",
    name: "Image gallery and editor",
    group: "build",
    tagline: "Organize your photos and edit them in layers, in the browser.",
    summary:
      "A gallery with albums and AI tagging, plus a layer-based editor with non-destructive adjustments. With an image model connected, the editor can inpaint, outpaint, transfer a style, and upscale. It can also remove a background.",
    verifiedOn: VERIFIED_ON,
    howTo: [
      { title: "Open Gallery", detail: "Click Gallery in the sidebar or the icon rail." },
      {
        title: "Add photos",
        detail:
          "On the Photos tab, drop files on the upload tile. Use the Albums tab to group them.",
      },
      {
        title: "Tag them",
        detail:
          "Open a photo's menu and choose AI Tag, or click Start AI tag on the gallery's Settings tab to tag everything that has none.",
      },
      {
        title: "Edit in layers",
        detail:
          "Open a photo and click Edit. Work with the toolbar and the Layers panel, and add adjustments to any layer.",
      },
      {
        title: "Save",
        detail: "Open Save and choose Save over original, Save as copy, or Download PNG.",
      },
    ],
    prerequisites: [
      "A vision-capable model for AI tagging.",
      "An image model endpoint for inpaint, outpaint, and style transfer.",
      "The rembg package on the server for background removal.",
      "The gallery and the manual editing tools need nothing.",
    ],
    privacy: {
      leaves: "chosen-provider",
      detail:
        "Photos, albums, and editor projects are stored on your machine. AI tagging sends the image to the vision model you configured, and the AI editing tools send the image and its mask to the image model you selected.",
    },
    capture: findCaptureId("images"),
    docs: "reference/configuration",
    evidence: [
      "frontend/index.html:1999",
      "frontend/index.html:2736-2753",
      "frontend/index.html:4730-4780",
      "frontend/js/gallery.js:514-967",
      "frontend/js/gallery.js:2823-2990",
      "frontend/js/editor/build/toolbar.js:19-34",
      "frontend/js/editor/build/topbar.js:14-126",
      "frontend/js/editor/build/controls.js:12-366",
      "routers/gallery_router.py:1040-1130",
      "routers/gallery_router.py:1925-1995",
    ],
  },
  {
    id: "themes",
    name: "Themes",
    group: "build",
    tagline: "Make it yours with 17 themes, or build your own.",
    summary:
      "Switch between 17 built-in themes with an instant preview, or design your own with custom colors, fonts, density, and animated backgrounds. Save your themes and share them as JSON with Import and Export.",
    verifiedOn: VERIFIED_ON,
    howTo: [
      { title: "Open Theme", detail: "Click Theme in the sidebar or the icon rail." },
      {
        title: "Pick a preset",
        detail: "On the Themes tab, click any swatch. It applies immediately.",
      },
      {
        title: "Customize",
        detail:
          "On the Customize tab, adjust the colors, or open Color Harmony and click Generate. Choose a Font, a Density, and a Background / Effect.",
      },
      {
        title: "Save and share",
        detail:
          "Name the theme and click Save. Export gives you its JSON, and Import applies one that someone sent you.",
      },
    ],
    prerequisites: [],
    privacy: {
      leaves: "nothing",
      detail:
        "Themes are applied in your browser and saved to your own CryoZen instance. Nothing is sent anywhere else.",
    },
    capture: findCaptureId("themes"),
    docs: "reference/cli",
    evidence: [
      "frontend/index.html:1500-1818",
      "frontend/index.html:2085",
      "frontend/index.html:2833",
      "frontend/js/theme.js:640-665",
      "frontend/js/theme.js:823-835",
      "frontend/js/theme.js:866-982",
      "routers/font_router.py:8-59",
    ],
  },
  {
    id: "coderun",
    name: "Run JavaScript",
    group: "run",
    tagline: "Run the JavaScript in a reply with one click, in a sandbox.",
    summary:
      "Every JavaScript code block in a reply has a Run button. The code executes in a sandboxed worker in your browser with no network access, its console output appears under the block, and anything still running after 15 seconds is stopped.",
    verifiedOn: VERIFIED_ON,
    howTo: [
      {
        title: "Get some JavaScript",
        detail: "Ask for code, or paste a fenced js or javascript block into a message.",
      },
      { title: "Click Run", detail: "The Run button is in the code block's action bar." },
      {
        title: "Read the output",
        detail:
          "Console output appears under the block. A script that passes the limit is stopped and reports Execution timed out (15 s), with the output it printed before that.",
      },
    ],
    prerequisites: [],
    privacy: {
      leaves: "nothing",
      detail:
        "The code runs entirely in your browser, in a sandbox that blocks network requests and cannot read the page or its cookies.",
    },
    capture: findCaptureId("coderun"),
    docs: null,
    evidence: [
      "frontend/js/codeRunner.js:117-185",
      "frontend/js-sandbox.html:1-130",
      "frontend/js/markdown.js:579-597",
      "core/middleware.py:111-122",
      "docs/releases/v1.2.0.md:9",
    ],
  },
  {
    id: "api",
    name: "HTTP API and CLI",
    group: "build",
    tagline: "Script CryoZen over HTTP, or drive it from the command line.",
    summary:
      "Call /api/v1 over HTTP with scoped bearer tokens, receive signed outbound webhooks, and manage an instance with the 21-subcommand cryozen CLI. Tokens for the Claude and Codex agent integrations are created in Settings. Every other token is created through the API.",
    verifiedOn: VERIFIED_ON,
    howTo: [
      {
        title: "Create a token for an agent",
        detail:
          "Open Settings, then Integrations, choose Claude Agent or Codex Agent, and create its token.",
      },
      {
        title: "Create a custom token",
        detail:
          "As an administrator, send a JSON POST to /api/tokens naming the scopes you need. The token is shown once.",
      },
      {
        title: "Call the API",
        detail:
          "Send a POST to /api/v1/chat with the header Authorization: Bearer followed by your token.",
      },
      {
        title: "Subscribe to events",
        detail:
          "Send a JSON POST to /api/webhooks with an HTTPS URL, a signing secret, and the events you want. Each delivery is signed with HMAC-SHA256 in the X-CryoZen-Signature header.",
      },
      {
        title: "Use the CLI",
        detail:
          "Run cryozen with a subcommand on the machine that hosts your instance. The CLI reference lists all 21.",
      },
    ],
    prerequisites: ["An administrator account to create tokens and webhooks."],
    privacy: {
      leaves: "configured-service",
      detail:
        "The API is served by your own instance. Outbound webhooks send signed event payloads only to the URLs you register, and an API chat request is forwarded to the model provider it names.",
    },
    capture: findCaptureId("api"),
    docs: "guides/api-access",
    teams: "Webhooks belong to the account that registered them.",
    evidence: [
      "routers/api_token_router.py:78-196",
      "routers/webhook_router.py:71-239",
      "frontend/js/settings.js:4866-4913",
      "frontend/js/settings.js:9151-9152",
      "docs/guides/api-access.md:107-115",
      "docs/reference/cli.md:1-114",
      "docs/releases/v1.2.0.md:7",
      "THREAT_MODEL.md:29",
    ],
  },
  {
    id: "signin",
    name: "Sign-in",
    group: "run",
    tagline: "Accounts with two-factor sign-in, plus Google, Microsoft, or GitHub.",
    summary:
      "Each person signs in with their own account, protected by a password and, if they turn it on, TOTP two-factor codes with backup codes. When the administrator configures them, people can also sign in with Google, Microsoft, or GitHub.",
    verifiedOn: VERIFIED_ON,
    howTo: [
      {
        title: "Create the first account",
        detail:
          "On first launch, enter a username and a password of at least 8 characters, then click Create Admin Account.",
      },
      {
        title: "Turn on two-factor",
        detail:
          "Open Settings, then Account. Under Two-Factor Authentication, click Set Up 2FA and scan the code with an authenticator app.",
      },
      {
        title: "Add people",
        detail:
          "As the administrator, open Settings, then Users, to create accounts and set what each one may do.",
      },
      {
        title: "Sign in with a provider",
        detail:
          "Once the administrator has configured Google, Microsoft, or GitHub, click that provider on the sign-in page, or link it under Sign-in Methods in Settings, Account.",
      },
    ],
    prerequisites: [
      "For provider sign-in, the administrator sets that provider's client ID and secret on the server.",
    ],
    privacy: {
      leaves: "configured-service",
      detail:
        "Accounts and password hashes are stored on your machine. Provider sign-in exchanges sign-in details with the provider you chose, and nothing from your workspace.",
    },
    capture: findCaptureId("signin"),
    docs: "operations/deployment",
    teams: "Each person has their own account. The administrator manages users and what each may do.",
    evidence: [
      "frontend/login.html:787-794",
      "frontend/login.html:908-970",
      "routers/auth_router.py:269-282",
      "routers/auth_router.py:529-545",
      "frontend/index.html:4365",
      "frontend/index.html:4398",
      "frontend/index.html:6114",
      "frontend/js/settings.js:2838-2964",
      "frontend/js/settings.js:3030-3360",
      "THREAT_MODEL.md:38-44",
    ],
  },
];

const byId = new Map<SurfaceId, Surface>(surfaces.map((surface) => [surface.id, surface]));

export const surfaceIds: readonly SurfaceId[] = surfaces.map((surface) => surface.id);

/**
 * Total over `SurfaceId`: the product test proves every id in the union has an
 * entry, so a lookup with a typed id cannot miss.
 */
export function getSurface(id: SurfaceId): Surface {
  const surface = byId.get(id);
  if (!surface) throw new Error(`lib/product/surfaces.ts has no entry for "${id}"`);
  return surface;
}

/** For route params and other untyped input: the surface, or null. */
export function findSurface(id: string): Surface | null {
  return byId.get(id as SurfaceId) ?? null;
}

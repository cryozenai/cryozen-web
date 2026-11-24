---
title: "Glossary"
source: "docs/concepts/glossary.md"
ref: "v1.2.0"
commit: "f358e1dc7f53603abdf3f3d7ae2face02bd939ca"
---
# Glossary

This page names every component of CryoZen, says what it does, and points at the code that implements it.
Read it when a log line, a filename, or a route sends you somewhere you have not been.
You do not need any of it to use the application.

Routes, page URLs, and top-level packages are named in English.
Some inner module filenames still carry the project's original Sanskrit vocabulary, so this page leads with what a thing does and shows the identifier second.
[The upgrading guide](/docs/operations/upgrading#route-names-moved-to-english) records what the old route names became, and what you have to change in your own installation when you upgrade.

## Features and where they live

Each row is one user-facing feature: the route it answers on, and the code behind it.

| Feature | Route | Code |
|---|---|---|
| Authentication, accounts, and settings | `/api/auth` | `routers/auth_router.py`, `core/niti.py` |
| Calendar and CalDAV sync | `/api/calendar` | `routers/kaala_router.py` |
| Companion device pairing | `/api/assistant` | `routers/sahayaka_router.py`, `pairing/` |
| Compute fleet and model serving | `/api/compute` | `routers/shakti_router.py`, `engines/shakti/` |
| Document library and retrieval | `/api/documents` | `routers/shastra_router.py`, `engines/shastra/` |
| Deep research | `/api/research` | `routers/shodh_router.py`, `engines/shodh/` |
| Long-term memory | `/api/memory` | `routers/smarana_router.py`, `engines/smriti/` |
| Personal document index | `/api/personal` | `routers/nija_router.py` |
| Retrieval index statistics | `/api/knowledge` | `routers/diagnostics_router.py`, `services/veda.py` |
| Scheduled tasks and automations | `/api/tasks` | `routers/karma_router.py` |
| Skills | `/api/skills` | `routers/kaushala_router.py` |
| Speech to text | `/api/stt` | `routers/shravana_router.py`, `engines/shravana/` |
| Text to speech | `/api/tts` | `routers/vacha_router.py`, `engines/vacha/` |
| Web search | `/api/websearch` | `routers/anveshana_router.py`, `engines/anveshana/` |

The single-page interface is served at `/darshana`, and its own pages are at `/`, `/calendar`, `/compute`, `/email`, `/gallery`, `/library`, `/memory`, `/notes`, and `/tasks`.

## Storage and internals

These names appear in filenames, database tables, and logs rather than in URLs.

| What it is | Identifier |
|---|---|
| Application configuration read from the environment | `services/vyavastha.py` (`AppConfig`) |
| Bundled SearXNG configuration | `config/` |
| External-connections table | `sangam` |
| First-run setup: directories, database, initial admin | `pratishtha.py` |
| Integrations store, backed by `data/sangam.json` | `services/sangam.py` |
| Language-model client: streaming, endpoint health | `services/atman.py` |
| MCP server records table | `sevaka` |
| Retrieval-augmented generation manager | `services/veda.py` |
| SQLAlchemy models and the database engine | `core/smriti.py`, file `data/smriti.db` |
| System-prompt assembly and the agent tool loop | `services/karma.py` |
| Task scheduler that runs scheduled tasks | `services/kaala.py` (`TaskScheduler`) |
| User accounts file | `data/niti.json` |

## Command-line commands

The `cryozen` command dispatches to these.
[The CLI reference](/docs/reference/cli) documents what each one does and how to run it.

| What it manages | Command |
|---|---|
| Calendar | `cryozen-kaala` |
| Contacts | `cryozen-samparka` |
| Document store | `cryozen-shastra` |
| Email | `cryozen-patra` |
| Memory store | `cryozen-smriti` |
| Model serving | `cryozen-shakti` |
| Research sessions | `cryozen-shodh` |
| Scheduled tasks | `cryozen-karma` |
| Skills | `cryozen-kaushala` |
| Snapshot and restore of the data directory | `cryozen-sanrakshana` |

## Former package names

The top-level packages were renamed to English.
You will still meet the old names in commits, issues, and pull requests from before the rename, so this table maps them.

| Former name | Now |
|---|---|
| `dharma/` | `core/` |
| `sutra/` | `services/` |
| `yantra/` | `engines/` |
| `dwara/` | `routers/` |
| `sevaka/` | `mcp_servers/` |
| `vidhi/` | `cli/` |
| `darshana/` | `frontend/` |
| `pariksha/` | `tests/` |
| `sangam/` | `integrations/` |
| `sahayaka/` | `pairing/` |
| `shastra/` | `landing/` |
| `vyavastha/` | `config/` |

The product itself was also renamed to CryoZen from the project's previous name.
[The upgrade guide](/docs/operations/upgrading) covers what that means for an existing installation.

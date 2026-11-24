---
title: "API reference"
source: "docs/reference/api.md"
ref: "v1.2.0"
commit: "f358e1dc7f53603abdf3f3d7ae2face02bd939ca"
---
# API reference

CryoZen serves a single HTTP API from the same FastAPI application that serves the web interface, so every namespace listed here is the one the built-in interface already calls.
There is no separate public API for external callers.
Two credentials reach it: the session cookie a browser receives after login, and a bearer API token an external caller sends in the `Authorization` header.
This page describes the authentication model, every namespace and its gate, the endpoints an external integrator needs, and the conventions that apply across the surface.

## Authentication

Authentication runs in one middleware in `cryozen.py`, ahead of every route.
The middleware decides who you are, and route handlers then decide what you may touch.

CryoZen accepts two credentials:

- **Session cookie**: a successful `POST /api/auth/login` sets a `cryozen_session` cookie that is `HttpOnly` and `SameSite=Lax`, and marked `Secure` when you set `SECURE_COOKIES=true`.
- **Bearer API token**: send `Authorization: Bearer ody_your_api_token_here`, using a token minted through `/api/tokens`.

A pre-rename legacy session cookie is still accepted.
Tokens are stored as a bcrypt hash plus an 8-character prefix, so the raw value appears once at creation.

The middleware matches the bearer token by prefix against an in-memory cache, then verifies the candidate hashes with bcrypt.
Creating, updating, or deleting a token invalidates that cache, so a new token works on the next request without a restart.
Every accepted bearer request updates `last_used_at` off the request path.

### Exempt paths

A short list of paths skips authentication entirely.
The exact matches are `/api/auth/setup`, `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/status`, `/api/auth/features`, `/api/auth/settings`, `/api/auth/sangam/presets`, `/api/health`, `/api/ready`, `/api/version`, and `/login`.
The prefix matches are `/darshana` (static assets) and `/api/auth/oauth`.

One dynamic pattern is also exempt: `POST /api/tasks/{task_id}/webhook/{webhook_token}`.
That route carries its credential in the path, and its handler returns 404 when the token does not match an active task.
Without the exemption the middleware would reject the request before the handler ever read the token.

### Owner attribution

A cookie session resolves to the logged-in username.
A bearer token resolves to the pseudo-user `api`, which owns no rows, and the token's real owner is recorded separately on the request.
Routes that should attribute a token's actions to the human who minted it call `effective_user` in `services/niti_helpers.py`, which returns the token owner for bearer callers and the username for cookie callers.
A token with no recorded owner falls back to the `api` pseudo-user, so it never inherits another account's data.

Scopes are enforced by two routers only: `/api/v1/chat` in `routers/webhook_router.py`, and the `/api/codex` and `/api/claude` namespaces in `routers/codex_router.py`.
Elsewhere a bearer token authenticates as `api` and sees only rows owned by `api` or rows with no owner.

A third credential exists for the agent tool layer, and no external caller can use it.
When CryoZen's own tools call an admin-gated route over loopback they send `X-CryoZen-Internal-Token`, holding a per-process secret generated at startup or read from `CRYOZEN_INTERNAL_TOKEN`.
The middleware accepts it only on a direct loopback connection carrying no proxy forwarding header, and the accompanying `X-CryoZen-Owner` header attributes the call to a named user when that user exists.

### The two environment switches

Two variables change the model, and both are documented in [the configuration reference](/docs/reference/configuration):

- **`AUTH_ENABLED=false`**: the middleware is never installed, and route-level `require_admin` and `require_user` stop rejecting, so every endpoint runs as an anonymous single user.
- **`LOCALHOST_BYPASS=true`**: a request that arrives directly on `127.0.0.1` or `::1` skips authentication.

A request carrying any proxy forwarding header does not qualify as loopback, so a reverse proxy or tunnel cannot inherit local trust.
The headers that disqualify it are `x-forwarded-for`, `x-forwarded-host`, `x-real-ip`, `forwarded`, `cf-connecting-ip`, `cf-ray`, and `cf-visitor`.
Both variables default to the safe value: authentication on, loopback bypass off.

### The OpenAPI schema

The application is constructed with FastAPI's defaults, so `/openapi.json`, `/docs`, and `/redoc` are all served.
None of them appear in the exempt list, so an unauthenticated browser is redirected to `/login` instead of receiving the schema.
The schema is therefore reachable only by an authenticated session, and it is not disabled in production.

## Namespaces

The table below lists every prefix the application mounts.
The auth column names the strongest gate that applies: **None** for exempt paths, **Authenticated** for anything the middleware protects, **Admin** where handlers call `require_admin`, and **Token** where a bearer token with a specific scope is required.

### Chat and sessions

These namespaces drive conversations, their history, and their persistence:

| Prefix | Purpose | Auth |
| --- | --- | --- |
| `/api/chat` | Non-streaming chat turn, plus resume, stop, and stream-status for a session | Authenticated |
| `/api/chat_stream` | Streaming chat turn over Server-Sent Events | Authenticated |
| `/api/v1/chat` | Synchronous single-turn chat for external callers | Token, `chat` scope |
| `/api/session` | Create, patch, archive, fork, compact, export, and delete one session | Authenticated |
| `/api/sessions` | List, bulk-delete, auto-sort, and save sessions | Authenticated, admin to delete all |
| `/api/history` | Read and edit the message history of a session | Authenticated |
| `/api/conversations` | Derived conversation topics | Authenticated |
| `/api/inject_context` | Push extra context into a live session | Authenticated |
| `/api/rewrite` | Rewrite the last assistant message without running tools | Authenticated |
| `/api/search` | Full-text search across your own chat messages | Authenticated |
| `/api/compare` | Side-by-side model comparison runs and their votes | Authenticated |
| `/api/presets` | Prompt presets, user templates, and preset groups | Authenticated, admin for writes |

### Knowledge and memory

These namespaces hold the material the assistant reads from:

| Prefix | Purpose | Auth |
| --- | --- | --- |
| `/api/memory` | Long-term memory entries | Authenticated |
| `/api/documents` | Living documents with version history | Authenticated |
| `/api/personal` | Personal document directories and their uploads | Authenticated, admin for most routes |
| `/api/websearch` | Web search settings, providers, and queries | Authenticated |
| `/api/research` | Background deep-research tasks and their reports | Authenticated |
| `/api/skills` | Skills registry, import, and execution | Authenticated, admin for some routes |
| `/api/upload` | Chat file uploads | Authenticated, admin for some routes |
| `/api/workspace` | Browse server directories to pick a tool workspace | Authenticated |
| `/api/knowledge` | Retrieval index statistics | Admin |
| `/api/db` | Database statistics | Admin |

### Productivity

These namespaces cover mail, time, people, and notes:

| Prefix | Purpose | Auth |
| --- | --- | --- |
| `/api/email` | Mail accounts, folders, reading, drafting, and sending | Authenticated |
| `/api/calendar` | Calendar events, calendars, and account settings | Authenticated |
| `/api/contacts` | Contact records and their sync settings | Admin |
| `/api/notes` | Notes and checklists | Authenticated |
| `/api/tasks` | Scheduled tasks, their triggers, and per-task webhooks | Authenticated, one exempt route |
| `/api/assistant` | Personal assistant settings, runs, and companion pairing | Authenticated, admin to pair |
| `/api/editor-drafts` | Saved in-progress gallery-editor sessions | Authenticated |
| `/api/signatures` | Reusable visual signature stamps | Authenticated |
| `/api/prefs` | Per-user key and value preferences | Authenticated, admin for the vault path |
| `/api/vault` | Credential vault unlock, lock, and settings | Admin |
| `/api/export` | Export memories, presets, settings, and skills | Admin |
| `/api/import` | Import a previously exported bundle | Admin |

### Models and serving

These namespaces configure which models answer and where they run:

| Prefix | Purpose | Auth |
| --- | --- | --- |
| `/api/models` | Models available across configured endpoints | Authenticated |
| `/api/model-endpoints` | Create, probe, patch, and delete model endpoints | Admin |
| `/api/model` | Download a model, list the local cache, and start a serve | Admin |
| `/api/compute` | Remote GPU hosts, packages, ports, and serve state | Authenticated, admin for most routes |
| `/api/providers` | Known providers and connect flows | Admin |
| `/api/discover` | Discover reachable local endpoints | Admin |
| `/api/probe` | Probe an endpoint for reachability | Admin |
| `/api/probe-selected` | Probe the currently selected endpoints | Admin |
| `/api/ping` | Reachability check for a configured endpoint | Admin |
| `/api/default-chat` | The endpoint and model used for new chats | Authenticated |
| `/api/tools` | Tool definitions the agent loop may call | Authenticated, admin for writes |
| `/api/embeddings` | Local embedding models and the embedding endpoint | Admin |
| `/api/shell` | Command execution on the host | Admin |

### Integrations

These namespaces connect CryoZen to other systems:

| Prefix | Purpose | Auth |
| --- | --- | --- |
| `/api/integrations/catalog` | Registry-driven integration catalog, test, and connect | Authenticated, admin to connect and delete |
| `/api/integrations/accounts` | Linked Google, Microsoft, and Apple accounts and their syncs | Authenticated |
| `/api/mcp` | Model Context Protocol server management | Admin |
| `/api/codex` | Scope-gated bridge for the Codex agent plugin | Token scopes, or session |
| `/api/claude` | Scope-gated bridge for the Claude agent skill | Token scopes, or session |
| `/api/copilot` | GitHub Copilot device-flow login | Admin |
| `/api/webhooks` | Register, test, toggle, and delete outbound webhooks | Admin |
| `/api/tokens` | Mint, rename, rescope, and revoke API tokens | Admin |

### Media

These namespaces handle images, speech, and assets:

| Prefix | Purpose | Auth |
| --- | --- | --- |
| `/api/gallery` | Image library, albums, tags, and gallery statistics | Authenticated |
| `/api/image` | Inpaint, upscale, sharpen, denoise, and background removal | Authenticated |
| `/api/generated-image` | Serve a generated image file by name | Authenticated |
| `/api/tts` | Text-to-speech synthesis | Authenticated |
| `/api/stt` | Speech-to-text transcription | Authenticated |
| `/api/emoji` | Same-origin emoji SVGs | Authenticated |
| `/api/fonts` | List user-supplied font files | Authenticated |

### System and admin

These namespaces expose instance state and destructive operations:

| Prefix | Purpose | Auth |
| --- | --- | --- |
| `/api/health` | Liveness ping | None |
| `/api/ready` | Readiness and integrity self-check | None |
| `/api/version` | Application version string | None |
| `/api/runtime` | Container detection and the resolved Ollama base URL | Authenticated |
| `/api/auth` | Login, logout, signup, setup, status, OAuth, and user management | Mixed, several routes exempt |
| `/api/cleanup` | Preview and run session cleanup | Authenticated |
| `/api/admin` | Per-category data wipes | Admin |
| `/api/test` | YouTube extraction check | Admin |
| `/api/test-research` | Research pipeline check | Admin |

The application also serves HTML pages at `/`, `/login`, `/notes`, `/calendar`, `/compute`, `/email`, `/memory`, `/gallery`, `/tasks`, and `/library`.
Only `/login` is exempt from authentication.

## Endpoints for external integrators

Four endpoints cover the external use cases: three unauthenticated probes and one chat call.
All examples assume the default local URL `http://localhost:7000`.

### Liveness

`GET /api/health` answers without touching the database, so it stays cheap enough for a container liveness probe.
Call it with no credential:

```bash
curl -s http://localhost:7000/api/health
```

It always returns 200 with a fixed shape:

```json
{
  "status": "healthy",
  "timestamp": "2026-07-31T09:14:22.481920"
}
```

### Readiness

`GET /api/ready` verifies that the database answers, that the data directory is present and writable, whether storage stays on this host, and how old the newest backup is.
It returns 200 when every critical check passes and 503 otherwise, which makes it usable as an orchestrator readiness gate.
The following command prints the status code alongside the body:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:7000/api/ready
```

A ready instance returns a body of this shape, where the version shown is whatever the instance runs rather than a value to assert against:

```json
{
  "ready": true,
  "version": "1.4.0",
  "checks": {
    "smriti": { "ok": true },
    "data_dir": { "ok": true, "path": "/app/data" },
    "local_first": { "ok": true, "local": true },
    "backup": {
      "ok": true,
      "age_seconds": 22462,
      "daily_age_seconds": 22462,
      "scheduled": { "enabled": true, "keep": 7, "reason": null }
    }
  },
  "timestamp": "2026-07-31T09:14:22.481920"
}
```

The `local_first` check never fails readiness.
It reports whether the configured database URL points at this host, because a remote database is a valid deployment.

The `backup` check never fails readiness either.
It reports the age in seconds of the newest archive and of the newest scheduled archive, because a manual snapshot must not hide a scheduler that stopped writing; a `null` age means no such archive exists yet, and a negative age means the archive's clock is ahead of the host's.
`scheduled.keep` echoes `CRYOZEN_BACKUP_KEEP`, and `scheduled.enabled` is true only when the daily backup can run here; otherwise `scheduled.reason` is `keep is 0`, `database is not SQLite`, or `in-process tasks disabled`, and it is `null` when enabled.
It carries no paths, because this route needs no login, and if the status cannot be read it reports `"error": "unavailable"` and logs the cause.

### Version

`GET /api/version` returns the running application version, which lets a client refuse to talk to an instance it does not support:

```bash
curl -s http://localhost:7000/api/version
```

The response carries one field, whose value is the version the instance runs and changes with every release, so read it rather than copying the illustration below:

```json
{
  "version": "1.4.0"
}
```

The single source of that value is the git tag.
`scripts/stamp_version.py` writes it into `services/_build_version.py` at build time (every packaging script, the Docker build, and `release.yml` do this), `services/constants.py` reads it as `APP_VERSION`, and `core/constants.py` re-exports it.
An unstamped checkout reports `0.0.0-dev`; the packaging smoke test refuses to release such a bundle.
`cryozen --version` on any installed artifact prints the same value, and the release pipeline asserts it equals the tag on every platform before publishing.

### Chat

`POST /api/v1/chat` is the synchronous chat endpoint for external callers such as n8n, Make, and your own scripts.
It refuses cookie sessions with 403 and requires a bearer token carrying the `chat` scope.

The request body accepts six fields:

- **`message`**: the user turn, required, up to 32000 characters.
- **`model`**: the model identifier, up to 200 characters.
- **`session`**: an existing session identifier to resume, up to 100 characters.
- **`api_key`**: a provider key to use for this call, up to 256 characters.
- **`base_url`**: an explicit provider base URL, up to 2048 characters.
- **`provider`**: a provider name to resolve a base URL from, up to 50 characters.

The endpoint resolves a target in three ordered cases.
When you pass `session`, it resumes that session, and it returns 404 unless the token owner matches the session owner exactly.
When you pass `api_key`, it creates a new session against the resolved provider.
When you pass neither, it falls back to the first enabled model endpoint visible to the token owner, and returns 400 when there is none.

This call creates a session against DeepSeek using a key you supply:

```bash
curl -s -X POST http://localhost:7000/api/v1/chat \
  -H "Authorization: Bearer ody_your_api_token_here" \
  -H "Content-Type: application/json" \
  -d '{
        "message": "Summarize what a readiness probe checks.",
        "model": "deepseek-chat",
        "provider": "deepseek",
        "api_key": "your_provider_api_key_here"
      }'
```

The response carries three fields, and `session_id` is what you pass back as `session` on the next turn:

```json
{
  "response": "A readiness probe reports whether the instance can serve traffic.",
  "session_id": "8f14e45f-ceea-467a-9c1e-1234567890ab",
  "model": "deepseek-chat"
}
```

You can name a provider instead of a URL.
The recognized provider names are `deepseek`, `openai`, `mistral`, `groq`, `together`, `openrouter`, `ollama`, `fireworks`, and `venice`.
When you omit `provider`, the endpoint infers one from the model prefix: `deepseek`, `gpt-`, `o1`, `o3`, and `o4` resolve to their vendor, and `mistral`, `llama`, and `mixtral` resolve to Mistral and Groq respectively.
When neither resolves, the endpoint returns 400 and names both ways to fix it.

A `base_url` you supply is validated before use.
The validator rejects any scheme other than `http` or `https`, and rejects hostnames that resolve to loopback, private, link-local, reserved, multicast, or carrier-grade NAT addresses, along with `localhost` and the `.local`, `.internal`, `.lan`, `.intranet`, and `.localhost` suffixes.
Base URLs resolved from a known provider name skip that check, and endpoints an administrator configured in the interface are not restricted, so a local Ollama endpoint keeps working.

Every completed call fires the `chat.completed` webhook event, described in [the API access guide](/docs/guides/api-access).

## Conventions

The surface is JSON over HTTP with a small number of shapes, and this section states them so you do not have to infer them per endpoint.

### Request and response bodies

Most endpoints accept and return `application/json`.
Two surfaces do not: `POST /api/chat_stream` reads multipart form data, and file uploads read multipart.
`POST /api/tokens` and `POST /api/webhooks` take a JSON body only, and any other `Content-Type`, or none, gets 415.
Collection endpoints return a bare JSON array rather than a wrapper object, as `GET /api/tokens` and `GET /api/webhooks` do.

Cross-origin requests are allowed only from the origins in `ALLOWED_ORIGINS`, which defaults to `http://localhost,http://127.0.0.1`.
A browser write under `/api` (any method but `GET`, `HEAD`, and `OPTIONS`) from any other page gets 403 with `{"error": "Cross-origin request refused"}`, even from another port on the same host.
The check reads `Sec-Fetch-Site` when the browser sends it and otherwise compares `Origin` with the request's host, so requests from scripts and servers, which send neither header, are unaffected.
Requests with a bearer token and task webhook triggers are exempt.
The allowed methods are `GET`, `POST`, `PUT`, `PATCH`, and `DELETE`, and credentials are permitted.

### Error format

Three error shapes exist, and which one you get depends on where the request failed.

Route handlers raise FastAPI's `HTTPException`, which serializes to a `detail` string:

```json
{
  "detail": "API token is not scoped for chat"
}
```

The authentication middleware answers before any handler runs, and uses an `error` key:

```json
{
  "error": "Invalid API token"
}
```

Four domain exceptions have their own handlers, and those return a machine-readable code with a message.
The codes are `SESSION_NOT_FOUND` with 404, `INVALID_FILE_UPLOAD` with 400, `LLM_SERVICE_ERROR` with 502, and `WEB_SEARCH_ERROR` with 502:

```json
{
  "error": "SESSION_NOT_FOUND",
  "message": "No session with that id"
}
```

A non-API path that fails authentication is redirected to `/login` with 302 instead of receiving JSON.

### Status codes

These are the codes the application actually returns:

- **200**: success, including operations whose body reports a nested failure such as `/api/ready`.
- **302**: redirect to `/login` for an unauthenticated browser request outside `/api/`.
- **400**: malformed input, an unknown scope, an unknown provider, or a rejected URL.
- **401**: missing, invalid, or expired credentials, and failed logins.
- **403**: an authenticated caller without the required privilege, admin rights, or token scope, and a browser write from another origin.
- **404**: a missing record, and a record you are not allowed to see.
- **409**: a conflicting state, such as a username already taken or a task already running.
- **413**: an upload larger than the configured limit.
- **415**: a body that is not `application/json` on a JSON-only endpoint such as `POST /api/tokens`.
- **429**: a rate limit exceeded.
- **500**: an unhandled server-side failure.
- **502**: an upstream model or search provider failed.
- **503**: a subsystem is not ready.
- **504**: an upstream request timed out.

### Rate limiting

Rate limiting is applied at specific endpoints, not globally, and every limiter is in-memory and per-process.
Exceeding a limit returns 429.

The limits are:

- **`POST /api/auth/login`**: 15 requests per 60s per client IP address.
- **`POST /api/auth/signup`**: 3 requests per 300s per client IP address.
- **`POST /api/auth/setup`**: 3 requests per 300s per client IP address.
- **File uploads**: 60 files per minute per client IP address, counted per file in a batch.

`POST /api/v1/chat` has no rate limit of its own.
The upstream model call uses a 120s timeout.

### Streaming endpoints

Streaming endpoints return `text/event-stream` and frame each event as a `data: ` line holding one JSON object, followed by a blank line.
A stream ends with the literal line `data: [DONE]`.

The streaming endpoints are `POST /api/chat_stream`, `GET /api/chat/resume/{session_id}`, `POST /api/rewrite`, `GET /api/research/stream/{session_id}`, `POST /api/shell/stream`, `GET /api/probe`, and `GET /api/model-endpoints/{endpoint_id}/probe`.

Chat events carry a `type` field naming the event, or a `delta` field carrying the next text fragment.
The types the chat stream emits include `attachments`, `rag_sources`, `web_sources`, `memories_used`, `model_info`, `tool_start`, `research_progress`, `research_sources`, `research_findings`, `research_done`, `compacted`, `metrics`, and `message_saved`.

Consume a stream by reading lines, skipping blanks, stripping the `data: ` prefix, and stopping at `[DONE]`.
The following command prints raw events from a chat stream, using a session cookie because `/api/chat_stream` reads form data from the interface:

```bash
curl -N -X POST http://localhost:7000/api/chat_stream \
  -b "cryozen_session=your_session_cookie_here" \
  -F "message=Explain server-sent events in one sentence." \
  -F "session=your_session_id_here"
```

For external callers, prefer `POST /api/v1/chat`, which returns one complete JSON response and needs no stream parsing.

## Related pages

Continue with these:

- [Calling the API from your own code](/docs/guides/api-access): mint a token, choose scopes, and verify webhook signatures.
- [Configuration reference](/docs/reference/configuration): every environment variable that changes the behavior described here.

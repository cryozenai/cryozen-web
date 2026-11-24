---
title: "Configuration reference"
source: "docs/reference/configuration.md"
ref: "v1.2.0"
commit: "f358e1dc7f53603abdf3f3d7ae2face02bd939ca"
---
# Configuration reference

This page lists every environment variable that CryoZen reads, grouped by the concern it controls, with the default the code actually applies and the effect of changing it.
Configuration comes from two places: a `.env` file in the repository root, which `cryozen.py` loads at import with `load_dotenv(encoding="utf-8-sig")`, and the process environment inherited from your shell or container runtime.
Values already present in the process environment win over `.env`, because `load_dotenv` does not overwrite existing keys.
Any legacy variable prefixed with the project's previous name is mirrored onto the matching `CRYOZEN_*` name once at startup by `_alias_legacy_env()` in `services/constants.py`, so pre-rename installs keep working without edits, and an explicitly set `CRYOZEN_*` value always beats its legacy twin.
Variables marked compose-only are consumed by `docker-compose.yml` or the Docker entrypoint and are never read by Python; variables marked test-only affect development tooling.

## Getting started

Copy the shipped template and edit it:

```bash
cp .env.example .env
```

Every value in `.env.example` is commented out or set to a safe default, so a fresh copy boots with local-only settings.
Read the `SESSION_SECRET` section below before you run CryoZen for anyone other than yourself.

## SESSION_SECRET

`SESSION_SECRET` is the signing key for the Starlette session cookie, read in `cryozen.py`:

```python
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", secrets.token_urlsafe(32)),
)
```

When `SESSION_SECRET` is unset, the default argument evaluates on every process start, so the application generates a **new random key on every boot**.

Be precise about what that breaks.
This cookie is not your login session: sign-in tokens live server side in `sessions.json` and survive a restart on their own.
The Starlette session cookie carries short-lived state instead, which is the in-flight OAuth handshake (the `state` value and the account-link marker).
Losing the key therefore breaks any authorization already in progress, so a user who is mid-consent when the process restarts gets a failed callback and has to start over.

The larger consequence is that you cannot run more than one worker or replica: each process holds a different key, so an OAuth flow begun on one is rejected by another, and sign-in with a provider fails at random.

Set `SESSION_SECRET` explicitly for any deployment that is not a throwaway single-user experiment, and for every multi-user deployment without exception.
Generate a value with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Store the result in `.env` or your secret manager, keep it out of version control, and keep it stable across restarts.
Rotating it invalidates in-flight OAuth handshakes only, so a user who is mid-consent has to start that flow again, and signed-in sessions are untouched.

| Variable | Default | What it does |
| --- | --- | --- |
| `SESSION_SECRET` | A fresh `secrets.token_urlsafe(32)` per process (`cryozen.py`) | Signs the Starlette session cookie that carries in-flight OAuth state. Leaving it unset breaks OAuth across restarts and across workers. |

## Core and networking

| Variable | Default | What it does |
| --- | --- | --- |
| `APP_BIND` | `127.0.0.1` | Address side of the Compose port map (`docker-compose.yml`) and the host interface the source-checkout launch scripts bind. Set `0.0.0.0` only when you intend LAN or reverse-proxy exposure. |
| `APP_PORT` | `7000`, and `7860` in the source-checkout macOS launch script because AirPlay Receiver usually holds 7000 | Host port for the Compose port map and the source-checkout launch scripts; the desktop launcher reads `CRYOZEN_PORT` instead; also read by `pairing/service.py` to build the pairing URL, and by `core/self_url.py` as the last fallback before 7000. |
| `CRYOZEN_HOST` | Unset, falls back to `APP_BIND` | Bind override for the source-checkout launch scripts, with higher precedence than `APP_BIND`. Not read by the Python application. |
| `CRYOZEN_PORT` | Unset, falls back to `APP_PORT` | Launcher port override with higher precedence than `APP_PORT`. The packaged launcher exports it, and `core/self_url.py` reads it only when no `uvicorn --port` flag or accepted request says otherwise. |
| `CRYOZEN_SELF_URL` | Unset, inferred from the listening socket, then `uvicorn --port`, `CRYOZEN_PORT`, `APP_PORT`, and 7000 | Origin the app uses to call its own API (`core/self_url.py`). Set it only when inference cannot work, such as TLS on the listener, and keep it on loopback because the internal token is only honoured from a loopback client. |
| `UVICORN_PORT`, `UVICORN_HOST` | Unset | Uvicorn's own settings. Under the `uvicorn` command, `core/self_url.py` reads them when `--port` or `--host` is absent, to predict the self-call origin before the first request. |
| `ALLOWED_ORIGINS` | `http://localhost,http://127.0.0.1` | Comma-separated CORS allowlist passed to `CORSMiddleware` (`cryozen.py`). Credentials are allowed, so list your exact public origin rather than a wildcard. The same list names the other origins whose pages may make writes under `/api` with a signed-in session (`CrossOriginWriteGuard` in `core/middleware.py`). |
| `REQUEST_HARD_TIMEOUT` | `45` seconds | Wall-clock cap for a single request before the middleware returns 504 (`cryozen.py`). Streaming, shell, research, model download, and upload prefixes are exempt. |
| `APP_PUBLIC_URL` | Unset | Externally reachable origin used to build the MCP OAuth redirect URI when `OAUTH_REDIRECT_BASE_URL` is unset (`services/mcp_oauth.py`). |
| `DATABASE_URL` | `sqlite:///{DATA_DIR}/smriti.db` (`core/smriti.py`) | SQLAlchemy connection URL. `DATA_DIR` here is the resolved vault path, not the repository `./data` directory. `pratishtha.py` sets a repository-local default for the standalone setup script only. Backups follow this URL: a SQLite file is archived as `data/smriti.db` wherever it lives. Any other backend needs its own backup tools: the snapshot refuses, and the daily backup does not run. |
| `LOG_LEVEL` | `WARNING` | Root log level forced by the `cli/` entry points (`cli/_lib/_common.py`). Accepts any `logging` level name. |
| `CHROMADB_BIND` | `127.0.0.1` | Compose-only. Host interface for the bundled ChromaDB port map. |
| `NTFY_BIND` | `127.0.0.1` | Compose-only. Host interface for the bundled ntfy port map. |
| `NTFY_BASE_URL` | `http://localhost:8091` | Compose-only. Public base URL handed to the ntfy container. No Python code reads it; `routers/auth_router.py` only mentions it in an error hint. |
| `PUID` | `1000` | Compose-only. Numeric user id the container drops to before running uvicorn. |
| `PGID` | `1000` | Compose-only. Numeric group id the container drops to. |
| `COMPOSE_FILE` | Unset | Native `docker compose` feature, not CryoZen code. A colon-separated (semicolon on Windows) list of compose files merged left to right, used to layer the GPU overlays. |
| `RENDER_GID` | `render` | Compose-only, AMD ROCm overlay. Numeric gid of the host `render` group, read from `getent group render`. |

## Authentication and sessions

| Variable | Default | What it does |
| --- | --- | --- |
| `AUTH_ENABLED` | `true` | Set to `false` to disable the authentication middleware and the admin gate entirely (`cryozen.py`, `core/middleware.py`, `services/niti_helpers.py`). Every request then runs unauthenticated. |
| `LOCALHOST_BYPASS` | `false` | Set to `true` to let loopback requests skip authentication while remote requests still authenticate (`cryozen.py`, `services/niti_helpers.py`). Startup logs a warning when it is on. Keep it off for Docker, LAN, and reverse-proxy deployments, because a proxy can make remote traffic look like loopback. |
| `SECURE_COOKIES` | `false` | Set to `true` to mark the session cookie and the auth cookie `Secure` (`cryozen.py`, `routers/auth_router.py`, `routers/auth_router.py`). Required when CryoZen is served over HTTPS, and breaks plain-HTTP access when enabled. |
| `CRYOZEN_SINGLE_USER` | `1` | Any value other than `0` keeps the calendar router in single-user mode, where unauthenticated writes are attributed to `CRYOZEN_FALLBACK_OWNER` (`routers/kaala_router.py`). Set `0` on a real multi-user install. |
| `CRYOZEN_FALLBACK_OWNER` | `owner@localhost` | Owner string stamped on calendar rows created without an authenticated user (`routers/kaala_router.py`). |
| `CRYOZEN_INTERNAL_TOKEN` | A fresh `secrets.token_hex(32)` per process (`core/middleware.py`) | Shared secret carried in the `X-CryoZen-Internal-Token` header so the in-process agent tool layer can reach admin-gated routes over loopback. The random per-process default is correct for a single process; set it explicitly only when a second process must present the same token. |
| `CRYOZEN_ADMIN_USER` | `admin` when the code path runs | Read by `create_default_admin()` at `pratishtha.py`. That function is never called by `pratishtha.py:main()`, which writes an empty `niti.json` and hands admin creation to the browser first-run flow instead, so this variable has no effect today. Compose still forwards it. |
| `CRYOZEN_ADMIN_PASSWORD` | Unset | Read by `create_default_admin()` at `pratishtha.py` and subject to the same dead code path, so it has no effect today. Create the first admin through the browser setup screen. |
| `CRYOZEN_SKIP_ADMIN_PROMPT` | Unset | Suppresses the interactive admin prompt inside `create_default_admin()` (`pratishtha.py`). Reachable only through the same uncalled function, so it has no effect today. |
| `CRYOZEN_SKIP_RUN_HINT` | Unset | Set to any non-empty value to suppress the "start the server with" hint printed at the end of setup (`pratishtha.py`). The macOS launcher sets it because it starts the server itself on a different port. |

## LLM providers

| Variable | Default | What it does |
| --- | --- | --- |
| `LLM_HOST` | `localhost` | Primary host scanned for OpenAI-compatible model servers (`services/constants.py`, re-exported by `core/constants.py`), and the host in the default embedding URL (`services/embeddings.py`). |
| `LLM_HOSTS` | Empty | Comma-separated extra hosts for model discovery (`services/constants.py`, `services/model_discovery.py`). Hostnames or IPs only; discovery scans ports 8000 to 8020 plus 1234 and 11434 on each. Setting it overrides Tailscale host discovery. |
| `OLLAMA_BASE_URL` | Unset | Explicit Ollama endpoint. Its hostname and non-default port join the discovery scan (`services/model_discovery.py`) and it is reported by `/api/runtime` (`cryozen.py`). |
| `OLLAMA_URL` | Unset | Alternate spelling checked after `OLLAMA_BASE_URL` in both the discovery scan and `/api/runtime` (`cryozen.py`). |
| `LM_STUDIO_URL` | Unset | LM Studio endpoint whose hostname and port join the discovery scan (`services/model_discovery.py`). `docker-compose.yml` and both GPU compose files forward it, so setting it in `.env` reaches the container. |
| `OPENAI_API_KEY` | Unset | OpenAI API key (`services/constants.py`). |
| `ANTHROPIC_API_KEY` | Unset | Anthropic API key (`services/constants.py`). |
| `GOOGLE_API_KEY` | Unset | Google API key, used both as an LLM provider key (`services/constants.py`) and as the Google Programmable Search key (`engines/anveshana/providers.py`). |
| `DEEPSEEK_API_KEY` | Unset | DeepSeek API key (`services/constants.py`). |
| `MISTRAL_API_KEY` | Unset | Mistral API key (`services/constants.py`). |
| `PERPLEXITY_API_KEY` | Unset | Perplexity API key (`services/constants.py`). |
| `GROQ_API_KEY` | Unset | Groq API key (`services/constants.py`). |
| `TOGETHER_API_KEY` | Unset | Together AI API key (`services/constants.py`). |
| `FIREWORKS_API_KEY` | Unset | Fireworks AI API key (`services/constants.py`). |
| `XAI_API_KEY` | Unset | xAI API key (`services/constants.py`). |
| `LLM_CA_BUNDLE` | Unset | Path to a PEM file of extra trusted roots, layered on top of the system and certifi bundles (`services/tls_overrides.py`). Verification stays on for every host; the trust set only grows. A missing file logs a warning and falls back to the default trust store. |
| `CRYOZEN_COPILOT_CLIENT_ID` | `01ab8ac9400c4e429b23` | GitHub OAuth client id used for the Copilot device flow (`services/copilot.py`). The default is the public VS Code client id, because GitHub allowlists which client ids may reach Copilot. |
| `CRYOZEN_COPILOT_API_VERSION` | `2026-06-01` | Value of the dated Copilot API version header (`services/copilot.py`). |
| `CRYOZEN_COPILOT_USER_AGENT` | `CryoZen/1.0` | User-Agent sent to the Copilot API (`services/copilot.py`). |
| `CRYOZEN_COPILOT_INTEGRATION_ID` | `vscode-chat` | Copilot integration id header (`services/copilot.py`). |
| `CRYOZEN_COPILOT_EDITOR_VERSION` | `CryoZen/1.0` | Editor version header sent to the Copilot API (`services/copilot.py`). |

## Model serving and hardware

| Variable | Default | What it does |
| --- | --- | --- |
| `HF_TOKEN` | Unset | HuggingFace token used to log in before loading gated or private diffusion repos (`cli/diffusion_server.py`). Compose forwards it to the container. |
| `HUGGING_FACE_HUB_TOKEN` | Unset | Fallback token name checked after `HF_TOKEN` (`cli/diffusion_server.py`). |
| `HF_HUB_DOWNLOAD_MAX_WORKERS` | `8` | Parallel worker count passed to `snapshot_download` (`cli/hf_download.py`). |
| `HF_HUB_ENABLE_HF_TRANSFER` | Set to `1` when the `hf_transfer` package is importable (`cli/hf_download.py`) | Enables the Rust-backed parallel downloader. Set it to `0` yourself to opt out. |
| `HF_HUB_DISABLE_SYMLINKS` | Set to `1` on Windows only (`cryozen.py`, `services/embeddings.py`) | Forces HuggingFace to copy model files instead of symlinking, which is required on network-share and UNC data directories. Both call sites use `setdefault`, so an explicit value wins. |
| `HF_HUB_DISABLE_SYMLINKS_WARNING` | Set to `1` on Windows only (`cryozen.py`, `services/embeddings.py`) | Suppresses the corresponding HuggingFace warning. |
| `HF_HUB_DISABLE_PROGRESS_BARS` | Set to `0` (`cli/hf_download.py`) | The downloader replaces tqdm with a pipe-friendly version and needs HuggingFace's bars left on to render it, so it defaults this to `0`. The call uses `setdefault`, so exporting `1` wins and suppresses download progress entirely. |
| `HUGGINGFACE_HUB_CACHE` | Unset | Read inside a generated inspection snippet that locates the on-disk hub cache (`routers/shakti_serve_router.py`). |
| `HF_HOME` | `~/.cache/huggingface` in the same snippet | Fallback cache root when `HUGGINGFACE_HUB_CACHE` is unset (`routers/shakti_serve_router.py`). |
| `DATA_DIR` | `data`, relative to the working directory | Read directly by the Shakti serve state file (`routers/shakti_serve_router.py`), the Codex router (`routers/codex_router.py`), and the background job store (`services/bg_jobs.py`). This is a different variable from `CRYOZEN_DATA_DIR`; see the storage section. |

## Web search

| Variable | Default | What it does |
| --- | --- | --- |
| `SEARXNG_INSTANCE` | `http://localhost:8080` | SearXNG base URL used when no `search_url` is saved in admin settings (`services/constants.py`, `engines/anveshana/providers.py`). Compose overrides it to `http://searxng:8080` for in-network access. |
| `SEARXNG_GENERAL_ENGINES` | `bing,mojeek,presearch` | Comma-separated engine list sent with general-category SearXNG queries (`engines/anveshana/providers.py`). The upstream defaults are routinely rate limited, which is why this pinned list exists. |
| `DATA_BRAVE_API_KEY` | Unset | Brave Search API key, used only when no Brave key is stored in admin settings or the credential store (`engines/anveshana/providers.py`). |
| `GOOGLE_PSE_CX` | Unset | Google Programmable Search engine id, paired with `GOOGLE_API_KEY` (`engines/anveshana/providers.py`). |
| `TAVILY_API_KEY` | Unset | Tavily API key fallback (`engines/anveshana/providers.py`). |
| `SERPER_API_KEY` | Unset | Serper API key fallback (`engines/anveshana/providers.py`). |
| `SEARXNG_SECRET` | Empty, and the container generates one on first boot | Compose-only. SearXNG cookie and CSRF secret, written into `settings.yml` in the `searxng-data` volume. |

Search provider keys resolve in a fixed order: the admin settings field first, then the unified integration credential store, then the legacy shared `search_api_key` field, and only then the environment variable.
An environment key therefore acts as a fallback, not an override.

## Embeddings and vector store

| Variable | Default | What it does |
| --- | --- | --- |
| `EMBEDDING_URL` | `http://{LLM_HOST}:11434/v1/embeddings` (`services/embeddings.py`) | OpenAI-compatible embeddings endpoint. The admin panel writes this key back into the process environment when you save an endpoint (`routers/embedding_router.py`). |
| `EMBEDDING_MODEL` | `all-minilm:l6-v2` (`services/embeddings.py`) | Model name sent to the embeddings endpoint. It must exist on that endpoint. |
| `EMBEDDING_API_KEY` | Unset | Bearer token for the embeddings endpoint (`services/embeddings.py`). |
| `FASTEMBED_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` (`services/embeddings.py`, `routers/embedding_router.py`) | Local ONNX fallback model used when no HTTP embeddings endpoint answers. |
| `FASTEMBED_CACHE_PATH` | `<repo>/data/fastembed_cache` (`services/embeddings.py`) | Directory for the downloaded fastembed model. The admin panel's download check reads the same path. |
| `CHROMADB_HOST` | `localhost` | ChromaDB host (`services/chroma_client.py`). Compose overrides it to `chromadb`. |
| `CHROMADB_PORT` | `8100` | ChromaDB port (`services/chroma_client.py`). Compose overrides it to `8000`, the in-container port. |
| `CHROMADB_CONNECT_TIMEOUT` | `2.0` seconds | TCP probe timeout before the client declares ChromaDB unreachable (`services/chroma_client.py`). Keeps an unreachable vector store from stalling startup for the full OS connect timeout. |

## Email (IMAP/SMTP)

The web application and the standalone MCP email server read overlapping variable names with different defaults, so both are listed.
In the web application these values are only a fallback for an install without user accounts: a saved email account in the database wins, and a signed-in user with no account of their own gets "no mail account configured" rather than these values (`routers/email_helpers.py`).
At the first startup with an empty `email_accounts` table they are copied once into an account owned by the administrator, which `email_account_seeded_at` in `settings.json` records (`core/smriti.py`); see [the upgrade guide](/docs/operations/upgrading).

| Variable | Default | What it does |
| --- | --- | --- |
| `IMAP_HOST` | Empty in the app (`routers/email_helpers.py`), `localhost` in the MCP server (`mcp_servers/email_server.py`) | IMAP server hostname. |
| `IMAP_PORT` | `993` in the app (`routers/email_helpers.py`), `31143` in the MCP server (`mcp_servers/email_server.py`) | IMAP server port. |
| `IMAP_USER` | Empty | IMAP username (`routers/email_helpers.py`, `mcp_servers/email_server.py`). |
| `IMAP_PASSWORD` | Empty | IMAP password or app-specific password (`routers/email_helpers.py`, `mcp_servers/email_server.py`). |
| `IMAP_SSL` | `false` | MCP server only. Set `true` for implicit TLS on connect (`mcp_servers/email_server.py`). |
| `IMAP_STARTTLS` | `true` | MCP server only. Set `false` to skip STARTTLS negotiation (`mcp_servers/email_server.py`). |
| `SMTP_HOST` | Empty | SMTP server hostname (`routers/email_helpers.py`, `mcp_servers/email_server.py`). |
| `SMTP_PORT` | `465` | SMTP server port (`routers/email_helpers.py`, `mcp_servers/email_server.py`). |
| `SMTP_SECURITY` | Empty | Transport mode hint carried alongside the port (`routers/email_helpers.py`, `mcp_servers/email_server.py`). |
| `SMTP_USER` | Empty | SMTP username (`routers/email_helpers.py`, `mcp_servers/email_server.py`). |
| `SMTP_PASSWORD` | Empty | SMTP password (`routers/email_helpers.py`, `mcp_servers/email_server.py`). |
| `SMTP_STARTTLS` | `false` | MCP server only. Set `true` to negotiate STARTTLS (`mcp_servers/email_server.py`). |
| `SMTP_SSL` | `true` | MCP server only. Set `false` to disable implicit TLS (`mcp_servers/email_server.py`). |
| `EMAIL_FROM` | Empty | Envelope and header From address (`routers/email_helpers.py`, `mcp_servers/email_server.py`). |
| `ARCHIVE_FOLDER` | `Archive` | MCP server only. IMAP folder used by the archive action (`mcp_servers/email_server.py`). |
| `TRASH_FOLDER` | `Trash` | MCP server only. IMAP folder used by the delete action (`mcp_servers/email_server.py`). |
| `EMAIL_CACHE_DB` | `{DATA_DIR}/email_cache.db` | MCP server only. SQLite path for the message cache (`mcp_servers/email_server.py`). |
| `EMAIL_SOCKET_TIMEOUT` | `20` seconds | MCP server only. Socket timeout for IMAP and SMTP connections (`mcp_servers/email_server.py`). |
| `CRYOZEN_IMAP_TIMEOUT_SECONDS` | `30` seconds, clamped to the range 5 to 300 | Application IMAP socket timeout (`routers/email_helpers.py`). A non-numeric value falls back to 30 rather than failing. |
| `CRYOZEN_MAIL_ATTACHMENTS_DIR` | `{DATA_DIR}/mail-attachments` | Directory where downloaded attachments are written (`routers/email_helpers.py`, `routers/shastra_router.py`). |

## Calendar and contacts

| Variable | Default | What it does |
| --- | --- | --- |
| `CARDDAV_URL` | Empty | CardDAV base URL, used only when no `carddav_url` is saved in settings (`routers/contacts_router.py`). |
| `CARDDAV_USERNAME` | Empty | CardDAV username fallback (`routers/contacts_router.py`). |
| `CARDDAV_PASSWORD` | Empty | CardDAV password fallback (`routers/contacts_router.py`). |
| `ACCOUNT_SYNC_ENABLED` | `1` | Set to `0`, `false`, `no`, or `off` to stop the background linked-account sync loop (`cryozen.py`). Manual "Sync now" still works. |
| `ACCOUNT_SYNC_INTERVAL_MIN` | `15` minutes, floored at 1 | Interval between background sync passes over every linked Google, Microsoft, and Apple account (`cryozen.py`). A non-numeric value falls back to 15. |
| `MICROSOFT_TENANT` | `common` | Tenant audience for Microsoft sign-in and Graph access (`services/microsoft_tenant.py`). Accepts `common`, `organizations`, `consumers`, or a tenant GUID. A verified domain such as `contoso.onmicrosoft.com` passes discovery but fails issuer validation on every login, so use the GUID. |

## Integrations and OAuth

Social sign-in is optional, and a provider's button appears on the login page only once its client id is set.
The redirect URI to register per provider is `{your_base_url}/api/auth/oauth/callback/{provider}`, and linked-account data access needs the extra URI `{your_base_url}/api/integrations/accounts/callback/{provider}`.

| Variable | Default | What it does |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Unset | Enables Google OpenID Connect sign-in (`routers/auth_router.py`) and the delegated Google data flow (`services/oauth_delegated.py`). |
| `GOOGLE_CLIENT_SECRET` | Unset | Google OAuth client secret (`routers/auth_router.py`, `services/oauth_delegated.py`). |
| `MICROSOFT_CLIENT_ID` | Unset | Enables Microsoft Entra ID sign-in (`routers/auth_router.py`) and the delegated Microsoft Graph flow (`services/oauth_delegated.py`). |
| `MICROSOFT_CLIENT_SECRET` | Unset | Microsoft OAuth client secret (`routers/auth_router.py`, `services/oauth_delegated.py`). |
| `GITHUB_CLIENT_ID` | Unset | Enables GitHub sign-in (`routers/auth_router.py`). GitHub OAuth apps offer no PKCE and no OIDC id token, so the flow relies on the `state` parameter and the `user:email` scope. |
| `GITHUB_CLIENT_SECRET` | Unset | GitHub OAuth client secret (`routers/auth_router.py`). |
| `FACEBOOK_CLIENT_ID` | Unset | Enables Facebook Login (`routers/auth_router.py`). |
| `FACEBOOK_CLIENT_SECRET` | Unset | Facebook app secret (`routers/auth_router.py`). |
| `OAUTH_REDIRECT_BASE_URL` | `http://localhost:7000` after falling back to `APP_PUBLIC_URL` | Origin used to build the MCP OAuth redirect URI `{base}/api/mcp/oauth/callback` (`services/mcp_oauth.py`). Set it when CryoZen is reachable on a custom port, a reverse proxy, or a public domain. `APP_PORT` is deliberately not consulted, because it only maps the Docker host port while the application always listens on 7000 inside the container. |
| `CRYOZEN_DISABLE_MCP` | Unset | Set to `1`, `true`, or `yes` to skip registering every built-in MCP server (`services/builtin_mcp.py`). |
| `CRYOZEN_URL` | Unset, and required | Base URL of your CryoZen instance, read by the Claude and Codex integration bundles (`integrations/claude/skills/cryozen/scripts/cryozen_api.py`, `integrations/codex/scripts/cryozen_api.py`). The scripts exit with a "missing" message when it is empty. |
| `CRYOZEN_API_TOKEN` | Unset, and required | Agent token minted in CryoZen settings, read by the same two integration scripts (`.../cryozen_api.py`). |

Apple sign-in is not implemented.
There is no Apple provider, no Apple entry in `/api/auth/oauth/providers`, and no Apple button, so setting `APPLE_*` variables has no effect.
Apple linked accounts use an iCloud app-specific password instead, because Apple offers no delegated-data OAuth.

## Storage paths and limits

| Variable | Default | What it does |
| --- | --- | --- |
| `CRYOZEN_DATA_DIR` | `~/.cryozen`, or the legacy data directory under `~` from the project's previous name when that directory already exists and `~/.cryozen` does not (`services/constants.py`) | Absolute vault path holding sessions, memory, uploads, settings, and the SQLite database. It also overrides any `vault_path` stored in `~/.cryozen_vault_config.json`. Under pytest the suite pins it to a fresh temporary directory. Compose pins it to `/app/data` so writes land in the bind mount, and desktop packages set it to `~/Library/Application Support/CryoZen` on macOS, `%LOCALAPPDATA%\CryoZen` on Windows, and `~/.local/share/cryozen` on Linux. |
| `CRYOZEN_BACKUP_DIR` | `backups` inside `CRYOZEN_DATA_DIR` (`services/constants.py`) | Where the application writes its own backups: pre-migration database copies under `pre-migration/`, the scheduler's daily archives, and `cryozen-sanrakshana snapshot` output when `--out` is not given. Snapshots skip this directory and `backups` inside the data directory, so setting it later does not put older backups into new archives. They archive the database `DATABASE_URL` names, or refuse when it is not SQLite. Set it to another disk to keep backups off the data volume. On the Compose path, a path outside `/app/data` also needs its own volume mount. |
| `CRYOZEN_BACKUP_KEEP` | `7` (`services/constants.py`) | How many daily archives the scheduler keeps; older ones are deleted after a new one is written, starting with any stamped later than the new one, since those come from a clock error. `0` disables the daily backup. Manual snapshots are never rotated. |
| `DATA_DIR` | `data` | A separate variable read only by `routers/shakti_serve_router.py`, `routers/codex_router.py`, and `services/bg_jobs.py`. Setting `CRYOZEN_DATA_DIR` does not change it. |
| `CRYOZEN_GALLERY_UPLOAD_MAX_BYTES` | `104857600`, which is 100 MB (`routers/gallery_router.py`) | Maximum accepted gallery upload size in bytes. |
| `CRYOZEN_GALLERY_TRANSFORM_UPLOAD_MAX_BYTES` | `26214400`, which is 25 MB (`routers/gallery_router.py`) | Maximum accepted size for images uploaded to a transform endpoint. |
| `CRYOZEN_PERSONAL_UPLOAD_MAX_BYTES` | `26214400`, which is 25 MB (`routers/nija_router.py`) | Maximum accepted personal-document upload size. |
| `CRYOZEN_MEMORY_IMPORT_MAX_BYTES` | `10485760`, which is 10 MB (`routers/smarana_router.py`) | Maximum accepted size for a memory import file. |

## Background jobs and pollers

Each of these toggles accepts `0`, `false`, `no`, `off`, or an empty string as "off"; anything else counts as "on".

| Variable | Default | What it does |
| --- | --- | --- |
| `CRYOZEN_INPROCESS_POLLERS` | `1` | Runs the scheduled email poller inside the application process (`routers/email_pollers.py`). Set it to `0` when cron or another scheduler drives `cli/cryozen-patra poll-scheduled` and `cli/cryozen-patra poll-summary`, otherwise two schedulers race on the same SQLite file. |
| `CRYOZEN_INPROCESS_TASKS` | `1` | Runs the scheduled-task runner, which also writes the daily backup, inside the application process (`services/constants.py`). Set it to `0` to let an external driver fire scheduled tasks; that driver must then take the backups too. Calendar reminders are polled by the browser, so they need no equivalent gate. |
| `ACCOUNT_SYNC_ENABLED` | `1` | Controls the linked-account background sync loop (`cryozen.py`). |
| `CLEANUP_ENABLED` | `True` | Enables the periodic cleanup job (`services/constants.py`). The comparison is case-insensitive against `true`. |
| `CLEANUP_INTERVAL_HOURS` | `24` | Hours between cleanup passes (`services/constants.py`). A non-integer value falls back to `24` rather than failing at import, and the fallback is silent, so an interval you did not expect means the value was rejected. |
| `CRYOZEN_SCRIPT_HOST` | `localhost` | Target for the built-in `run_script` scheduled-task action (`services/builtin_actions.py`). An empty value, `local`, `localhost`, or `127.0.0.1` runs the script on the application host; anything else is treated as an SSH host alias and the script runs remotely. |

## Security toggles (SSRF)

CryoZen is local-first, so pointing an endpoint at loopback or a LAN address is a supported setup.
`services/url_safety.py` therefore always rejects non-HTTP(S) schemes, link-local addresses such as the cloud metadata range `169.254.0.0/16`, and multicast, reserved, or unspecified addresses, and it blocks private and loopback targets only when the caller opts in.
Every toggle below is off by default, which means private and loopback destinations are reachable out of the box.
Turn them on for internet-exposed or multi-tenant deployments, and expect local model servers, local CardDAV, and local image backends to stop working when you do.

| Variable | Default | What it does |
| --- | --- | --- |
| `EMBEDDING_BLOCK_PRIVATE_IPS` | `false` | Set to `true` to also reject private and loopback embedding endpoints submitted through `POST /api/embeddings/endpoint` (`routers/embedding_router.py`). |
| `IMAGE_BLOCK_PRIVATE_IPS` | `false` | Set to `true` to also reject private and loopback image-generation endpoints (`routers/gallery_router.py`, `routers/gallery_router.py`). |
| `CARDDAV_BLOCK_PRIVATE_IPS` | `false` | Set to `true` to also reject private and loopback CardDAV URLs (`routers/contacts_router.py`). |
| `REMINDER_WEBHOOK_BLOCK_PRIVATE_IPS` | `false` | Set to `true` to also reject private and loopback reminder webhook targets (`routers/note_router.py`). |
| `CRYOZEN_ALLOW_PRIVATE_CALDAV` | `0` | Inverse polarity compared to the toggles above. CalDAV sync blocks private and loopback targets by default; set this to `1`, `true`, or `yes` to allow them (`services/caldav_sync.py`). |

## Diagnostics and testing

| Variable | Default | What it does |
| --- | --- | --- |
| `CRYOZEN_TESTING` | Unset | Test-only. Set to `1` to force test mode, which skips the data-directory migration and, when `CRYOZEN_DATA_DIR` is unset, resolves the vault to a fresh temporary directory instead of the application directory's `data/` (`services/constants.py`). |
| `CRYOZEN_SKIP_DATA_DIR_MIGRATION` | Unset | Internal. `cli/cryozen-sanrakshana` sets it so that importing `services/constants.py` does not copy the application directory's `data/` into a missing vault, which the snapshot would then archive as a backup. You never set it yourself. |
| `PYTEST_CURRENT_TEST` | Set by pytest | Test-only. Its presence is one of the four signals that put `services/constants.py` into test mode; you never set it yourself. |
| `DEMO_IMAP_HOST` | `localhost` | Test-only. IMAP host for the demo mailbox seeder (`cli/demo_email/seed_demo_emails.py`). |
| `DEMO_IMAP_PORT` | `31143` | Test-only. IMAP port for the demo mailbox seeder (`cli/demo_email/seed_demo_emails.py`). |
| `DEMO_IMAP_USER` | `demo@cryozen.local` | Test-only. Demo mailbox username (`cli/demo_email/seed_demo_emails.py`). |
| `DEMO_IMAP_PASSWORD` | `demodemo` | Test-only. Demo mailbox password (`cli/demo_email/seed_demo_emails.py`). |
| `DEMO_ALLOW_WIPE` | Unset | Test-only, and destructive. The seeder refuses to wipe a mailbox it does not recognize as a demo target unless you set this to `1` (`cli/demo_email/seed_demo_emails.py`). |
| `NO_COLOR` | Unset | Test-only. Its presence disables ANSI color in the PR blocker audit CLI (`cli/pr_blocker_audit.py`). |
| `TERM` | Inherited from the terminal | Test-only. The value `dumb` disables color in the PR blocker audit CLI (`cli/pr_blocker_audit.py`). |
| `COLORTERM` | Inherited from the terminal | Test-only. Presence of either `TERM` or `COLORTERM` enables color output (`cli/pr_blocker_audit.py`). |

CryoZen also reads variables that the operating system supplies rather than ones you configure: `PATH`, `APPDATA`, `ComSpec`, `TMPDIR`, and `HOME`.
Treat them as platform detail, not configuration.

## Precedence and legacy aliases

Configuration resolves in this order, highest priority first:

- **Process environment**: values exported by your shell or container runtime. `load_dotenv` does not overwrite them.
- **`.env` file**: read once from the repository root at `cryozen.py` with `encoding="utf-8-sig"`, which tolerates the UTF-8 byte order mark that Windows Notepad adds.
- **Code default**: the fallback in the `os.getenv` call listed in each table above.

Several settings have a higher-priority source than the environment altogether.
Saved admin settings and database rows beat environment values for email accounts, CardDAV credentials, search provider keys, the search instance URL, and the embedding endpoint.
In those cases the environment variable is the fallback used only when nothing is stored, and for email only on an install without user accounts, as described under [Email (IMAP/SMTP)](#email-imapsmtp).

Legacy aliasing runs before any of this.
On import, `_alias_legacy_env()` in `services/constants.py` walks the process environment and mirrors every key prefixed with the project's previous name onto the matching `CRYOZEN_*` key using `os.environ.setdefault`.
Two consequences follow:

- **`CRYOZEN_*` wins**: an explicitly set `CRYOZEN_*` value is never overwritten by its legacy twin, because `setdefault` does not replace an existing key.
- **Only the prefix is translated**: a legacy `*_DATA_DIR` variable becomes `CRYOZEN_DATA_DIR`, but variables without the prefix, such as `DATABASE_URL` or `SESSION_SECRET`, have no legacy alias.

Prefer the `CRYOZEN_*` names in new configuration.
The legacy prefix exists so that compose files and shell profiles written before the rename keep working without edits.

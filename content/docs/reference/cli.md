---
title: "CryoZen CLI reference"
source: "docs/reference/cli.md"
ref: "v1.2.0"
commit: "f358e1dc7f53603abdf3f3d7ae2face02bd939ca"
---
# CryoZen CLI reference

CryoZen ships a shell interface for most of what the web UI does.
It is a git-style dispatcher: `cli/cryozen` finds its `cli/cryozen-<name>` siblings and hands off to them, so `cryozen notes list` runs `cli/cryozen-notes list` with every remaining flag forwarded untouched.
The subcommands do not speak to the running web app over HTTP.
They import the application's own Python modules and read or write the same SQLite database, JSON state files, and mail servers the app uses, which means you can run them whether or not the server process is up, and any change you make is visible to the app as soon as it re-reads that state.
Every subcommand writes JSON to stdout, errors to stderr, and exits non-zero on failure, so output composes with `jq` and friends.
`product` is the exception: it manages the product lifecycle records under `.cryozen/` rather than application data, writes its reports and check results as text rather than JSON, and reaches the network in `cryozen product verify`.

## Installing the CLI

On a public Docker Compose deployment (from [/download#docker](/download#docker)), the `cli/` tools are packaged at `/app/cli/` inside the `cryozen` container image, so run them inside the container from your Compose directory:

```bash
docker compose exec cryozen python cli/cryozen --version
docker compose exec cryozen python cli/cryozen help
```

Define a shell alias in your Compose directory so the subcommand examples below work directly:

```bash
alias cryozen='docker compose exec cryozen python cli/cryozen'
```

When the `cryozen` container is stopped (such as during a backup restore), use `docker compose run --rm --no-deps cryozen python cli/cryozen ...` instead.
Host-side installation from `$PWD/cli/cryozen` and shell completion scripts apply to source checkouts, which are not public.

## How commands find your data

There is no HTTP client, no base URL setting, and no API token in the CLI.
Nothing reads a `CRYOZEN_URL` or `CRYOZEN_API_TOKEN` variable.
Each subcommand inserts the repo root onto `sys.path` and imports the application package directly, which gives it three distinct paths to your data:

- **SQLite**: commands backed by database tables (`gallery`, `kaala`, `karma`, `mcp`, `notes`, `patra accounts`, `sessions`, `shastra`, `signature`, `webhook`) open a session through `core.smriti`.
  The database URL comes from `DATABASE_URL` when set, and otherwise defaults to `smriti.db` inside the data directory.
- **JSON state files**: commands backed by files on disk (`kaushala`, `personal`, `preset`, `shakti`, `shodh`, `smriti`, `theme`) read and write `data/` in the repo directly.
  Several of them write a `.bak` copy before overwriting, so a bad write is recoverable.
- **Remote protocols**: `patra` opens IMAP and SMTP connections itself using account credentials stored in the database and decrypted with `data/.app_key`.
  `samparka` talks CardDAV over HTTP using the URL, username, and password saved from the Settings panel.
  `shakti hf-latest` calls the public HuggingFace API.

Because the imports are real application imports, run these commands inside the container on a Docker Compose install (where `/app` is the working directory and `CRYOZEN_DATA_DIR=/app/data`), or from the repo root with the project virtual environment active on a source checkout, which is not public.
A missing dependency produces `error: No module named ...` and exit code 2 rather than a stack trace.

The environment variables the CLI reads are:

- **`LOG_LEVEL`**: log verbosity for the subcommands.
  Defaults to `WARNING`, which keeps application import-time logging out of your JSON.
  Set `LOG_LEVEL=DEBUG` when a command fails and you want the underlying detail.
- **`DATABASE_URL`**: overrides the SQLAlchemy connection string for every database-backed command.
- **`CRYOZEN_DATA_DIR`**: relocates the application data vault that `core.smriti` and the encryption key resolve against.
- **`DATA_DIR`**: read only by `cryozen shakti`, which uses it to locate `shakti_state.json`.
- **`HF_HOME`**: read by `cryozen shakti cached` to find the local HuggingFace hub cache.
- **`CRYOZEN_SELF_URL`, `CRYOZEN_PORT`, `APP_PORT`**: read by `cryozen webhook url` to build its default base URL.

Note that the file-backed commands anchor on the repo's own `data/` directory rather than on `CRYOZEN_DATA_DIR`.
If you have relocated your vault, those commands and the database-backed ones point at different places.

## Command reference

The dispatcher exposes twenty-one subcommands:

| Command | What it does |
| --- | --- |
| `gallery` | Browses the photo and image gallery: list, show, search, list albums, soft-delete. |
| `kaala` | Manages calendar events and lists configured calendars. |
| `karma` | Inspects scheduled tasks, pauses and resumes them, and lists run history. |
| `kaushala` | Lists, inspects, exports, and prunes the AI skills stored as `SKILL.md` files. |
| `logs` | Lists, tails, prints, and prunes application logs and per-tmux-session logs. |
| `mcp` | Manages MCP server configuration rows: list, show, enable, disable, add, delete. |
| `notes` | Lists, shows, searches, creates, and deletes notes. |
| `patra` | Reads and sends email over IMAP and SMTP, and runs the two cron-shaped mail pollers. |
| `personal` | Manages the personal-docs RAG index and the directories it tracks. |
| `preset` | Reads and writes the AI system-prompt presets in `data/presets.json`. |
| `product` | Manages the lifecycle records under `.cryozen/`, writes the reports, and verifies a published release; described under [Product control plane](#product-control-plane). |
| `samparka` | Lists, searches, and adds CardDAV contacts, and shows the CardDAV configuration. |
| `sanrakshana` | Snapshots, lists, verifies, and restores backups of the data directory. |
| `sessions` | Lists, shows, archives, unarchives, and deletes chat sessions. |
| `shakti` | Drives model downloads and local serving through tmux, and reports GPU and cache state. |
| `shastra` | Reads the living-document store, including version history and per-version export. |
| `shodh` | Lists, inspects, searches, and deletes deep-research runs. |
| `signature` | Lists, shows, exports, and deletes stored email signature images. |
| `smriti` | Reads and prunes the AI memory store. |
| `theme` | Lists theme presets and reads or writes each user's saved theme. |
| `webhook` | Lists, rotates, revokes, and builds URLs for scheduled-task webhook tokens. |

Two flags work on every subcommand but `product`, and can appear before or after the subcommand name:

- **`--pretty`**: pretty-prints the JSON output.
  Output is already indented when stdout is a terminal, so you need this mainly when piping to a file.
- **`--version`**: prints the tool name and version, then exits.

`product` takes neither: it forwards everything after the verb to the script that owns it, and `cryozen product help` prints its own usage.

### Email (`patra`)

Email is the largest surface.
Its own docstring lists five subcommands, but there are seven: `poll-scheduled` and `poll-summary` are undocumented there.
The message body for `send` comes from stdin.
The command runs as no user, so on an install with accounts `list`, `read`, `folders`, and `send` need `--account`; `accounts` prints the IDs.

```bash
cryozen patra accounts
cryozen patra folders --account your_account_id_here
cryozen patra list --account your_account_id_here --folder INBOX --limit 5 | jq -r '.[] | .uid + "\t" + .subject'
cryozen patra read your_message_uid_here --account your_account_id_here --folder INBOX --html
cryozen patra send --account your_account_id_here --to alice@example.com --subject "Status" --dry-run <<<"body text"
```

The two pollers each do one pass and exit, which suits a cron entry or a systemd timer:

```bash
cryozen patra poll-scheduled
cryozen patra poll-summary --days 3 --no-reply --tag
```

`poll-summary` runs the summarize and auto-reply steps by default; disable them with `--no-summary` and `--no-reply`, and add the optional steps with `--tag` and `--spam`.
`poll-scheduled` exits 1 when any queued message failed to send.

### Calendar (`kaala`)

`--start` and `--end` accept either `YYYY-MM-DD` or a full ISO 8601 timestamp.
`list` defaults to a thirty-day window starting today.
`create` picks the oldest calendar when you omit `--calendar`.

```bash
cryozen kaala calendars
cryozen kaala list --start 2026-05-01 --end 2026-05-31 --calendar Work
cryozen kaala create --title "Design review" --start 2026-05-04T14:00:00 \
  --importance high --event-type work
cryozen kaala delete your_event_uid_here
```

`--importance` takes `low`, `normal`, `high`, or `critical`.
`--event-type` takes `work`, `personal`, `health`, `travel`, `meal`, `social`, `admin`, or `other`.

### Chat sessions (`sessions`)

`--archived` is a three-state flag: omit it for unarchived sessions, pass it bare to include archived ones, and pass `--archived only` for archived sessions alone.
`delete` is a hard delete and refuses to run without `--yes`.

```bash
cryozen sessions list --folder Research --limit 20
cryozen sessions list --archived only
cryozen sessions archive your_session_id_here
cryozen sessions delete your_session_id_here --yes
```

### Logs (`logs`)

`tail` prints the last lines and exits by default.
Pass `-f` to follow, which replaces the process with `tail -f`.
The name argument matches on exact filename, filename without extension, or substring, and the most recently modified match wins.

```bash
cryozen logs list
cryozen logs tail compound --lines 200
cryozen logs tail your_session_id_here -f
cryozen logs clean --days 14
```

`clean` deletes per-tmux-session logs older than `--days` and never touches the application logs under `logs/`.

### Model serving (`shakti`)

Downloads and serve processes run inside detached tmux sessions, and the command returns the session name plus ready-made tail and kill commands.
`--host` runs `gpus`, `download`, and `kill` against a remote box over SSH.

```bash
cryozen shakti gpus --host your_user@your_host --ssh-port 2222
cryozen shakti cached
cryozen shakti hf-latest --vram-gb 24 --limit 5 --pipeline text-generation
cryozen shakti download Qwen/Qwen3-8B --include "*.safetensors" --revision main
cryozen shakti serve qwen3-8b --cmd 'python -m vllm.entrypoints.openai.api_server --model Qwen/Qwen3-8B --port 8000'
cryozen shakti kill your_session_name_here
```

On an NVIDIA host, `gpus` returns one object per device with `index`, `name`, `free_mb`, `total_mb`, `used_mb`, `util_pct`, `uuid`, and `busy`, where `busy` is true when less than half the device's memory is free.
On Apple Silicon, where `nvidia-smi` is absent, it reports the unified-memory Metal device with `"backend": "metal"` instead of failing.
It reports `ok: false` with `nvidia-smi not found` when the binary is missing on a non-Mac host, or with the driver's own error text when `nvidia-smi` runs and exits non-zero, so treat that text as the real fault to debug.

`kill` is idempotent and exits 0 even when the session is already gone.
`state` dumps `shakti_state.json`; `state-set` replaces it with a JSON object read from stdin, backing up the previous contents to `shakti_state.json.bak` first.

```bash
cryozen shakti state > /tmp/shakti_state_backup.json
cryozen shakti state-set < /tmp/shakti_state_backup.json
```

### Backups (`sanrakshana`)

`snapshot` writes a gzip tarball of the data directory the application resolves (`CRYOZEN_DATA_DIR`, the vault config file, or `~/.cryozen`), using SQLite's online backup API for databases so the running app cannot corrupt the archive and so writes still in the write-ahead log are included.
The command reads the checkout's `.env` as the application does, and variables set in the shell win; `snapshot`, `list`, `verify`, and `restore` all print the resolved `data_dir`, so a wrong resolution is visible.
It refuses to run when that directory or the configured database is missing, and it never creates, opens, or migrates either one, so a wrong resolution gets a refusal rather than an empty backup.
The database is the one `DATABASE_URL` names; it always enters the archive as `data/smriti.db`, and a stale `smriti.db` left in the data directory is skipped with a warning.
When `DATABASE_URL` is not SQLite the snapshot refuses; back the database up with its own tools and the data directory with `tar`.
A damaged SQLite file other than the database, such as an upload, does not stop the snapshot: it is archived as raw bytes with a warning and listed under `raw_copied`.
The same goes for one that another process keeps locked for 30 seconds, while a locked database fails the snapshot after that wait.
These subtrees of the data directory are excluded by default, by the daily backup too, because they are large or re-derivable: `deep_research` (`--include-shodh`) and `mail-attachments` (`--include-attachments`).
The model and speech caches `huggingface`, `local`, `fastembed_cache`, and `tts_cache` are always excluded, because they download or regenerate again; archive them with `tar` if you want a copy.
The result and the manifest list under `excluded` the ones that exist.
A snapshot stages its SQLite copies in the data directory and writes the archive to the output directory, so `--out` may point at a network mount, because only the finished archive is written there.
It refuses to start unless the data directory has room for the staged copies and the output directory has room for the uncompressed files, each with 64 MB to spare, which is a conservative bound; on one filesystem the two needs add up.

On the Compose path the command must run inside the container, because the host shell does not carry the container's `CRYOZEN_DATA_DIR`.
`run` goes through the image entrypoint, which applies `PUID` and `PGID` from `.env` as the service does; `exec` would run as root, and a `--user` built in the host shell can name the wrong owner because that shell does not read `.env`.
The entrypoint runs first-time setup only when it starts the server, so a one-off command like this one finds the database as it was.
`--no-deps` leaves out searxng and chromadb, because the tool needs neither and an unhealthy searxng would otherwise block it.
The archives land in `./data/backups/` on the host:

```bash
docker compose run --rm --no-deps cryozen python cli/cryozen-sanrakshana snapshot
docker compose run --rm --no-deps cryozen python cli/cryozen-sanrakshana list
docker compose run --rm --no-deps cryozen python cli/cryozen-sanrakshana verify /app/data/backups/your_backup_name_here.tar.gz
```

Archives land in `backups/` inside the data directory, or in `CRYOZEN_BACKUP_DIR` when set, and a snapshot never includes that directory or `backups/` inside the data directory, so a backup does not contain older backups, even after `CRYOZEN_BACKUP_DIR` has moved them.
Archives and in-progress `.part` files are readable by their owner only, because they hold the Fernet key.
Every archive carries a `manifest.json` at its root recording the source directory, the application version, the creation time, the file count, where the database came from, and the databases it holds; `verify` prints it.
`verify` extracts every member to a temporary directory and discards it, which needs free space equal to the uncompressed archive.
It checks the gzip CRC32 and length at the end of the stream, that the file count matches the manifest, that `data/smriti.db` is present and passes SQLite's `quick_check`, so a truncated or bit-flipped archive is reported rather than restored.
Another SQLite file that fails `quick_check` is only logged as a warning.
Inside the archive the data always sits under `data/`, whatever the directory is called on disk, so an archive from one install restores on another.
`list` shows the archives in the backup directory, newest first, and labels each one `daily` (written by the scheduler) or `manual`.

`restore` replaces the resolved data directory and refuses to run without `--yes`.
It refuses a data directory that does not exist, which usually means the environment resolved the wrong place; if the named path is the right one, create it with `mkdir` and run `restore` again.
Stop the application first.
It validates every archive entry, rejecting absolute paths, parent-directory escapes, Windows path syntax, link entries, and anything outside `data/`, and it runs the same content checks as `verify` while extracting into a staging directory inside the data directory.
Only when the whole archive has been extracted and checked does it move the current entries into `<name>.before-restore-<timestamp>` next to the data directory and move the restored ones in, so a damaged archive or a full disk leaves your data as it was.
If moving the entries fails part-way, the ones already moved go back, the staging directory is removed, and the error names the stash and staging paths and says whether the move back succeeded.
When the entries cannot move next to the directory, as on the Compose bind mount, they go to `backups/before-restore-<timestamp>` inside it instead; the backup directory and `backups/` inside the data directory stay in place either way.
The output lists under `not_in_archive` any subtree the snapshot excluded, such as `deep_research`, whose previous copy is then only in the stash.
When `DATABASE_URL` names a file inside the data directory, or is unset, the archived database lands at that path, whatever the file is called, and `database_restored_to` confirms it.
When it names a file outside the data directory, that file is left alone, `configured_database_not_replaced` names it, and `database_restored_to` names where the archived database went, so move it there yourself with the application stopped.
An archive that holds `data/backups/` was made before snapshots always skipped that directory, and both `verify` and `restore` refuse it; unpack it by hand or take a fresh snapshot.

On the Compose path, stop the application and run it in a one-off container:

```bash
docker compose stop cryozen
docker compose run --rm --no-deps cryozen python cli/cryozen-sanrakshana restore /app/data/backups/your_backup_name_here.tar.gz --yes
docker compose start cryozen
```

### MCP servers (`mcp`)

This command manages the stored server configuration.
Live connection state belongs to the running app's manager process, so query that through the web UI or the `/api/mcp/servers` endpoint.
Environment values are redacted unless you ask for them.

```bash
cryozen mcp list
cryozen mcp show your_server_id_here --reveal
cryozen mcp add --name "Filesystem" --transport stdio --command npx \
  --args '["@modelcontextprotocol/server-filesystem","/tmp"]'
cryozen mcp add --name "Remote" --transport sse --url https://mcp.example.com/sse --disabled
cryozen mcp disable your_server_id_here
```

`--command` is required for `stdio` transport and `--url` is required for `sse`.
`--args` takes a JSON array and `--env` takes a JSON object.

### Task webhooks (`webhook`)

Tokens are masked in output unless you pass `--reveal`.
`url` builds the POST endpoint for a task without contacting the app, defaulting to this install's loopback address when you omit `--base`: `CRYOZEN_SELF_URL` if set, otherwise `http://127.0.0.1` on the port from `CRYOZEN_PORT`, then `APP_PORT`, then 7000.

```bash
cryozen webhook list
cryozen webhook rotate your_task_id_here
cryozen webhook url your_task_id_here --base https://app.example.com
cryozen webhook revoke your_task_id_here
```

### Themes (`theme`)

Preset definitions come from the frontend theme module; per-user selections live in `data/user_prefs.json`.
`set` clears any custom color overrides unless you pass `--keep-colors`.

```bash
cryozen theme list
cryozen theme users
cryozen theme get --user alice@example.com
cryozen theme set --user alice@example.com --preset midnight --keep-colors
cryozen theme export --user alice@example.com --pretty > theme.json
```

Preset discovery reads the `THEMES` export from `frontend/js/theme.js`, through `node` when it is on `PATH` and through a regex scrape otherwise, so `list` returns the built-in preset names and `set` rejects a name that is not among them.
Validation is skipped only when discovery yields nothing, which happens when the module is missing, so a preset name is checked on any normal checkout.

### Research runs (`shodh`)

`--status complete` is translated to the `done` value the research writer stores, so the friendly word works against the on-disk records.
The other choices (`running`, `cancelled`, `error`) are matched verbatim.

```bash
cryozen shodh list --status complete --limit 10
cryozen shodh search "supply chain"
cryozen shodh report your_run_id_here --raw > report.md
cryozen shodh delete your_run_id_here
```

`delete` removes the run's JSON file from disk with no confirmation prompt.

### Documents (`shastra`)

`export` returns the current content by default and a specific revision with `--version`.
`--raw` writes the document body to stdout instead of wrapping it in JSON.

```bash
cryozen shastra list --active --session your_session_id_here
cryozen shastra versions your_document_id_here
cryozen shastra export your_document_id_here --version 3 --raw > draft.md
cryozen shastra search "invoice"
```

`delete` is a soft delete: it sets `is_active` to false rather than removing the row.

### Skills (`kaushala`)

```bash
cryozen kaushala categories
cryozen kaushala list --category general --limit 20
cryozen kaushala export your_skill_name_here --raw
cryozen kaushala delete your_skill_name_here
```

`delete` removes the skill's directory tree from disk with no confirmation prompt.

### Memory (`smriti`)

Run it as `cryozen smriti` or `cli/cryozen-smriti`.
It reads and prunes the durable facts the assistant accumulates about you, stored in the memory file in your data directory.

```bash
cryozen smriti categories
cryozen smriti list --category preference --source cli --limit 20
cryozen smriti search "tokyo"
cryozen smriti add "User lives in Tokyo" --category fact
cryozen smriti delete your_memory_id_here
```

Entries added here are persisted immediately rather than waiting for the chat pipeline's deduplication pass.

### Prompt presets (`preset`)

`set` creates the preset when it does not exist and updates the named fields when it does.
Pass at least one of `--prompt`, `--prompt-file`, or `--temperature`.

```bash
cryozen preset list
cryozen preset set concise --temperature 0.3 --prompt "Answer in two sentences."
cryozen preset set researcher --prompt-file ./prompts/researcher.md --display-name "Researcher"
cryozen preset delete concise
```

### Gallery (`gallery`)

The gallery is read-only apart from `delete`, because uploads and edits need multipart payloads that do not suit a shell.
`search` matches the prompt, the manual tags, and the AI-generated tags.

```bash
cryozen gallery albums | jq -r '.[].name'
cryozen gallery list --favorites --album Trips --tag sunset --limit 20
cryozen gallery search "sunset"
cryozen gallery delete your_image_id_here
```

`delete` is a soft delete: it sets `is_active` to false.

### Email signatures (`signature`)

`export` decodes the stored data URL and writes real PNG bytes, verifying the magic number before it writes.

```bash
cryozen signature list
cryozen signature export your_signature_id_here --png ./signature.png
cryozen signature delete your_signature_id_here
```

`delete` removes the row permanently with no confirmation prompt.

### Personal document index (`personal`)

```bash
cryozen personal dirs
cryozen personal add-dir /home/you/runbooks
cryozen personal reload
cryozen personal exclude /home/you/runbooks/private.md
cryozen personal remove-dir /home/you/runbooks
```

### Contacts (`samparka`)

The configuration subcommand is spelled `vyavastha`.
It prints the CardDAV URL and username with the password masked.

```bash
cryozen samparka vyavastha
cryozen samparka list --refresh | jq -r '.[] | .name + "\t" + .email'
cryozen samparka search alice
cryozen samparka add --name "Alice Doe" --email alice@example.com
```

Every subcommand here fails with a clear message when CardDAV has not been configured in the Settings panel.

## Operations scripts

These are one-shot scripts rather than dispatcher subcommands, and they are not reachable through `cryozen <name>`.
On a Docker Compose install, run database and data-maintenance scripts inside the container with `docker compose exec cryozen python cli/<script>.py ...`; build, packaging, and development scripts (`cli/pipeline.sh`, `cli/validate_mac_app.sh`, `cli/fix_paths.py`, `cli/pr_blocker_audit.py`, `cli/encode_previews.sh`, and `cli/demo_email/*`) require a source checkout, which is not public.

| Script | Purpose | Invocation |
| --- | --- | --- |
| `cli/seed_admin.py` | DEV-ONLY. Provisions one verified admin with no SMTP and no TOTP requirement. | `python cli/seed_admin.py --email admin@local.test --password your_password_here` |
| `cli/reset_admin.py` | DEV-ONLY and destructive. Overwrites a user's password hash in `data/niti.json` from an interactive prompt. | `python cli/reset_admin.py` |
| `cli/claim_ownerless.py` | Assigns every ownerless record to one user after multi-user auth is enabled. | `python cli/claim_ownerless.py your_username_here` |
| `cli/add_hwfit_models.py` | Bulk-adds HuggingFace models to the shakti catalog. Merges by name and writes a `.bak` first. | `python3 cli/add_hwfit_models.py` |
| `cli/hf_download.py` | Downloads a HuggingFace repo with pipe-friendly progress lines. | `python3 cli/hf_download.py your_org/your_model --include "*Q4_K_M*"` |
| `cli/index_documents.py` | Indexes `data/personal_docs` into the vector store and prints statistics. | `python cli/index_documents.py` |
| `cli/update_database.py` | One-time migration adding `last_accessed`, `is_important`, and `message_count` to the sessions table. | `python cli/update_database.py` |
| `cli/migrate_faiss_to_chroma.py` | One-time migration of memory and RAG vectors from FAISS to ChromaDB. | `python cli/migrate_faiss_to_chroma.py` |
| `cli/diffusion_server.py` | Runs an OpenAI-compatible image-generation server backed by diffusers. | `python3 cli/diffusion_server.py --model /path/to/model --port 8100` |
| `cli/pr_blocker_audit.py` | Read-only audit of open pull request file overlap and blocker risk. | `python3 cli/pr_blocker_audit.py --repo your_owner/your_repo --format terminal` |
| `cli/fix_paths.py` | Destructive to source. Rewrites the `BASE_DIR` line inside `cryozen.py` in place. | `python cli/fix_paths.py` |
| `cli/pipeline.sh` | Installs dependencies, formats, lints, tests, builds the macOS bundle via `packaging/build-macos.sh`, and validates it. | `./cli/pipeline.sh --skip-install --strict-lint` |
| `cli/validate_mac_app.sh` | Thin wrapper that runs `packaging/smoke_test.py` against a built `dist/CryoZen.app`. | `./cli/validate_mac_app.sh` |
| `cli/check-docker-gpu.sh` | NVIDIA Docker passthrough diagnostic. Read-only unless you pass an install or overlay flag. | `cli/check-docker-gpu.sh` |
| `cli/check-docker-amd-gpu.sh` | Read-only AMD and ROCm Docker passthrough diagnostic. Installs nothing. | `cli/check-docker-amd-gpu.sh` |
| `cli/encode_previews.sh` | Encodes a screen recording into WebM and MP4 previews for the landing page. | `./cli/encode_previews.sh your_recording.mkv your_output_name 30` |
| `cli/demo_email/manage.sh` | DEV-ONLY and destructive. Creates, reseeds, or removes the throwaway local email demo. | `./cli/demo_email/manage.sh setup` |
| `cli/demo_email/demo_account.py` | DEV-ONLY. Adds or removes the non-default "Demo" email account row. | `python cli/demo_email/demo_account.py setup` |
| `cli/demo_email/seed_demo_emails.py` | DEV-ONLY and destructive. Seeds fake mail into the demo mailbox; `--reset` empties it first. | `python cli/demo_email/seed_demo_emails.py --reset` |

Read the following before running anything in that table:

- **`seed_admin.py` creates a real credential**: nothing in the boot path calls it and there is no environment backdoor, so the account exists only because you ran the command.
  Rotate or remove it before any deployment.
  Re-running for an existing user is refused unless you pass `--force`, which resets that account's password and re-marks it verified.
- **`reset_admin.py` has no dry run**: it prompts for the username and new password, then overwrites that user's record in `data/niti.json` unconditionally.
  It defaults to the username `cryozen` when you press enter at the prompt.
- **`fix_paths.py` edits tracked source**: it rewrites `cryozen.py` in place with no backup, and it opens the file by relative path, so it must be run from the repo root.
- **The demo email scripts destroy mailbox contents**: `seed_demo_emails.py --reset` and `--wipe-only` expunge every message in every mailbox of the target account.
  The script refuses to wipe a target that is not obviously the local demo account unless you set `DEMO_ALLOW_WIPE=1`.
  Connection details come from `DEMO_IMAP_HOST`, `DEMO_IMAP_PORT`, `DEMO_IMAP_USER`, and `DEMO_IMAP_PASSWORD`, and `manage.sh` reads `CRYOZEN_DEMO_MAIL_DIR` to locate the Dovecot user file.
- **`update_database.py` adds three columns to the sessions table**: it adds `last_accessed`, `is_important`, and `message_count` to `sessions` if they are absent, backfilling `last_accessed` from `created_at`, `is_important` to false, and `message_count` from the row count in `chat_messages`.
  Each column is added with `ALTER TABLE ADD COLUMN`, so the table is altered in place and keeps its primary key, NOT NULL constraints, and indexes.
  Adding a column is skipped when it already exists, so the script is safe to re-run, and the backfill runs on every invocation.
  It has no dry run, and the backfill resets `message_count` for every row before recounting, so take a snapshot first.
- **`claim_ownerless.py` assigns unowned rows to one user**: run it once after enabling multi-user niti to hand existing data to the administrator, naming that user as its only argument.
  It claims rows whose `owner` column is SQL null across sessions, documents, gallery images, and comparisons, skipping the last two when those models are absent, plus entries with a falsy `owner` key in `data/smarana.json` and `data/skills.json`.
  The database updates commit as one transaction that rolls back on error, but the JSON files are rewritten separately and are not covered by it, and there is no dry run.

### Product control plane

Internal lifecycle and release-verification scripts under `scripts/` (`scripts/cryozen_ops.py` and `scripts/cryozen_release_verify.py`) apply only to source builds, which are not public; for public container deployments, pull the published image from [/download#docker](/download#docker).

## Getting help

Three levels of help are available:

- **`cryozen`**: prints the version banner and the table of every discovered subcommand with a one-line description.
  `cryozen help`, `cryozen -h`, and `cryozen --help` print the same listing.
- **`cryozen help your_command_here`**: runs that subcommand's own `--help`.
  An unknown name exits 1 with an error on stderr.
- **`cryozen your_command_here --help`**: the same output, reached directly.
  Add a subcommand name for its arguments, as in `cryozen patra send --help`.

```bash
cryozen
cryozen help sanrakshana
cryozen kaala create --help
```

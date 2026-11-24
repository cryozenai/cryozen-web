---
title: "Upgrading"
source: "docs/operations/upgrading.md"
ref: "v1.2.0"
commit: "f358e1dc7f53603abdf3f3d7ae2face02bd939ca"
---
# Upgrading

This page covers moving a running CryoZen instance to a newer version: what to back up first, the steps for each deployment path, what an installation from the project's previous name carries over on its own, and when rolling back is safe.
It is written for whoever operates the box.
There is no manual migration step in a normal upgrade, because the application applies its own additive schema changes at startup, so most of this page is about the two cases where that is not the whole story.

## Back up the data directory before you upgrade

Everything an upgrade could damage lives in one directory.
Back it up first, every time, and confirm the backup exists before you pull new code.

Find the directory before you copy it, because it differs by deployment path:

- **Docker Compose**: `./data` in the repository, bind-mounted to `/app/data`. The image pins `CRYOZEN_DATA_DIR=/app/data`, so this is always the answer on the Compose path.
- **Native launcher and systemd**: `~/.cryozen`, or the legacy pre-rename data directory under `~` when that directory exists and `~/.cryozen` does not.
- **Any path with `CRYOZEN_DATA_DIR` set**: whatever that variable names, which wins over both defaults.

The directory holds the SQLite database `smriti.db`, the account file `niti.json`, the signed-in session store `sessions.json`, the Fernet key `.app_key`, the ChromaDB directory, uploads, personal documents, generated images, mail attachments, deep research runs, and the pinned SSH host keys.
Losing `.app_key` is unrecoverable: every stored credential is encrypted with it, and no other copy exists.

The database runs in write-ahead log (WAL) mode, so while the application is up the directory also holds `smriti.db-wal` and `smriti.db-shm`.
Committed writes sit in `smriti.db-wal` until SQLite folds them into `smriti.db`, so a copy of `smriti.db` alone, taken while the application runs, misses the most recent writes.
The snapshot command copies the database through SQLite's online backup API, which reads the WAL too, and that is why it is the tool to use on a running instance.

Prefer `cli/cryozen-sanrakshana snapshot`.
It archives the resolved data directory, and it dumps every SQLite database through the backup API into a temporary file before adding it to the archive, so a running application cannot write a torn page into your backup.
It writes to `backups/cryozen-sanrakshana-<timestamp>.tar.gz` inside the data directory unless you pass `--out` or set `CRYOZEN_BACKUP_DIR`, and it excludes large or re-derivable subtrees by default, as listed in the [CLI reference](/docs/reference/cli#backups-sanrakshana).
Every archive carries a `manifest.json` naming the directory it came from, so you can check an archive before you need it.

```bash
cli/cryozen-sanrakshana snapshot
cli/cryozen-sanrakshana verify ~/.cryozen/backups/your-snapshot.tar.gz
```

On the Compose path the command must run inside the container, because the host shell does not carry the container's `CRYOZEN_DATA_DIR`, so from the host it resolves `~/.cryozen` rather than `./data`.
`run` goes through the image entrypoint, which applies `PUID` and `PGID` from `.env` as the service does; `exec` would run as root, and a `--user` built in the host shell can name the wrong owner because that shell does not read `.env`.
The entrypoint runs first-time setup only when it starts the server, so a one-off command like this one finds the database as it was.
`--no-deps` leaves out searxng and chromadb, because the tool needs neither and an unhealthy searxng would otherwise block it.
The archive lands in `./data/backups/` on the host:

```bash
docker compose run --rm --no-deps cryozen python cli/cryozen-sanrakshana snapshot
docker compose run --rm --no-deps cryozen python cli/cryozen-sanrakshana verify /app/data/backups/your-snapshot.tar.gz
```

`verify` extracts every member to a temporary directory and discards it, which needs free space equal to the uncompressed archive, and it rejects entries that could escape the data directory on restore, which is the same check `restore` applies.

The application also takes two backups on its own:

- **Before a schema change**: when a build expects a newer schema than the database records, startup copies `smriti.db` to `backups/pre-migration/` before running any migration and keeps the three newest copies of earlier version pairs, plus the first and the newest copy of the pair being migrated. Every version change takes a new copy, including a retry after a failed migration or a second attempt after a rollback. If that copy fails, or the database stays locked for 60 seconds, the application refuses to start and the log names the cause, so a migration never runs unprotected. The first start of a build that records schema versions copies every existing database once.
- **Daily**: the in-process scheduler writes `backups/cryozen-daily-<timestamp>.tar.gz` with the snapshot command's logic once the newest daily archive is a day old, and keeps `CRYOZEN_BACKUP_KEEP` of them (7 by default; 0 disables it). `GET /api/ready` reports the age of the newest archive under `checks.backup`.

Neither replaces the snapshot you take by hand before an upgrade, because the daily archive can be up to a day old.

For a stopped instance, or for a native install where the resolved directory sits outside the repository, copy the directory with a tool that preserves dotfiles:

```bash
docker compose stop cryozen
tar -czf ~/cryozen-backup-$(date +%Y%m%d).tar.gz --exclude=data/backups -C . data
docker compose start cryozen
```

```bash
sudo systemctl stop cryozen-ui
tar -czf ~/cryozen-backup-$(date +%Y%m%d).tar.gz -C ~ .cryozen
sudo systemctl start cryozen-ui
```

Know which of these two archives `restore` will take, because they are not interchangeable.
`verify` and `restore` require every entry to sit under a top-level `data/` directory, so they accept a snapshot and the Compose archive above, whose members are rooted at `data/`.
They also refuse an archive that holds `data/backups/`, which is why the Compose command excludes it.
They refuse the native archive, whose members are rooted at `.cryozen/`, with `refusing tarball with entry outside data/`.
That archive is still a complete copy of your data; it is a raw copy for manual recovery, so restore it by stopping the service and unpacking it over the resolved directory yourself.
Delete `smriti.db-wal` and `smriti.db-shm` first, because they belong to the database you are replacing:

```bash
sudo systemctl stop cryozen-ui
rm -f ~/.cryozen/smriti.db-wal ~/.cryozen/smriti.db-shm
tar -xzf ~/cryozen-backup-20260731.tar.gz -C ~
sudo systemctl start cryozen-ui
```

When you do use `restore`, stop the application first, because a running process keeps writing to the directory that is about to move aside.
On the Compose path, run it in a one-off container:

```bash
docker compose stop cryozen
docker compose run --rm --no-deps cryozen python cli/cryozen-sanrakshana restore /app/data/backups/your-snapshot.tar.gz --yes
docker compose start cryozen
```

`restore` extracts and checks the whole archive in a staging directory first, then moves the previous contents next to the data directory as `<name>.before-restore-<timestamp>`, so nothing is deleted and a damaged archive changes nothing; when the contents cannot move next to it, as on the Compose bind mount, they go to `backups/before-restore-<timestamp>` inside it instead.

The `/api/export` endpoint is a different kind of backup, and it does not replace the file copy.
It returns one JSON document containing memories, presets, skills, settings, feature flags, and preferences for the calling user, and it requires an administrator session.
Use it to move that data between instances, and use `/api/import` to merge it back in.

```bash
curl -fsS -b "cryozen_session=your_session_token_here" \
  http://127.0.0.1:7000/api/export -o cryozen-export.json
```

It does not include chat history, mail, documents, uploaded files, vectors, or the encryption key, so it is not a substitute for the tarball.

## Moving off the old Docker image

Docker installs up to v1.1.0 pulled from the pre-organization container registry path.
Releases after v1.1.0 are published to `ghcr.io/cryozenai/cryozen`, and the old path stops receiving updates, with no error when you pull.
The public compose file moves to the new path with the first stable release after v1.1.0; a pre-release leaves it alone.
If `docker-compose.yml` in your install names the old path, get the new compose file from the [public release channel](https://github.com/cryozenai/cryozen-releases), or change the `image:` line by hand, and then pull:

```bash
docker compose pull
docker compose up -d
```

Your data stays in `./data`, because the data directory is a bind mount and not part of the image.

## Upgrade a Docker Compose deployment

Pull the new code, rebuild the image, and recreate the containers.
The bind-mounted `./data` and `./logs` directories are untouched by a rebuild.

```bash
cd cryozen
git pull --ff-only
docker compose up -d --build
docker image prune -f
```

On Windows, `update_windows.bat` runs the same sequence and checks that `git`, `docker`, and Compose v2 are present before it starts.

Watch the first boot, because the application applies schema changes during startup:

```bash
docker compose logs -f cryozen
```

Confirm the instance is serving before you walk away:

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:7000/api/ready
```

A 503 means a critical check failed, and the response body names which one.

## Upgrade a native launcher deployment

Pull the new code and re-run the launcher.
Each launcher hashes `requirements.txt` and reinstalls dependencies only when that hash changes, so an upgrade that does not touch dependencies starts as fast as a restart.

```bash
cd cryozen
git pull --ff-only
./start.sh
```

If the launcher reports that the port is in use, the previous process is still running.
Stop it first: the launcher refuses to start rather than binding a second listener to the same database.

## Upgrade a systemd deployment

Stop the service, pull, reinstall dependencies, then start it again.
The unit file runs `venv/bin/uvicorn` directly, so nothing updates the virtual environment on your behalf.

```bash
sudo systemctl stop cryozen-ui
cd ~/cryozen-ui
git pull --ff-only
./venv/bin/pip install -r requirements.txt
sudo systemctl start cryozen-ui
journalctl -u cryozen-ui -f
```

If the upgrade changed `cryozen-ui.service`, copy the new unit into place and reload systemd before starting:

```bash
sudo cp cryozen-ui.service /etc/systemd/system/
sudo systemctl daemon-reload
```

Remember that the shipped unit contains `YOURUSER` placeholders, so re-apply your own `User`, `WorkingDirectory`, `ExecStart`, and `EnvironmentFile` values whenever you replace it.

## Upgrading from the project's previous name

The application and the repository were renamed to CryoZen from the project's previous name.
The rename ships with compatibility seams so an existing install keeps working after the upgrade with no configuration changes at all.
Upgrade the way your deployment path describes above, and expect the following to carry over on their own.

Six things carry over automatically:

- **Legacy environment variables**: at startup the application mirrors every variable using the previous-name prefix onto the matching `CRYOZEN_*` name. The mirror uses a default-only write, so a `CRYOZEN_*` value you set explicitly always wins over its legacy twin. Variables that were never prefixed, such as `APP_PORT` and `AUTH_ENABLED`, did not change name and need no handling.
- **The legacy data directory**: when `CRYOZEN_DATA_DIR` is unset, no vault config file is present, `~/.cryozen` does not exist, and the pre-rename directory under `~` does, the application keeps reading it instead of starting empty. A pre-rename vault config file is also still read after `~/.cryozen_vault_config.json`.
- **Signed-in sessions**: the session cookie is now `cryozen_session`, and the application falls back to the pre-rename session cookie when the new one is absent. Nobody is signed out by the upgrade, and signing out clears both cookie names. The new cookie wins whenever both are present.
- **Browser storage keys**: on first load after the upgrade, an inline script copies every `localStorage` and `sessionStorage` key from the previous-name prefix to the matching `cryozen-` key where the new key is not already set. The legacy keys are left in place.
- **Vector collections**: on every boot, the application renames ChromaDB collections from the previous-name prefix to their `cryozen_` equivalents in place with no re-embedding. A `cryozen_` collection that already exists and holds documents is never overwritten, and the legacy collection is left alone; an empty one is deleted so the legacy data can be adopted on the next attempt.
- **Mail headers and the scheduled-mail column**: outgoing mail is stamped `X-CryoZen-Origin` and `X-CryoZen-Kind`, while the self-mail filter and IMAP reminder search still match the legacy headers and subject prefix from before the rename. The scheduled-mail table gains a `cryozen_kind` column backfilled from the legacy column, which stays in place so a downgrade still finds its values.

The seventh is the entrypoint.
The module is now `cryozen`, and a compatibility shim module remains that re-exports the application object, so a service unit or script still running the pre-rename `uvicorn` target keeps working unchanged.

Nothing in that list expires on a schedule, so none of the following is urgent.
Do them when it suits you, and each is independent of the others:

- **Rename your environment variables**: switch variables from the previous-name prefix to `CRYOZEN_*` in `.env`, shell profiles, and unit files. The aliasing runs once at import, so a variable exported after startup is not picked up.
- **Point service units at `cryozen:app`**: edit `ExecStart` in your systemd unit and any launcher script you wrote yourself, then run `sudo systemctl daemon-reload` and restart. This removes the dependency on the shim.
- **Update command-line aliases**: the repository now ships only `cli/cryozen` and its `cli/cryozen-*` subcommands. A symlink or shell alias pointing at a pre-rename script name refers to a file that no longer exists, so repoint it, for example with `ln -sf "$PWD/cli/cryozen" ~/.local/bin/cryozen`.
- **Move the data directory**: nothing moves the pre-rename data directory to `~/.cryozen` for you, and the application is content to keep using the old path indefinitely. If you want the new name, stop the application, move the old directory to `~/.cryozen`, and start it again.

## Route names moved to English

The HTTP route prefixes, the page URLs, two agent-integration sub-paths, and the vault settings sub-path were renamed from Sanskrit to English.
Some requested paths were left alone, and `docs/concepts/naming-map.md` lists them under "What did not change".
`/api/niti` is now `/api/auth`, `/api/smarana` is now `/api/memory`, `/api/shodh` is now `/api/research`, and so on.
The naming map lists every pair.

On a default install you do not have to do anything for most of it.
Every old API path still resolves there: a middleware rewrites it to the new one before routing, and logs one warning per prefix naming the replacement.
The two old page URLs, `/shakti` and `/smarana`, answer a `301` to `/compute` and `/memory` instead, so a bookmark updates itself the first time you open it.
Watch your log after the upgrade to find callers you have not updated, such as a reverse-proxy rule, a monitoring check, or a script holding an API token.
The aliases stop working in version `2.0.0`.

The one install shape the alias does not cover is a non-empty ASGI `root_path`, which you have if you run `uvicorn --root-path /some_prefix` or sit behind a proxy that forwards the prefix rather than stripping it.
The incoming path there still carries the mount prefix, so it matches no alias and returns 404 while the canonical path keeps working.
If that is your setup, repoint every caller, bookmark, and proxy rule at the canonical paths as part of this upgrade instead of relying on the alias window.

One case needs your attention, and only if you configured social sign-in.
The application builds its OAuth redirect URI from the canonical route, so it now sends `{your_base_url}/api/auth/oauth/callback/{provider}` to the identity provider.
The provider compares that string against the list registered in its own console and rejects anything not on it, so a stale registration fails the login with a provider-side error.

Add the new callback URL in each provider's console:

```text
https://your_domain_here/api/auth/oauth/callback/google
https://your_domain_here/api/auth/oauth/callback/microsoft
https://your_domain_here/api/auth/oauth/callback/github
https://your_domain_here/api/auth/oauth/callback/facebook
```

Every supported provider accepts more than one redirect URI, so add the new one before you upgrade and remove the old one once sign-in works.
The application logs a warning at startup whenever an OAuth client is registered, so this does not have to be discovered from a failed login.
Linked-account data access uses `/api/integrations/accounts/callback/{provider}` and is unchanged.

If you installed the Claude Code or Codex skill bundle, reinstall it to pick up the new paths.
The old ones keep working until the aliases are removed.

## Mail, writing style, and reminders are scoped to one user

Several mail paths used to read install-wide state for whichever user asked.
A signed-in user with no mail account was served the mailbox from the flat `imap_*` and `smtp_*` keys in `settings.json` or from the `IMAP_*` and `SMTP_*` environment variables, the scheduled mail tasks scanned every user's accounts, the email writing style was one global value, and reminder webhooks and check-in feeds posted any user's data through the administrator's integrations.
This release closes all of them, and the application applies the data moves itself at startup.
The changes an operator sees are listed below.

**The legacy mailbox becomes an account owned by the administrator.**
At the first startup after the upgrade, when no account row exists yet, the flat `settings.json` keys or the `IMAP_*` and `SMTP_*` variables are copied once into an account named `Default`, owned by the first administrator in `niti.json`.
The seed records `email_account_seeded_at` in `settings.json` and never runs again, so deleting that account later does not bring it back.
Other users see "no mail account configured" until they add their own account under Settings, and the environment variables stop acting as a fallback for anyone on an install with accounts.
An install that runs without accounts (`AUTH_ENABLED=false`, or no user created yet) keeps reading them as before.
Any account row that still has no owner, or an empty one, is assigned at startup and then hourly: first to the user whose login is the row's IMAP user or from address, and otherwise to the administrator, together with the other ownerless rows the boot sweep already handles.

**The email writing style moves to the administrator's preferences.**
The global `email_writing_style` key in `settings.json` is copied into the administrator's entry in `user_prefs.json` and removed from `settings.json`.
Every other user starts with an empty style and sets their own from the mail settings page.
The agent prompt and the reply drafter only ever read the style of the user they are working for.
A `user_prefs.json` still in the flat single-user layout belongs to the administrator, so nobody else reads its style while it waits for the sweep.

**Webhook and ntfy reminders, check-in feeds, and MCP task delivery need an administrator.**
Integrations and MCP servers are configured for the whole install and have no owner, so a note reminder on the webhook or ntfy channel, the feed and mailbox pulls inside a scheduled check-in, and a task whose output target is an `mcp__` tool now run only for an administrator or on a single-user install.
A non-administrator's reminder keeps its in-app notification and reports `webhook_error` or `ntfy_error`; their check-in still covers their own calendar and notes.
A non-administrator's task with an `mcp__` output target keeps its result, but the run is marked as an error that names the skipped delivery.
The `reminder_email_to` setting now applies only to an administrator's reminders or on a single-user install, so everyone else's email reminder goes to the from address of their own mail account.
An install that routed every user's reminders to one shared inbox loses that routing.

**A task with no owner does not run against user data on an install with accounts.**
LLM and research tasks, the daily brief, event classification, and the summarize, draft-reply, calendar-extraction, urgency, and signature mail actions record a skipped run for such a task, and the notes tool returns an error.
The boot and hourly sweep assigns ownerless tasks to the administrator, so this applies only between creating the first accounts and the next sweep.
More generally, an empty owner on an install with accounts now resolves to no mailbox and no writing style.
An ownerless task's email output and an ownerless note's email reminder report an error, and an email queued with no owner and no account before accounts existed is marked failed when it comes due.
The email routes do not apply `LOCALHOST_BYPASS`, so on such an install they answer 401 to a request that reaches the app through it.
The `cryozen-patra` command runs as no user, so on such an install `list`, `read`, `folders`, and `send` now fail without `--account`, and scripts that call them must pass it; `cryozen-patra accounts` prints the IDs.

**A private model endpoint no longer serves other users on most paths.**
Lookups that used to run with no owner, including scheduled tasks, their fallback chains and API keys, calendar one-line add, task parsing, document tidy, manual and automatic session compaction, Deep Research runs (the chat path, the panel start route, and spinoff), the memory audit, the teacher model, vision analysis, character prompt expansion, and the gallery, now see only the caller's endpoints and shared ones.
An endpoint added with `shared=false` has an owner, so naming it in a global setting such as `default_endpoint_id` or `utility_endpoint_id` no longer makes it usable by other users on those paths.
Session compaction and Deep Research then fall back to a model the user can see, such as the session's own model or their first enabled endpoint, and the other features, or those two when there is none, report that no model is configured.
To keep one endpoint for everybody, add it with `shared=true`, which is the default; otherwise each user adds their own.

**One administrator rule now covers agent tools and workspace browsing.**
The check behind admin-only agent tools and `/api/workspace` is now the same one the items above use, which changes two cases.
With an unreadable `niti.json`, every caller is treated as a non-administrator, where before every caller passed.
With `AUTH_ENABLED=false`, every caller passes, where before a caller who was not an administrator was refused when `niti.json` listed users.

One route also changed its contract.
`POST /api/email/accounts/test` with an `account_id` sends the stored password only to the stored host, port, and user.
To test an edited host, port, user, or transport security setting for a saved account, type that protocol's password into the form as well; without it, that protocol reports an error asking for the password and nothing is sent for it.

## Browser writes from other origins are refused

From v1.2.0, a write under `/api` (any method but `GET`, `HEAD`, and `OPTIONS`) sent by a browser page on another origin gets 403 with `{"error": "Cross-origin request refused"}`.
That includes a page on another port of the same host, which the session cookie alone used to let through.
The application's own pages are unaffected, and so are callers that send `Authorization: Bearer`, the internal tool token, or a task webhook trigger.

Two setups need a change:

- **A separate web page that calls the API with a signed-in session**: add its exact origin to `ALLOWED_ORIGINS`, as described in [the configuration reference](/docs/reference/configuration).
- **A reverse proxy that rewrites `Host`, used with a browser too old to send `Sec-Fetch-Site`**: have the proxy pass `X-Forwarded-Host`, or list the public origin in `ALLOWED_ORIGINS`. [The deployment guide](/docs/operations/deployment) shows where.

`POST /api/tokens` and `POST /api/webhooks` now take a JSON body only, and a form-encoded body or one with no `Content-Type` gets 415.
Send `Content-Type: application/json` from any script that creates tokens or webhooks; [the API reference](/docs/reference/api) has the fields.

## Roll back a failed upgrade

Rolling back means restoring the code and the data together.
Restore the code alone and you are running old code against data a newer version wrote, which is where rollbacks go wrong.

Rolling back is safe when you restore the backup you took before the upgrade:

```bash
docker compose down
rm -rf data
tar -xzf ~/cryozen-backup-20260731.tar.gz
git checkout your_previous_tag_here
docker compose up -d --build
```

If you skipped the snapshot, the copy the application took on its own is the next best thing: `backups/pre-migration/` inside the data directory holds `smriti.db` as it was before the newest build first migrated it, named with the schema versions it moved between.
Stop the application, replace `smriti.db` with that copy, and delete `smriti.db-wal` and `smriti.db-shm` beside it, because they belong to the database you are replacing.

Two properties make a code-only rollback survivable in many cases, though neither is a guarantee.
Schema changes are additive `ALTER TABLE ... ADD COLUMN` statements applied at startup, so an older build sees columns it does not read rather than a schema it cannot open.
The `schema_version` table records every version the database has reached, and an older build leaves a newer recorded version in place rather than lowering it.
The rename seams deliberately leave legacy state in place: the legacy scheduled-mail column, the legacy browser storage keys, and the legacy session cookie all survive the upgrade, so a pre-rename build still finds them.

One thing does not roll back on its own.
Vector collections renamed from the legacy prefix to `cryozen_*` are never renamed back, and a pre-rename build looks only for the legacy names, so it finds an empty vector store and falls back to keyword search.
Recover by restoring the ChromaDB data from your backup, or by renaming the collections back by hand.

Two more cases need the backup rather than a checkout.
Any upgrade that adds a table cannot be undone by removing code, because the older build never learns to ignore it cleanly under every query path.
Any run of `/api/import` merges data into the live store, and there is no undo for it.

If you have no backup, do not delete anything.
Bring the newer version back up, take the snapshot you skipped, and then decide.

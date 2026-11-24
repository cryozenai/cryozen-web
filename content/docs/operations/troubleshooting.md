---
title: "Troubleshooting"
source: "docs/operations/troubleshooting.md"
ref: "v1.2.0"
commit: "f358e1dc7f53603abdf3f3d7ae2face02bd939ca"
---
# Troubleshooting

This page matches a symptom you can see to the cause behind it and the command or setting that fixes it.
It is written for whoever operates the instance, and it assumes you can reach a shell on the host.
Sections are ordered roughly by how early in a deployment you hit them, so scan the headings rather than reading top to bottom.

## Find the logs for your deployment path

The application logs to standard output and standard error rather than to a file, so where the logs live depends on what is supervising the process.

Read them the way your path expects:

- **Docker Compose**: `docker compose logs -f cryozen`, and name another service to inspect it, as in `docker compose logs searxng`.
- **Native launcher and systemd**: both paths require a source checkout, which is not public.

Two other log sources exist alongside those.
The `./logs` directory in the Compose directory is bind-mounted into the container and holds application-level logs.
Local model downloads and serves run under `tmux` inside the container and write per-session logs to `/tmp/cryozen-tmux/`.
Inside Docker, `docker compose exec cryozen python cli/cryozen-logs list` enumerates both so you do not have to remember which directory holds what.

Raise the verbosity of a command-line tool for one run with `LOG_LEVEL=DEBUG`, which every `cryozen-*` command reads.

## The launcher exits with "Port is already in use"

The launcher scripts that print this message require a source checkout, which is not public.

## The container starts but the page will not load

The Compose stack publishes the interface on the loopback address by default, so it is reachable from the host and from nowhere else.
This is deliberate: CryoZen runs shell commands and holds credentials.

Confirm the container is up and the port is mapped where you think it is:

```bash
docker compose ps
curl -fsS http://127.0.0.1:7000/api/health
```

If `curl` succeeds on the host and your browser is on another machine, the bind address is the cause and not a bug.
Put a reverse proxy in front of the instance, as described in [the deployment guide](/docs/operations/deployment).
If you accept the risk of exposing it directly, set `APP_BIND=0.0.0.0` in `.env` and run `docker compose up -d`.

If the container is not up at all, check whether it is still waiting on SearXNG.
The `cryozen` service declares a dependency on the SearXNG health check, so a SearXNG that never becomes healthy blocks the application from starting:

```bash
docker compose logs searxng
```

The SearXNG image tag is pinned in `docker-compose.yml` for this reason, and the comment there records which upstream tag crashed on boot.
Do not replace the pin with `latest` to work around a problem.

## The application logs permission errors on the data directory

The container drops from root to `PUID:PGID`, which default to `1000:1000`, and the entrypoint repairs ownership under `/app`, `/app/data`, and `/app/logs` on every start.
When your host account uses different identifiers, files written by the host and files written by the container disagree, and writes fail with `EPERM`.

Set the identifiers to match your account and recreate the container:

```bash
echo "PUID=$(id -u)" >> .env
echo "PGID=$(id -g)" >> .env
docker compose up -d
```

In a desktop package there is no such translation, so the failure means your own account cannot write the resolved data directory.
Ask the application which directory it resolved and whether it can write there, at the address the package opened in your browser, which is port 7860 unless that port was taken:

```bash
curl -fsS http://127.0.0.1:7860/api/ready
```

The `data_dir` check in that response reports the path it probed and the error it hit, which is faster than guessing which directory it resolved.

## You cannot sign in, or you were signed out after a restart

Signed-in sessions persist to `sessions.json` in the data directory with a lifetime of 7 days, so a restart on its own does not sign anyone out.
Being signed out after a restart means the application is no longer reading the same data directory it wrote to.

That happens for three reasons in practice:

- **The data directory moved**: `CRYOZEN_DATA_DIR` changed, which points the application at a different directory and leaves the old accounts behind.
- **The directory is not persisted**: on the Compose path, a container that writes outside the `./data` bind mount loses everything on recreation.
- **The directory is not writable**: `sessions.json` never saves, so every restart starts with no sessions.

Check the resolved path first with `/api/ready`, then compare it against where `niti.json` actually is.

If you have lost the administrator password rather than the session, reset it inside the container against the same bind-mounted data directory the application reads, then restart so the account file is re-read:

```bash
docker compose exec cryozen python cli/seed_admin.py \
  --email admin@local.test --password your_new_password_here --force
docker compose restart cryozen
```

Prefer `cli/seed_admin.py` over `cli/reset_admin.py`, because `seed_admin.py` resolves `CRYOZEN_DATA_DIR` the same way the application does (bare host-side `cli/` invocations require a source checkout, which is not public).

## Every API request returns 401

Two distinct causes produce a blanket 401, and the response body tells them apart.

A body of `{"error":"Setup required"}` means no account exists yet.
The account file is present but its user list is empty, so the application refuses API calls and redirects browser requests to `/login` for first-run setup.
Open `http://127.0.0.1:7000/login` and create the first administrator, or provision one with `cli/seed_admin.py` as shown above.

A body of `{"error":"Not authenticated"}` means your credential was rejected.
For a browser, the session cookie is missing, expired, or not being sent.
For a script, check that the header is `Authorization: Bearer` followed by a token beginning `ody_`: the middleware rejects a bearer token whose length falls outside 12 to 100 characters before it ever consults the database.

If you set `SECURE_COOKIES=true` and then reached the instance over plain HTTP, the browser will not send the cookie at all, and you will see this on every request after a successful sign-in.
Either finish the HTTPS setup or set `SECURE_COOKIES=false` until you have.

A handful of routes are exempt from authentication by design, including `/api/health`, `/api/ready`, `/api/version`, and the sign-in routes.
A 401 on those is not expected, so treat it as a different problem.

## Signing in with Google, Microsoft, or GitHub fails after a restart

The application signs the middleware session cookie with `SESSION_SECRET`.
When that variable is unset, it generates a fresh random secret on every boot, and any authorization already in flight comes back to a server that cannot verify its own state parameter.

Set a fixed secret and restart:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Record the output as `SESSION_SECRET` in `.env`.
This affects the OAuth sign-in flow, provider linking, and delegated account connection, all of which store state in that cookie between the redirect out and the callback back.
It does not affect ordinary email and password sessions, which are stored separately.

If sign-in fails without a restart, the redirect URI is the next thing to check.
The application builds the callback from the incoming request, so it must match what the provider has registered: `https://your_domain_here/api/auth/oauth/callback/google`, and the same shape per provider.
Behind a reverse proxy, the request has to carry `X-Forwarded-Proto` or the application builds an `http://` URI that the provider rejects.
Uvicorn trusts those headers from `127.0.0.1` only, so a proxy on a different host needs `FORWARDED_ALLOW_IPS` set to its address in a `docker-compose.override.yml`, as [the deployment guide](/docs/operations/deployment#put-cryozen-behind-a-reverse-proxy-with-https) shows.

A provider whose client id is not set is disabled rather than broken, and its button does not appear on the login page.
On the Compose path, remember that `docker-compose.yml` forwards a fixed list of variables into the container, and the social sign-in credentials are not on it, so add them to the service's `environment:` key as well as `.env`.

## The model list is empty and chat returns "No model endpoint configured"

CryoZen ships with no model endpoint.
Nothing is discovered automatically, so an instance that has never been configured has an empty list and every chat request fails at the point it looks for a model.

Check what the instance knows about:

```bash
curl -fsS -b "cryozen_session=your_session_token_here" \
  http://127.0.0.1:7000/api/model-endpoints
```

Add an endpoint in the settings interface, or through `POST /api/model-endpoints`, then probe it to confirm the models it advertises:

```bash
curl -fsS -b "cryozen_session=your_session_token_here" \
  http://127.0.0.1:7000/api/model-endpoints/your_endpoint_id_here/probe
```

If the endpoint exists but reports no models, the address is usually the problem rather than the endpoint.
Inside a container, `localhost` means the container itself.
The Compose file adds a `host.docker.internal` host entry for this, so a model server running on the Docker host is reachable at `http://host.docker.internal:11434` rather than `http://localhost:11434`.
`GET /api/runtime` reports whether the application believes it is running in Docker and which Ollama base URL it derived.

A chat that fails with `Selected model endpoint was removed. Pick another model in Settings.` means the session references an endpoint that no longer exists.
Choose a different model on that conversation.

## Web search and deep research return nothing

Search runs through a provider you select, and a provider that is not configured is skipped rather than reported.
When every provider is skipped or returns empty, the application says so: `No search results found. Tried: ...` when the providers answered but had nothing, and `Web search failed` when they errored.

List the providers and whether each one is usable:

```bash
curl -fsS -b "cryozen_session=your_session_token_here" \
  http://127.0.0.1:7000/api/websearch/providers
```

A provider shows `available: false` when its API key is missing, or, for SearXNG, when no instance URL is set.
The Compose stack runs its own SearXNG and points the application at `http://searxng:8080`, so on that path a false value usually means the SearXNG container is unhealthy rather than unconfigured:

```bash
docker compose ps searxng
docker compose logs searxng
```

In a desktop package nothing starts SearXNG for you.
Either set `SEARXNG_INSTANCE` to an instance you run, or choose a provider that uses an API key instead.

## Document search and memory recall find nothing

Vector search needs ChromaDB.
When it is unreachable, the client fails fast with a message naming the address it tried, and retrieval falls back to keyword matching, which finds less than you expect rather than nothing at all.

The client probes the port with a 2s connect timeout before doing anything, so an unreachable instance shows up as a startup warning rather than a hang.
Tune that probe with `CHROMADB_CONNECT_TIMEOUT` if your instance is slow to accept connections.
Confirm the service is running and that its port is open at the address the application uses:

```bash
docker compose ps chromadb
nc -z 127.0.0.1 8100 && echo open
```

The Compose stack sets `CHROMADB_HOST=chromadb` and `CHROMADB_PORT=8000` inside the container, and publishes the same service on `127.0.0.1:8100` for anything running on the host.
That is why the defaults in the code are `localhost` and `8100`: they describe the native case, not the in-container one.

For a desktop package, start a ChromaDB instance and leave the defaults alone:

```bash
docker run -d --name chromadb -p 127.0.0.1:8100:8000 chromadb/chroma
```

If the message is `ChromaDB integration is not installed`, the Python package is missing from the environment, and installing it requires a source checkout, which is not public.

## A feature reports a missing optional dependency

Several capabilities are optional, and the application logs a warning and degrades rather than failing to boot.
Seeing one of these in the logs on a lean install is expected.

Two are common enough to name:

- **The Playwright browser MCP server**: it logs a warning at startup and the server is skipped. It runs through `npx`, so the first connection has to download the package. Run `npx -y @playwright/mcp@latest --version` once to cache it, then restart CryoZen and reconnect the server.
- **`python-magic`**: uploads fall back to basic content-type detection, which is less precise about file types. Install `python-magic` and the system `libmagic` library if you need the stronger detection.

Installing the optional dependency set from `requirements-optional.txt` requires a source checkout, which is not public.

## An MCP server will not start

Model Context Protocol servers are external processes, so a failure to start is almost always about the command rather than about CryoZen.
The connection error is surfaced verbatim, with an install hint added for the servers where the cause is predictable.

Check three things in order:

1. **The command exists on the host running CryoZen.** Servers launched with `npx` need Node.js and npm, which the Docker image includes and a desktop package may not.
2. **The package is cached.** The first `npx` invocation downloads, and a connection attempt can time out before the download finishes. Run the server's `--version` by hand once.
3. **The server actually speaks MCP over the transport you configured.** A remote Streamable HTTP server that requires authorization needs the OAuth flow below, not a plain connection.

For a remote server that uses OAuth, the redirect URI defaults to `http://localhost:7000/api/mcp/oauth/callback`, which is wrong for any instance behind a proxy or on a different port.
Set `OAUTH_REDIRECT_BASE_URL` to your externally reachable origin and restart.
The authorization window is 300s, after which the pending flow is discarded and you start again.

## Mail will not connect

Mail accounts are configured per user and stored encrypted with the Fernet key in the data directory.
A connection failure is reported from the underlying IMAP or SMTP library, so the message names the actual cause: authentication refused, certificate rejected, or connection refused.

Work through the causes in that order:

- **Authentication refused**: providers that enforce two-factor authentication require an application-specific password rather than your account password. Generate one with the provider and use it.
- **Connection refused or timed out**: confirm the host and port, and that the host running CryoZen can reach them. Inside a container, a mail server on the Docker host is not at `localhost`.
- **Sending fails while receiving works**: an account can be configured for receive only. The application then falls back to the first account that has SMTP configured, and reports `No SMTP-capable email account configured` when there is none.

If the credential itself decrypts to nothing, the Fernet key at `.app_key` in the data directory has changed since the account was saved.
Re-enter the account credentials, because there is no way to recover the old ciphertext.

## CalDAV or CardDAV sync fails

Calendar and contact sync validate the server address before connecting, and they refuse private and loopback addresses by default.
This stops a saved calendar URL from being used to probe the internal network.

When your CalDAV server is on your own network, the error is `Private CalDAV IPs require CRYOZEN_ALLOW_PRIVATE_CALDAV=1`, and the fix is to opt in explicitly:

```ini
CRYOZEN_ALLOW_PRIVATE_CALDAV=1
```

Restart after setting it, and set it only when you trust every address the instance's users can save.

For other failures, check the collection URL first.
The client performs `PROPFIND` discovery from the URL you give it, so a URL that points at a web interface rather than at the CalDAV or CardDAV collection fails discovery even though it opens correctly in a browser.
Nextcloud, Radicale, Apple, and Fastmail each publish the correct principal URL in their own documentation.

## Image generation is unavailable

Two distinct paths generate images, and they fail differently.

A hosted image model is selected by name, and the application routes a conversation into the image path when the model name begins with `gpt-image`, `dall-e`, or `chatgpt-image`, or when the selected endpoint is registered as an image endpoint.
If nothing happens, the model is not one of those and the endpoint is not registered as an image endpoint.

A local diffusion server runs through Compute and needs PyTorch and the `diffusers` package on the machine that serves it.
The launcher preflights that import and stops with `ERROR: Diffusion serving requires PyTorch + diffusers.` followed by the real import error, rather than starting a server that cannot load a model.
Install both on the serving host, then start the server again.

Inside Docker, the image ships without a compute stack on purpose.
The GPU overlays pass the device through but install nothing, so install the inference packages through the Compute dependencies panel before expecting a GPU model to serve.

## An SSH operation fails with a changed host key

Every SSH call the application makes pins the remote host key on first contact and refuses the connection when that key later changes.
The error names the host and points at the reset endpoint: the key changed since it was first pinned, which is either a reinstalled server or an interception.

Treat it as an interception until you have a reason not to.
A reinstalled or rekeyed server is the benign explanation, and you should be able to confirm the new fingerprint out of band before you accept it.

List what is currently pinned:

```bash
curl -fsS -b "cryozen_session=your_session_token_here" \
  http://127.0.0.1:7000/api/compute/known-hosts
```

Once you have confirmed the change was expected, forget the pin so the next connection records the new key:

```bash
curl -fsS -X DELETE -b "cryozen_session=your_session_token_here" \
  http://127.0.0.1:7000/api/compute/known-hosts/your_host_here
```

Both routes require an administrator session.
The pinned keys live in `ssh_known_hosts` in the data directory, never in the invoking account's `~/.ssh/known_hosts`, so nothing you do here affects SSH elsewhere on the host.

## A long request fails with 504 and "Request exceeded 45s timeout"

The application aborts any request that runs past a hard timeout, so one hung handler cannot hold the event loop for everybody.
The default is 45s, and a set of routes that legitimately run longer are exempt, including chat streaming, the shell stream, deep research, model downloads, model probes, uploads, and image operations.

If a route you wrote or a plugin you added exceeds the limit, raise it for the whole process:

```ini
REQUEST_HARD_TIMEOUT=120
```

Behind a reverse proxy, check the proxy's own timeout before changing this one.
An nginx default of 60s cuts off a deep research run that the application would have allowed to continue, and the symptom looks identical from the browser.

## The backup snapshot does not contain the data you expected

`cli/cryozen-sanrakshana snapshot` archives the data directory the application resolves: `CRYOZEN_DATA_DIR`, which Docker Compose sets to `/app/data` and desktop packages set to their per-user data directory.
The command reads `.env` the same way the application does, so `CRYOZEN_DATA_DIR`, `CRYOZEN_BACKUP_DIR`, `CRYOZEN_BACKUP_KEEP`, and `DATABASE_URL` set there apply, and the same variables set in the shell win.
On the Compose path run the command inside the container, as `docker compose run --rm --no-deps cryozen python cli/cryozen-sanrakshana`, because the host shell does not carry the container's `CRYOZEN_DATA_DIR` and would resolve a different directory.
`run` goes through the image entrypoint, which applies `PUID` and `PGID` from `.env` as the service does; `exec` would run as root, and a `--user` built in the host shell can name the wrong owner because that shell does not read `.env`.
The entrypoint runs first-time setup only when it starts the server, so a one-off command like this one finds the database as it was.
`--no-deps` leaves out searxng and chromadb, because the tool needs neither and an unhealthy searxng would otherwise block it.
A deployment that sets these variables some other way needs them in the shell too.
Every subcommand prints the `data_dir` it resolved.
The command refuses to run when the resolved directory or its `smriti.db` does not exist, which is the usual sign that it resolved the wrong place, and it creates neither.
`restore` refuses a missing directory too; if the path it names is the right one, create it with `mkdir` and run it again.
The archive holds the database `DATABASE_URL` names.
Large or re-derivable subtrees are left out by default, as listed in the [CLI reference](/docs/reference/cli#backups-sanrakshana), and the manifest's `excluded` field names the ones it skipped.

Check what a snapshot holds before you rely on it, rather than after you need it (run inside the container on the Compose path):

```bash
docker compose run --rm --no-deps cryozen python cli/cryozen-sanrakshana snapshot
docker compose run --rm --no-deps cryozen python cli/cryozen-sanrakshana verify /app/data/backups/your-snapshot.tar.gz
```

`verify` extracts every member to a temporary directory and discards it, which needs free space equal to the uncompressed archive, and reports the member count, the first and last entry names, and the archive's `manifest.json`, whose `data_dir` field names the directory the snapshot was taken from.
It rejects a tarball whose entries are absolute, contain `..`, are links or special files, or sit outside a top-level `data/` directory, which is the same check `restore` applies.

Archives made by releases before the manifest existed have no `manifest.json` and may not hold your data; treat them as suspect and take a fresh snapshot.
A `.part` file beside the archives or a `.snapshot-staging-*` directory in the data directory is an interrupted write and can be deleted, unless a snapshot is still running.
See [upgrading](/docs/operations/upgrading) for the full backup procedure per deployment path.

## The readiness report shows an old or missing backup

`GET /api/ready` reports the age in seconds of the newest archive in the backup directory under `checks.backup` as `age_seconds`, and of the newest scheduled one as `daily_age_seconds`, with the schedule.
It reports no paths, because the route needs no login; `docker compose run --rm --no-deps cryozen python cli/cryozen-sanrakshana list` shows them.
An `error` of `unavailable` means the backup directory could not be read, and the application log carries the cause.
Both ages are `null` on an instance that has never written an archive, which is normal for the first minute after a fresh install; a `daily_age_seconds` far above 86400 while `age_seconds` is small means someone takes manual snapshots and the scheduler is not writing.

The daily archive is written by the in-process task scheduler.
`checks.backup.scheduled.enabled` says whether it can run here, and `scheduled.reason` names what turned it off.
It stays missing or stale when `CRYOZEN_INPROCESS_TASKS=0` hands scheduling to an external driver, when `CRYOZEN_BACKUP_KEEP=0` disables the daily backup, when the resolved data directory holds no `smriti.db`, in which case the application log carries a `Daily backup failed` line naming the path, when the backup directory lacks the room, which the log says with `Daily backup failed: insufficient free space`, or when `DATABASE_URL` is not SQLite, which the log says once at startup with `Daily backup is off`.
The check never turns `ready` false, so an orchestrator keeps routing traffic while you fix it.

## Nothing here matches your symptom

Collect three things before you ask for help, because they answer most of the first round of questions:

- **The readiness report**: `curl -fsS http://127.0.0.1:7000/api/ready` names the failing subsystem and the data directory in use.
- **The version**: `curl -fsS http://127.0.0.1:7000/api/version`.
- **The startup logs**: the first 100 lines after a restart, where optional dependencies, disabled providers, and configuration warnings are reported.

Redact tokens, passwords, and mail addresses from anything you paste.
Then open an issue at [the public release channel](https://github.com/cryozenai/cryozen-releases/issues).

---
title: "Deployment"
source: "docs/operations/deployment.md"
ref: "v1.2.0"
commit: "f358e1dc7f53603abdf3f3d7ae2face02bd939ca"
---
# Deployment

This page covers running CryoZen on a machine you intend to keep running: which of the three deployment paths to pick, the exact commands each one takes, and what to configure before the instance is reachable by anything other than your own browser.
It is written for whoever operates the box.
Every path binds to `127.0.0.1` by default, so publishing the instance is always a decision you make on purpose, and the reverse proxy, health check, and hardening sections below describe what that decision requires.

## Choosing a deployment path

Three paths ship in the repository, and they differ in what they bring with them rather than in what the application can do:

| Path | What it is for | Bundled services | Default URL |
| --- | --- | --- | --- |
| Docker Compose | A server that should come back up on its own, with search and the vector store included. | CryoZen, ChromaDB, SearXNG, ntfy | `http://127.0.0.1:7000` |
| Native launcher | A workstation, and any machine whose GPU must be visible to the model server. | CryoZen only | `http://127.0.0.1:7000` on Linux and Windows, `http://127.0.0.1:7860` on macOS |
| systemd service | A Linux host where CryoZen should start at boot without Docker. | CryoZen only | `http://127.0.0.1:7000` |

Pick Docker Compose unless something rules it out.
Pick a native launcher on macOS, because Docker Desktop runs a Linux virtual machine with no access to the Metal GPU, and the built-in model server needs that GPU to serve local models.
Pick systemd when you want the native runtime and a supervised process, and you are willing to run ChromaDB yourself or do without the vector store.

## Deploy with Docker Compose

The Compose stack pulls the published `ghcr.io/cryozenai/cryozen` image and starts four services.
You need Docker with Compose v2.

```bash
git clone https://github.com/cryozenai/cryozen-releases.git
cd cryozen-releases
cp .env.example .env
docker compose up -d
```

Open `http://127.0.0.1:7000` and create the first administrator account when the login page prompts you.

The stack publishes four host ports, all on loopback by default:

- **`127.0.0.1:7000`**: the CryoZen web interface, mapped to port 7000 inside the container. Change the host side with `APP_BIND` and `APP_PORT` in `.env`.
- **`127.0.0.1:8100`**: ChromaDB, mapped to its container port 8000. Change the bind address with `CHROMADB_BIND`.
- **`127.0.0.1:8080`**: SearXNG, used by deep research and web search. This bind address is fixed in `docker-compose.yml`.
- **`127.0.0.1:8091`**: ntfy, for push notifications, mapped to its container port 80. Change the bind address with `NTFY_BIND` and the advertised URL with `NTFY_BASE_URL`.

Application state lives in two bind mounts, `./data` and `./logs`, so it survives `docker compose down`.
The image pins `CRYOZEN_DATA_DIR=/app/data` for exactly this reason: without it the data directory would resolve to an unmounted path inside the container and every restart would start from nothing.

The container entrypoint drops from root to `PUID:PGID`, which default to `1000:1000`, and repairs ownership under `/app`, `/app/data`, and `/app/logs` on every start.
If your host account uses different identifiers, set them in `.env` so the bind-mounted files stay editable from the host:

```bash
echo "PUID=$(id -u)" >> .env
echo "PGID=$(id -g)" >> .env
docker compose up -d
```

The `cryozen` service waits for SearXNG to pass its health check before it starts, so a first boot takes longer than later ones.
Read the logs with `docker compose logs -f cryozen`.

Note that `docker-compose.yml` forwards an explicit list of environment variables into the container.
A variable you add to `.env` reaches the application only if that list names it, so social sign-in credentials and any other variable absent from the list also need an entry under the service's `environment:` key.

## Deploy with the native launcher

Source builds and the native launcher scripts (`start.sh` and `launch-windows.ps1`) are available to licensees; for public installs, download a desktop package on [the download page](/download) or pull the published container image from [/download#docker](/download#docker).

## Deploy as a systemd service

Source builds and the `systemd` service unit files (`cryozen-ui.service` and `install-service.sh`) are available to licensees; for public server deployments, pull the published container image from [/download#docker](/download#docker).

## Put CryoZen behind a reverse proxy with HTTPS

CryoZen does not terminate TLS.
To reach it over HTTPS, run a proxy in front of it and keep the application itself on loopback.

Run the proxy on the same host as CryoZen where you can.
Uvicorn trusts forwarded headers from `127.0.0.1` by default, and it needs `X-Forwarded-Proto` to build the `https://` callback URLs that OAuth sign-in depends on.
If the proxy runs on a different machine, start uvicorn with `--forwarded-allow-ips` naming that machine's address, or the application will build `http://` redirect URIs and every OAuth flow will fail.

This nginx server block terminates TLS and forwards the headers CryoZen needs:

```nginx
server {
    listen 443 ssl;
    server_name your_domain_here;

    ssl_certificate     /etc/letsencrypt/live/your_domain_here/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your_domain_here/privkey.pem;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:7000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }
}
```

Two directives in that block are not optional.
`proxy_buffering off` keeps streamed chat responses and server-sent events flowing instead of arriving in one block at the end.
`proxy_read_timeout 3600s` covers deep research runs and model downloads, which the application exempts from its own 45s request timeout and which outlive nginx's 60s default.

Once the proxy is in front of the app, change three settings:

- **`SECURE_COOKIES=true`**: marks the session cookie `Secure` so browsers stop sending it over plain HTTP. Set this only after HTTPS works, because a `Secure` cookie is never sent to an `http://` origin and you will not be able to sign in.
- **`ALLOWED_ORIGINS=https://your_domain_here`**: the Cross-Origin Resource Sharing (CORS) allowlist. It defaults to `http://localhost,http://127.0.0.1`, which does not include your public origin.
  Writes from the app's own pages pass the cross-origin check without it in current browsers. A browser too old to send `Sec-Fetch-Site` is checked by comparing `Origin` with the request's host, so a proxy that rewrites `Host` should also pass `X-Forwarded-Host`, or the origin should be listed here.
- **`SESSION_SECRET`**: a fixed high-entropy value. Leave it unset and the application generates a new random secret on every boot, which invalidates any OAuth authorization already in flight.

Generate a secret and record it in `.env`:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

The stable public origin matters beyond cookies.
Social sign-in requires you to register an exact redirect URI with each provider, and the application builds that URI from the incoming request, so it has to match what the provider has on file: `https://your_domain_here/api/auth/oauth/callback/google` and the same shape for every other provider.
OAuth against remote Model Context Protocol (MCP) servers registers a separate redirect URI that defaults to `http://localhost:7000/api/mcp/oauth/callback`, which is wrong for any deployment behind a proxy.
Set `OAUTH_REDIRECT_BASE_URL` to your externally reachable origin so the redirect lands back on the application:

```ini
OAUTH_REDIRECT_BASE_URL=https://your_domain_here
```

The application sends a Content Security Policy on every response, and it allows scripts only from its own origin and a per-request nonce.
Do not add a proxy that rewrites or strips those headers, and do not attempt to frame the interface: responses carry `X-Frame-Options: DENY` and `frame-ancestors 'none'`.

## Enable GPU passthrough in Docker

The GPU overlay files pass the host GPU into the `cryozen` container.
They do not install a compute stack: the image stays slim, so you still install vLLM or llama-cpp-python through the Compute dependencies panel before a model can serve on the GPU.

For NVIDIA, install the NVIDIA Container Toolkit on the host, point Docker at the runtime, then select the overlay in `.env`:

```bash
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
echo "COMPOSE_FILE=docker-compose.yml:docker/gpu.nvidia.yml" >> .env
docker compose up -d
```

For AMD, install the ROCm drivers so `/dev/kfd` and `/dev/dri` exist, add your Docker user to the `video` and `render` groups, and record the numeric render group id:

```bash
echo "COMPOSE_FILE=docker-compose.yml:docker/gpu.amd.yml" >> .env
echo "RENDER_GID=$(getent group render | cut -d: -f3)" >> .env
docker compose up -d
```

On Windows, `COMPOSE_FILE` separates paths with a semicolon rather than a colon.

Two diagnostic scripts check the host before you commit to a configuration.
`cli/check-docker-gpu.sh` is read-only by default and can also print or run the NVIDIA toolkit install, and write `COMPOSE_FILE` to `.env` when you pass `--enable-nvidia-overlay`.
`cli/check-docker-amd-gpu.sh` is read-only with no install mode, and verifies that a container can see the AMD device nodes.

Some stack-management interfaces accept only one Compose file and ignore `COMPOSE_FILE`.
For those, use `docker-compose.gpu-nvidia.yml` or `docker-compose.gpu-amd.yml`, which are the base file and the matching overlay already merged.
Prefer the overlay workflow anywhere you drive Compose from a shell, because the merged files are maintained copies rather than the source of truth.

## Wire health checks into an orchestrator

Two endpoints report status, and both are exempt from authentication so a probe needs no credentials.

Use `/api/health` as the liveness probe.
It answers 200 with a status string and a timestamp whenever the process is serving requests, and it touches nothing else, so it never fails for a reason a restart would not fix.

```bash
curl -fsS http://127.0.0.1:7000/api/health
```

Use `/api/ready` as the readiness probe.
It answers 200 only when every critical check passes, and 503 otherwise, with a JSON body naming the check that failed.
It confirms that the database engine answers `SELECT 1`, and that the data directory exists and accepts a write.
It also reports whether storage is local to the host and how old the newest backup is, which are informational and never fail the probe.

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:7000/api/ready
```

Gate traffic on `/api/ready` and restart on `/api/health`.
Reversing them restarts a container whose database is unreachable, which does not fix an unreachable database.

Note that `docker-compose.yml` defines no health check for the `cryozen` service, only for `searxng`.
Add one in your own override file if your orchestration depends on Compose reporting container health.

## Size the host

CryoZen itself is a Python web application with a SQLite database, and its footprint is modest.
What you size for is everything that runs alongside it.

Plan capacity around four contributors:

- **The Compose stack**: four containers, of which SearXNG and ChromaDB are the ones with meaningful resident memory. The application image builds from `python:3.12-slim` and adds a compiler toolchain, Node.js, `tmux`, and an SSH client, so expect a multi-gigabyte image.
- **The data directory**: it grows with mail attachments, uploaded documents, generated images, deep research runs, and the vector store. Watch `./data` rather than the image.
- **Embeddings**: the local FastEmbed fallback downloads its model on first use, roughly 50 MB, and runs on the CPU.
- **Local model serving**: this dominates everything else when you use it. A served model needs memory for its weights on whichever device serves it, so size that against the model, not against CryoZen.

Point a model endpoint at a machine that is not this one, and the host requirement collapses back to the first three items.

## Harden a network-reachable instance

CryoZen runs shell commands, reads and writes files, and holds mail and provider credentials.
Treat a reachable instance as an administrative surface.
The [threat model](/security) states what is protected and what is out of scope.

Every launcher, the Compose port mapping, and the systemd unit bind to `127.0.0.1`, and that is the correct default.
To reach the instance from another device, do not change the bind address.
Put a reverse proxy or a private network in front of it and leave the application on loopback.

If you accept the risk and want the application itself on a LAN interface, set `APP_BIND=0.0.0.0` in `.env` for the Compose and launcher paths, or `--host 0.0.0.0` in the systemd unit.
Before you do, confirm four settings:

- **`AUTH_ENABLED`**: leave it at its default of `true`. Setting it `false` removes authentication from every route.
- **`LOCALHOST_BYPASS`**: keep it `false`. It exists for local development, and it logs a warning at startup when enabled.
- **`SECURE_COOKIES` and HTTPS**: set both together, so the session cookie is never sent in the clear.
- **`ALLOWED_ORIGINS`**: name your real origin, and remove any origin you do not control.

Social sign-in has one precondition that no setting can remove.
Providers require a registered redirect URI, and a self-hosted instance on `localhost` has no stable public callback URL, so every provider needs a reverse proxy with HTTPS and a domain you control before any of it works.
Each provider is disabled until you supply its client credentials, and the login page shows a provider button only once its client id is set, so an unconfigured instance degrades to local email and password rather than breaking.

Continue with [upgrading](/docs/operations/upgrading) when a new version lands, or [troubleshooting](/docs/operations/troubleshooting) when something in this page does not behave as described.
Every environment variable named here is listed with its default in [the configuration reference](/docs/reference/configuration).

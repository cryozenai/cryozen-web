---
title: "Deployment"
source: "docs/operations/deployment.md"
ref: "v1.2.0"
commit: "f358e1dc7f53603abdf3f3d7ae2face02bd939ca"
---
# Deployment

This page covers running CryoZen on a machine you intend to keep running: the public Docker Compose path, the exact commands it takes, and what to configure before the instance is reachable by anything other than your own browser.
It is written for whoever operates the box.
The Compose stack binds to `127.0.0.1` by default, so publishing the instance is always a decision you make on purpose, and the reverse proxy, health check, and hardening sections below describe what that decision requires.

## Choosing a deployment path

Docker Compose is the public deployment path for a server that should come back up on its own: it pulls the published `ghcr.io/cryozenai/cryozen` image, runs CryoZen with ChromaDB, SearXNG, and ntfy, and serves `http://127.0.0.1:7000`.
On macOS, Docker Desktop runs a Linux virtual machine with no access to the Metal GPU, so the built-in model server cannot serve local models from the Compose stack there.
For a single workstation, download a desktop package on [the download page](/download); it bundles Python and its dependencies but not ChromaDB or SearXNG.
The native launcher and systemd paths require a source checkout, which is not public.

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
A variable you add to `.env` reaches the application only if that list names it or Compose itself reads it, as with `APP_BIND`, `APP_PORT`, `SECURE_COOKIES`, and `ALLOWED_ORIGINS`.
Variables absent from the list, including `SESSION_SECRET`, `OAUTH_REDIRECT_BASE_URL`, `FORWARDED_ALLOW_IPS`, and the social sign-in client IDs and secrets, go in a `docker-compose.override.yml` next to `docker-compose.yml`.
Keep only the lines you need, then run `docker compose up -d`:

```yaml
services:
  cryozen:
    environment:
      - SESSION_SECRET=your_generated_secret_here
      - OAUTH_REDIRECT_BASE_URL=https://your_domain_here
      - FORWARDED_ALLOW_IPS=your_compose_gateway_address_here
      - GOOGLE_CLIENT_ID=your_client_id_here
      - GOOGLE_CLIENT_SECRET=your_client_secret_here
```

Compose reads the override automatically while `COMPOSE_FILE` is unset; if you set `COMPOSE_FILE`, add `docker-compose.override.yml` to that list too.

## Deploy with the native launcher

Source builds and the native launcher scripts (`start.sh` and `launch-windows.ps1`) require a source checkout, which is not public; for public installs, download a desktop package on [the download page](/download) or pull the published container image from [/download#docker](/download#docker).

## Deploy as a systemd service

Source builds and the `systemd` service unit files (`cryozen-ui.service` and `install-service.sh`) require a source checkout, which is not public; for public server deployments, pull the published container image from [/download#docker](/download#docker).

## Put CryoZen behind a reverse proxy with HTTPS

CryoZen does not terminate TLS.
To reach it over HTTPS, run a proxy in front of it and keep the application itself on loopback.

Run the proxy on the same host as CryoZen and keep `APP_BIND=127.0.0.1`, so only processes on the host can reach the published port.
The application needs `X-Forwarded-Proto` to build the `https://` callback URLs that OAuth sign-in depends on, and uvicorn trusts forwarded headers only from the addresses in `FORWARDED_ALLOW_IPS`, which defaults to `127.0.0.1`.
Under Docker Compose the proxy's connection reaches the container from the Compose network's gateway, so set `FORWARDED_ALLOW_IPS` for the `cryozen` service to that gateway address whenever a reverse proxy terminates HTTPS, or the application will build `http://` redirect URIs and every OAuth flow will fail.
The network is named after the Compose directory (`cryozen-releases` by default), and this prints its gateway:

```bash
docker network inspect cryozen-releases_default --format '{{(index .IPAM.Config 0).Gateway}}'
```

Put the address in `docker-compose.override.yml` as shown under [Deploy with Docker Compose](#deploy-with-docker-compose), because the published `docker-compose.yml` does not pass `FORWARDED_ALLOW_IPS` through from `.env`.
A desktop package serves on the host itself, so a proxy on the same machine is trusted at the `127.0.0.1` default.

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

Generate a secret and, on Docker Compose, set it as `SESSION_SECRET` in `docker-compose.override.yml`, as shown under [Deploy with Docker Compose](#deploy-with-docker-compose), because the published `docker-compose.yml` does not forward it from `.env`:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

The stable public origin matters beyond cookies.
Social sign-in requires you to register an exact redirect URI with each provider, and the application builds that URI from the incoming request, so it has to match what the provider has on file: `https://your_domain_here/api/auth/oauth/callback/google` and the same shape for every other provider.
OAuth against remote Model Context Protocol (MCP) servers registers a separate redirect URI that defaults to `http://localhost:7000/api/mcp/oauth/callback`, which is wrong for any deployment behind a proxy.
Set `OAUTH_REDIRECT_BASE_URL` to your externally reachable origin, such as `https://your_domain_here`; on Docker Compose, put it in `docker-compose.override.yml` as shown under [Deploy with Docker Compose](#deploy-with-docker-compose), so the redirect lands back on the application.

The application sends a Content Security Policy on every response, and it allows scripts only from its own origin and a per-request nonce.
Do not add a proxy that rewrites or strips those headers, and do not attempt to frame the interface: responses carry `X-Frame-Options: DENY` and `frame-ancestors 'none'`.

## GPUs and Docker

The GPU Compose overlays and the GPU diagnostic scripts ship in the source checkout, which is not public, and the published `docker-compose.yml` passes no GPU into the container.
To use a GPU with the public stack, run your model server, such as Ollama, on the host outside Docker and connect CryoZen to it through `host.docker.internal`, as [Integrations](/docs/guides/integrations#local-models) describes.
Desktop packages from [the download page](/download) run without Docker.

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

The Compose port mapping binds to `127.0.0.1`, and that is the correct default.
To reach the instance from another device, do not change the bind address.
Put a reverse proxy or a private network in front of it and leave the application on loopback.

If you accept the risk and want the application itself on a LAN interface, set `APP_BIND=0.0.0.0` in `.env`.
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

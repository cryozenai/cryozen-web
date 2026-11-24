---
title: "Connect models, services, and accounts"
source: "docs/guides/integrations.md"
ref: "v1.2.0"
commit: "f358e1dc7f53603abdf3f3d7ae2face02bd939ca"
---
# Connect models, services, and accounts

This guide covers every way CryoZen talks to something outside itself: language-model providers, web search, mail, calendars, contacts, and linked Google, Microsoft, or Apple accounts.
It is written for someone setting up an instance, and each section ends with how to confirm the connection works.

CryoZen ships with nothing connected.
An unconfigured integration reports "not connected" and the rest of the application keeps working, so you can connect only what you need.

## How connections are organized

Every integration is either instance-wide or per-user:

- **Instance-wide**: one setting shared by everyone, configured by an administrator. Language-model keys, search keys, local services, and contacts, including the CardDAV connection, work this way.
- **Per-user**: each account stores its own credentials. Mail, calendar, and linked accounts work this way, so two users on one instance never see each other's mailboxes.

Secrets are encrypted at rest with a key held in your data directory, masked whenever they are read back, and never written to logs.
The exception is the CardDAV password, which is stored in plain text in the instance settings file.

Most integrations live in one place in the interface: open **Settings**, then **Integrations**.
Each one is a card showing its current status, with buttons to test, connect, or disconnect it.

## Connect a language model

Nothing works until a model is reachable, so start here.
You have two options, and you can use both at once.

### Local models

CryoZen discovers local model servers automatically on the usual ports.
Start your server first:

```bash
ollama serve
```

Then open **Settings**, then **Models**, and confirm the models appear.
If the server runs on another machine or a non-default port, set `LLM_HOST` or `LLM_HOSTS` in your `.env` file, described in [the configuration reference](/docs/reference/configuration).

Running CryoZen in Docker and Ollama on the host needs one extra step, because the container cannot reach `localhost`.
Start Ollama with `OLLAMA_HOST=0.0.0.0:11434` and set this in `.env`:

```ini
OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
```

### Hosted providers

Hosted providers need an API key.
Open **Settings**, then **Integrations**, find the provider card, paste the key, and select **Save**.
CryoZen stores the key encrypted and immediately probes the provider, so the card tells you within a second whether the key works.

These providers are available as cards:

- **OpenAI**, **Anthropic**, **Groq**, and **DeepSeek**: chat and completion models.
- **GitHub Copilot**: sign in with a device code rather than a key, under **Settings**, then **Models**.

You can also add any OpenAI-compatible endpoint by URL under **Settings**, then **Models**, which covers vLLM, LM Studio, and self-hosted gateways.

### Confirm it works

Select **Test** on the provider card.
A working key returns "connected".
A rejected key returns "auth failed", which means the key is wrong or lacks access rather than that CryoZen is broken.
Then open a new chat, pick the model, and send a message.

## Connect web search

Web search powers both the search feature and deep research.
CryoZen defaults to SearXNG, a metasearch engine that runs beside it in Docker Compose, so queries do not go directly to a commercial search engine.

If you started CryoZen with Docker Compose, SearXNG is already running and its card reports "connected" with no configuration.

To use a commercial provider instead, or as a fallback, add a key to any of these cards under **Settings**, then **Integrations**:

- **Brave Search**: a general-purpose index with a free tier.
- **Tavily**: built for retrieval by language models.
- **Serper**: a Google Search interface.

A key saved on a card applies immediately, with no restart.

## Connect mail

CryoZen includes a full mail client that speaks IMAP and SMTP.
Open **Settings**, then **Email**, and add an account with your server hostnames, port, username, and password.

Two details prevent most connection failures:

- **Use an app password, not your account password**, for any provider with two-factor authentication. Gmail, Outlook, and iCloud all require this.
- **Match the encryption to the port**: 993 for IMAP over TLS, 465 for SMTP over TLS, and 587 for SMTP with STARTTLS.

CryoZen verifies the credentials by logging in before it stores them, so a rejected password fails at the moment you save rather than silently later.
The mail card under **Integrations** then reports the account's live status.

For Google and Microsoft mailboxes, prefer linking the account instead, described below.
Linking uses OAuth, so you never hand CryoZen a password.

## Connect a calendar and contacts

Calendars sync over CalDAV and contacts over CardDAV, which covers Nextcloud, Radicale, Baikal, Fastmail, and iCloud.

Open **Settings**, then **Calendar**, and add the account with its server URL, username, and password.
Select **Test** to confirm CryoZen can reach the server before you rely on it.
Contacts follow the same pattern under **Settings**, then **Contacts**.
Contacts are shared across the instance, and only an administrator can configure or edit them.

CryoZen negotiates both Basic and Digest authentication, so servers that require Digest, such as a default Baikal installation, work without extra configuration.

## Link a Google, Microsoft, or Apple account

Linking an account is different from the connections above: instead of storing a password, CryoZen holds a delegated OAuth token and mirrors your mail, calendar, tasks, and contacts into local storage on a schedule.

An administrator must first register an OAuth application with the provider and set its client ID and secret, because a self-hosted instance has no shared application to use.
On Docker Compose they go in `docker-compose.override.yml`, as [the deployment guide](/docs/operations/deployment#deploy-with-docker-compose) shows.
[The configuration reference](/docs/reference/configuration) lists the variables, and the provider needs a stable HTTPS callback URL, which means a reverse proxy.

Once configured, each user links their own account:

1. Open **Settings**, then **Account**, and find **Connected Accounts**.
2. Select **Connect** next to Google or Microsoft, and approve the requested scopes at the provider.
3. CryoZen returns you to the application and starts the first sync immediately.

Apple works differently, because iCloud has no OAuth for mail: select **Connect Apple**, then enter your Apple ID and an app-specific password generated at [appleid.apple.com](https://support.apple.com/102654).
CryoZen verifies the password with a live login before storing it.

Each linked account shows one status chip per data type, with a count of mirrored items and the time of the last sync.
Selecting **Disconnect** revokes the token at the provider and deletes the local copy of that account's data.

CryoZen requests read-only scopes.
It never sends mail or writes calendar entries through a linked account.

## Sign in with a provider

Linking an account is about data.
Signing in with a provider is about identity, and it is configured separately.

An administrator sets client credentials for Google, Microsoft, or GitHub; on Docker Compose they go in `docker-compose.override.yml`, as [the deployment guide](/docs/operations/deployment#deploy-with-docker-compose) shows.
The login page then shows a button for each configured provider.

Because CryoZen defaults to a closed signup policy, a provider identity cannot create an account on its own.
Link it to an existing account first:

1. Sign in with your password.
2. Open **Settings**, then **Account**, and find **Sign-in Methods**.
3. Select **Link** next to the provider, and approve at the provider.

From then on, that provider signs you straight in.
You can unlink at any time, unless it is the only sign-in method left on an account with no password.

## Connect other services

Two more surfaces connect to the outside world:

- **MCP servers**: add Model Context Protocol servers under **Settings**, then **MCP**, to give agents more tools. CryoZen supports stdio, server-sent events, and streamable HTTP transports, including servers that require OAuth.
- **Generic REST services**: connect an HTTP API such as Miniflux, Gitea, Linkding, Home Assistant, ntfy, or Vaultwarden under **Settings**, then **Integrations**, using the presets in the connections list.

## Check the health of everything at once

The integrations page lists every adapter with a live status.
Each card reports exactly one of these:

- **connected**: CryoZen reached the service and the credential was accepted.
- **not connected**: nothing is configured yet, which is a normal state, not an error.
- **auth failed**: the service rejected the credential. Check the key or password.
- **unreachable**: the service did not respond. Check the URL, the network, and whether the service is running.
- **rate limited**: the provider is throttling requests. Wait, then test again.

Statuses are cached for 60s, so the page stays responsive.
Selecting **Test** ignores the cache and probes immediately.

Every probe is read-only: it lists models or fetches one result, and never sends a message or writes data.

If a card reports something you cannot explain, [the troubleshooting guide](/docs/operations/troubleshooting) covers the common causes.

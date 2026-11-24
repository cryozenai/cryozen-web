---
title: "Call CryoZen from your own code"
source: "docs/guides/api-access.md"
ref: "v1.2.0"
commit: "f358e1dc7f53603abdf3f3d7ae2face02bd939ca"
---
# Call CryoZen from your own code

This guide walks you through calling a CryoZen instance from a script, a service, or an automation platform such as n8n or Make.
You will mint an API token, choose its scopes, send a chat request, handle the errors you can expect, and register an outbound webhook that pushes events back to you.
It assumes you already run an instance and can sign in as an administrator.
For the full surface, see [the API reference](/docs/reference/api).

## Mint a token

An API token is a bearer credential that identifies both a machine caller and the human who created it.
Minting requires an administrator account, and the raw token is shown once.

1. Sign in to your instance at `http://localhost:7000` as an administrator.
2. Open **Settings**, then select **Integrations** in the sidebar.
3. Add a **Codex Agent** or a **Claude Agent** connection, which posts to `/api/tokens` and mints a token named after the agent.
4. Press **Copy token** in the reveal panel before you close the form, because only the 8-character prefix is recoverable afterwards.
5. Toggle the switches under **Tool access** to set what the token may reach, since new tokens start with chat access alone.

You can also mint a token from the API, which is what an unattended provisioning script should do.
The endpoint takes a JSON body sent as `application/json`, answers any other body with 415, and requires an administrator session cookie.
The `scopes` field takes a comma-separated string or a list.
This call mints a token named `deploy_bot` with read and write access to todos:

```bash
curl -s -X POST http://localhost:7000/api/tokens \
  -b "cryozen_session=your_session_cookie_here" \
  -H "Content-Type: application/json" \
  -d '{"name": "deploy_bot", "scopes": ["todos:read", "todos:write"]}'
```

The response is the only place the raw token appears:

```json
{
  "id": "a1b2c3d4",
  "name": "deploy_bot",
  "owner": "your_username_here",
  "token": "ody_your_api_token_here",
  "token_prefix": "ody_your",
  "scopes": ["todos:read", "todos:write"]
}
```

A third path exists for LAN devices such as a phone.
Open `http://localhost:7000/api/assistant/pair` as an administrator and submit the form.
That mints a chat-scoped token and renders a pairing payload with a QR code.
Add `?format=json` to the POST to receive the host, port, and token as JSON instead.

## Choose scopes

A scope names one capability a token may use.
Pass them to `POST /api/tokens` as a comma-separated or space-separated string or as a list, and change them later with `PATCH /api/tokens/{token_id}`.

These are the scope values the server accepts:

- **`chat`**: call `POST /api/v1/chat`, and the default when you pass no scopes.
- **`todos:read`**: read notes and checklists through the agent bridge.
- **`todos:write`**: create, update, delete, and toggle todo items.
- **`documents:read`**: read living documents.
- **`documents:write`**: create and update documents.
- **`email:read`**: list and read messages.
- **`email:draft`**: create reply drafts without sending them.
- **`email:send`**: send mail directly.
- **`calendar:read`**: read calendar events.
- **`calendar:write`**: create and update calendar events.
- **`smarana:read`**: read long-term memory entries.
- **`smarana:write`**: write memory entries.

Write scopes imply their read counterpart.
The server inserts `todos:read` when you request `todos:write`, and does the same for documents, calendar, and memory, and inserts `email:read` when you request `email:draft`.
An unknown scope returns 400 with the offending value in the message.

Three named profiles bundle common sets, and you pass one as a `profile` JSON field instead of `scopes`:

- **`chat`**: `chat`.
- **`codex_todos`**: `todos:read` and `todos:write`.
- **`codex_email_drafts`**: `email:read`, `email:draft`, `documents:read`, and `documents:write`.

Fetch the authoritative list at any time, because it is generated from the same constants the validator uses:

```bash
curl -s http://localhost:7000/api/tokens/profiles \
  -b "cryozen_session=your_session_cookie_here"
```

Only two areas enforce scopes: `POST /api/v1/chat` checks for `chat`, and the `/api/codex` and `/api/claude` bridges check the relevant tool scope.
Everywhere else a token authenticates as the pseudo-user `api`, which owns no records, so it sees no other account's data.
Treat a token as a credential for the areas above, not as a filter on the rest of the API.

## Call the chat endpoint

`POST /api/v1/chat` sends one message and returns one complete reply.
It requires a bearer token with the `chat` scope, and it rejects cookie sessions with 403.

Start by confirming the instance is up and the version is one you support.
Neither call needs a credential:

```bash
curl -s http://localhost:7000/api/health
curl -s http://localhost:7000/api/version
```

Now send a message.
The example below supplies a provider key directly, which creates a fresh session without any endpoint configured on the server:

```bash
curl -s -X POST http://localhost:7000/api/v1/chat \
  -H "Authorization: Bearer ody_your_api_token_here" \
  -H "Content-Type: application/json" \
  -d '{
        "message": "List three reasons to run a readiness probe.",
        "model": "deepseek-chat",
        "provider": "deepseek",
        "api_key": "your_provider_api_key_here"
      }'
```

The reply carries the assistant text, the session identifier, and the model that answered:

```json
{
  "response": "It gates traffic, it surfaces broken dependencies, and it distinguishes liveness from readiness.",
  "session_id": "8f14e45f-ceea-467a-9c1e-1234567890ab",
  "model": "deepseek-chat"
}
```

Continue the conversation by passing that identifier back as `session`.
The server returns 404 unless the token owner matches the session owner exactly, so a token cannot resume someone else's chat:

```bash
curl -s -X POST http://localhost:7000/api/v1/chat \
  -H "Authorization: Bearer ody_your_api_token_here" \
  -H "Content-Type: application/json" \
  -d '{
        "message": "Now rank them by operational impact.",
        "session": "8f14e45f-ceea-467a-9c1e-1234567890ab"
      }'
```

You can omit `api_key`, `provider`, and `base_url` entirely.
The endpoint then falls back to the first enabled model endpoint that belongs to the token owner, and returns 400 when the owner has none.
Setting `"model": "auto"` on that path makes the server query the endpoint's model list and use the first identifier it returns.

## Handle errors

Errors arrive in two shapes.
The authentication middleware answers before any handler with `{"error": "..."}`, and route handlers answer with FastAPI's `{"detail": "..."}`.
Check the status code first, then read whichever key is present.

These are the failures to expect from `POST /api/v1/chat`:

- **401 with `{"error": "Invalid API token"}`**: the token is unknown, revoked, or malformed, so mint a new one.
- **401 with `{"error": "Not authenticated"}`**: you sent no bearer header and no valid session cookie.
- **403 with `detail` "This endpoint requires an API token"**: you authenticated with a cookie instead of a token.
- **403 with `detail` "API token is not scoped for chat"**: add the `chat` scope with `PATCH /api/tokens/{token_id}`.
- **400 with a `base_url` message**: the URL you passed resolves to a private or internal address, or uses a scheme other than `http` or `https`.
- **400 naming `base_url` and `provider`**: neither the provider name nor the model prefix resolved to a known provider.
- **404 with `detail` "Session not found"**: the session does not exist, or it belongs to another owner.
- **502 with `{"error": "LLM_SERVICE_ERROR", ...}`**: the upstream model provider failed.

Retry 502 and 503 with backoff.
Do not retry 400, 401, 403, or 404, because the input or the credential has to change first.
The upstream model call uses a 120s timeout, so set your client timeout above that.

## Receive outbound webhooks

A webhook pushes an event to a URL you control, so your service does not have to poll.
Registration is administrator-only, and the receiving URL must be publicly resolvable.

Register one by posting a JSON body sent as `application/json`, since any other body gets 415.
The `events` field takes a comma-separated string or a list, and `secret` is optional but recommended:

```bash
curl -s -X POST http://localhost:7000/api/webhooks \
  -b "cryozen_session=your_session_cookie_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "automation_bridge",
    "url": "https://hooks.your_domain_here/cryozen",
    "secret": "your_webhook_secret_here",
    "events": ["chat.completed", "chat.message", "session.created"]
  }'
```

Three events fire from normal use:

- **`session.created`**: a session was created, and the data holds `session_id`, `name`, and `model`.
- **`chat.message`**: a user message was accepted, and the data holds `session_id`, `model`, and `message` truncated to 2000 characters.
- **`chat.completed`**: an assistant reply finished, and the data holds `session_id`, `model`, `user_message`, and `response` truncated to 2000 characters.

A fourth event, `webhook.test`, is delivered only by `POST /api/webhooks/{webhook_id}/test`, which sends a fixed message so you can confirm your receiver works.
Any other event name is rejected at registration with 400.

Every delivery is a POST with a JSON body of three keys:

```json
{
  "event": "chat.completed",
  "timestamp": "2026-07-31T09:14:22.481920",
  "data": {
    "session_id": "8f14e45f-ceea-467a-9c1e-1234567890ab",
    "model": "deepseek-chat",
    "user_message": "List three reasons to run a readiness probe.",
    "response": "It gates traffic, it surfaces broken dependencies, and it distinguishes liveness from readiness."
  }
}
```

The request carries these headers:

- **`Content-Type`**: always `application/json`.
- **`User-Agent`**: always `CryoZen-Webhook/1.0`.
- **`X-CryoZen-Event`**: the event name, matching the `event` key in the body (a legacy duplicate event header from the project's previous name is also sent for older receivers).
- **`X-CryoZen-Signature`**: the hex HMAC-SHA256 of the raw body, present only when the webhook has a secret (a legacy duplicate signature header is also sent for older receivers).

Deliveries use a 10s timeout and do not follow redirects.
The result of each attempt is recorded on the webhook row, so `GET /api/webhooks` shows `last_triggered_at`, `last_status_code`, and `last_error`.

## Verify the signature

Compute the HMAC over the exact bytes you received, before any JSON parsing, because re-serializing changes whitespace and key order.
Compare with `hmac.compare_digest` so the comparison takes constant time and cannot leak the expected value through timing.

This function returns True when a delivery is authentic:

```python
import hashlib
import hmac


def verify_cryozen_signature(raw_body: bytes, signature: str, secret: str) -> bool:
    """Return True when raw_body was signed with secret."""
    if not signature:
        return False
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
```

Wire it into your receiver by reading the raw body and the header before you parse anything.
Reject the request with 401 when verification fails:

```python
from flask import Flask, request

app = Flask(__name__)
WEBHOOK_SECRET = "your_webhook_secret_here"


@app.post("/cryozen")
def receive():
    raw = request.get_data()
    signature = request.headers.get("X-CryoZen-Signature", "")
    if not verify_cryozen_signature(raw, signature, WEBHOOK_SECRET):
        return {"error": "bad signature"}, 401
    payload = request.get_json()
    return {"received": payload["event"]}, 200
```

A webhook registered without a secret arrives unsigned.
Treat unsigned deliveries as untrusted input, and prefer setting a secret on every webhook.

## Secure your tokens and endpoints

A token is a bearer credential: anyone holding the string can act as it, with no second factor and no origin check.
Handle it the way you handle a password.

Store tokens in a secret manager or an environment variable, never in source control.
CryoZen stores only a bcrypt hash and the first 8 characters of each token, so a database copy does not reveal a usable credential, and nobody can recover a lost token from the server.

Revoke a token the moment it leaks.
Deleting it takes effect on the next request, because the delete invalidates the middleware's token cache:

```bash
curl -s -X DELETE http://localhost:7000/api/tokens/a1b2c3d4 \
  -b "cryozen_session=your_session_cookie_here"
```

Run the instance behind a reverse proxy that terminates HTTPS whenever it is reachable off the host.
A bearer token travels in a header in cleartext over plain HTTP, and so does the session cookie unless you set `SECURE_COOKIES=true`.
Keep `LOCALHOST_BYPASS=false` in any networked deployment: the middleware already rejects proxy-forwarded requests as loopback, and leaving the bypass off removes the question entirely.
Both variables are described in [the configuration reference](/docs/reference/configuration).

Outbound requests are guarded against Server-Side Request Forgery (SSRF) in two places.
A webhook URL is validated at registration and again at delivery, so editing the database does not bypass the check, and redirects are not followed.
A `base_url` you pass to `POST /api/v1/chat` runs through the same class of check.

Both validators resolve the hostname and inspect every address record.
They reject loopback, private, link-local, reserved, multicast, unspecified, and carrier-grade NAT ranges, along with the hostnames `localhost`, `0.0.0.0`, `metadata`, and `metadata.google.internal`, and the `.local`, `.internal`, `.lan`, `.intranet`, and `.localhost` suffixes.
A hostname that fails to resolve is rejected rather than allowed.
Model endpoints an administrator configures in the interface are exempt, which is what lets a local Ollama or LAN inference server keep working.

## Related pages

Continue with these:

- [API reference](/docs/reference/api): every namespace, its authentication gate, status codes, and streaming formats.
- [Configuration reference](/docs/reference/configuration): `AUTH_ENABLED`, `LOCALHOST_BYPASS`, `SECURE_COOKIES`, `ALLOWED_ORIGINS`, and the rest.

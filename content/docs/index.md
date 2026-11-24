---
title: "CryoZen documentation"
source: "docs/README.md"
ref: "v1.2.0"
commit: "f358e1dc7f53603abdf3f3d7ae2face02bd939ca"
---
# CryoZen documentation

This is the map of everything written about CryoZen.
It is organized by what you are trying to do, so start from the section that matches your situation rather than reading top to bottom.

## Start here

If you have not run CryoZen yet:

- [Deployment guide](/docs/operations/deployment): deploy the published image with Docker Compose, and put an instance behind a reverse proxy.
- [Configuration reference](/docs/reference/configuration): every environment variable you can set, with its real default.

## Use the application

Task-oriented guides for the things people actually set up:

- [Integrations](/docs/guides/integrations): connect language models, search providers, mail, calendars, contacts, and linked Google, Microsoft, or Apple accounts.
- [Calling the API](/docs/guides/api-access): mint a scoped token, call CryoZen from your own code, and receive signed webhooks.

## Look something up

Reference pages describe a surface exhaustively, so you can quote them:

- [Configuration reference](/docs/reference/configuration): environment variables, grouped by concern.
- [API reference](/docs/reference/api): every route namespace, how authentication works, and the endpoints an external caller needs.
- [CLI reference](/docs/reference/cli): the `cryozen` command, its subcommands, and the operations scripts.

## Understand how it works

Read these when you need the model behind the behavior, not the steps:

- [Glossary](/docs/concepts/glossary): what each component is called and what it does.
- [Threat model](/security): trust boundaries, protections, and what is out of scope.

## When something breaks

- [Troubleshooting](/docs/operations/troubleshooting): symptoms, their causes, and the fix for each.
- [Upgrading](/docs/operations/upgrading): how to upgrade safely, including what carries over from installations that ran under the project's previous name.

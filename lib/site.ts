export const GITHUB_OWNER = "shreejitverma";
export const GITHUB_REPO = "cryozen";

export const site = {
  name: "CryoZen",
  domain: "cryozen.ai",
  url: "https://cryozen.ai",
  tagline: "Your AI workspace, on hardware you control.",
  description:
    "CryoZen is a self-hosted AI workspace: chat, autonomous agents with real tools, document search, and a mail, calendar, and contacts client in one application. Local models or your own API keys. No telemetry.",
  // TODO(cryozen): confirm this mailbox exists before the site goes live.
  contactEmail: "hello@cryozen.ai",
} as const;

export const githubUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;
export const releasesUrl = `${githubUrl}/releases`;
export const latestReleaseUrl = `${releasesUrl}/latest`;
export const docsUrl = `${githubUrl}/blob/main/docs/README.md`;
export const quickstartUrl = `${githubUrl}/blob/main/QUICKSTART_LOCAL.md`;
export const deploymentDocsUrl = `${githubUrl}/blob/main/docs/operations/deployment.md`;
export const configDocsUrl = `${githubUrl}/blob/main/docs/reference/configuration.md`;
export const issuesUrl = `${githubUrl}/issues`;
export const ghcrImage = `ghcr.io/${GITHUB_OWNER}/${GITHUB_REPO}`;

export const nav = [
  { href: "/download", label: "Download" },
  { href: "/pricing", label: "Pricing" },
  { href: "/changelog", label: "Changelog" },
  { href: docsUrl, label: "Docs", external: true },
] as const;

/**
 * Platform definitions for the download surface.
 *
 * Asset names must match what `.github/workflows/release.yml` in the product
 * repo uploads to each GitHub release - packaging/README.md there documents
 * this file as part of that contract. If a build script renames an artifact,
 * change it here too or the download button falls back to the releases page.
 *
 * Since the self-contained installers (product repo `packaging/`), every
 * desktop build bundles Python and all dependencies: nothing is required on
 * the user's machine, and user data lives in the platform's per-user data
 * directory, never inside the install.
 */
export type PlatformId = "macos" | "windows" | "linux" | "docker";

export interface Platform {
  id: PlatformId;
  name: string;
  /** Label used inside the primary call to action. */
  shortName: string;
  /** Release asset filename, or null for the Docker path (no asset). */
  assetName: string | null;
  fileLabel: string;
  summary: string;
  requirements: string[];
  steps: string[];
  /** Additional downloadable formats beyond the primary asset. */
  alternates?: { assetName: string; label: string }[];
}

export const platforms: Platform[] = [
  {
    id: "macos",
    name: "macOS",
    shortName: "macOS",
    assetName: "CryoZen.dmg",
    fileLabel: "Disk image (.dmg)",
    summary:
      "A self-contained app: drag to Applications and launch. The server starts locally and CryoZen opens in your browser.",
    requirements: [
      "macOS 13 Ventura or newer (Apple Silicon; Intel build below)",
      "Nothing else - Python is bundled",
    ],
    steps: [
      "Open CryoZen.dmg and drag CryoZen to Applications.",
      "Right-click CryoZen and choose Open the first time: the build is not code-signed yet, so Gatekeeper asks once.",
      "Your browser opens at http://127.0.0.1:7860 when the server is ready. Data lives in ~/Library/Application Support/CryoZen.",
    ],
    alternates: [{ assetName: "CryoZen-Intel.dmg", label: "Intel Macs (.dmg)" }],
  },
  {
    id: "windows",
    name: "Windows",
    shortName: "Windows",
    assetName: "CryoZen-Windows-Portable.zip",
    fileLabel: "Portable archive (.zip)",
    summary:
      "A self-contained folder: unzip anywhere and run CryoZen.exe. Nothing is installed system-wide.",
    requirements: ["Windows 10 or newer (64-bit)", "Nothing else - Python is bundled"],
    steps: [
      "Unzip CryoZen-Windows-Portable.zip and open the CryoZen folder.",
      "Run CryoZen.exe. SmartScreen asks once for unsigned builds: choose More info, then Run anyway.",
      "Your browser opens at http://127.0.0.1:7860 when the server is ready. Data lives in %LOCALAPPDATA%\\CryoZen.",
    ],
  },
  {
    id: "linux",
    name: "Linux",
    shortName: "Linux",
    assetName: "CryoZen-x86_64.AppImage",
    fileLabel: "AppImage (x86_64)",
    summary:
      "A single self-contained executable that runs on any distribution. Also available as .deb, .rpm, and a portable tarball.",
    requirements: ["A 64-bit distribution with glibc", "Nothing else - Python is bundled"],
    steps: [
      "Make it executable: chmod +x CryoZen-x86_64.AppImage",
      "Run it: ./CryoZen-x86_64.AppImage",
      "Your browser opens at http://127.0.0.1:7860 when the server is ready. Data lives in ~/.local/share/cryozen.",
    ],
    alternates: [
      { assetName: "cryozen_amd64.deb", label: ".deb (Debian, Ubuntu)" },
      { assetName: "cryozen.x86_64.rpm", label: ".rpm (Fedora, RHEL)" },
      { assetName: "CryoZen-Linux-Portable.tar.gz", label: "Portable .tar.gz" },
    ],
  },
  {
    id: "docker",
    name: "Docker",
    shortName: "Docker",
    assetName: null,
    fileLabel: "Container image",
    summary:
      "The recommended path for servers, GPUs, and anything long-running. Pins every dependency and survives host upgrades.",
    requirements: ["Docker with Compose v2", "A host you control"],
    steps: [
      "git clone https://github.com/shreejitverma/cryozen.git",
      "cd cryozen && cp .env.example .env",
      "docker compose up -d --build, then open http://localhost:7000",
    ],
  },
];

export const desktopPlatforms = platforms.filter((p) => p.id !== "docker");

export function getPlatform(id: PlatformId): Platform {
  const found = platforms.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown platform: ${id}`);
  return found;
}

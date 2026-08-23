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
      "If macOS says the app cannot be opened, right-click CryoZen, choose Open, then Open again: unsigned builds need this once. Signed and notarized builds open normally.",
      "Your browser opens at http://127.0.0.1:7860 when the server is ready. Data lives in ~/Library/Application Support/CryoZen.",
    ],
    alternates: [{ assetName: "CryoZen-Intel.dmg", label: "Intel Macs (.dmg)" }],
  },
  {
    id: "windows",
    name: "Windows",
    shortName: "Windows",
    assetName: "CryoZen-Setup-x64.exe",
    fileLabel: "Installer (.exe)",
    summary:
      "A standard installer: Program Files, a Start Menu shortcut, and an entry in Apps & Features. Prefer the portable zip to run from a folder without installing.",
    requirements: ["Windows 10 or newer (64-bit x64)", "Nothing else - Python is bundled"],
    steps: [
      "Run CryoZen-Setup-x64.exe and follow the prompts. Silent install for scripts: CryoZen-Setup-x64.exe /S",
      "If SmartScreen appears on an unsigned build, choose More info, then Run anyway. Signed builds do not prompt.",
      "Launch CryoZen from the Start Menu. Your browser opens at http://127.0.0.1:7860 when the server is ready. Data lives in %LOCALAPPDATA%\\CryoZen and survives uninstall.",
    ],
    alternates: [
      {
        assetName: "CryoZen-Windows-Portable.zip",
        label: "Portable .zip (no install: unzip and run CryoZen.exe)",
      },
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
      "The recommended path for servers, GPUs, and anything long-running. Pulls the published image (linux/amd64 and linux/arm64); no build step.",
    requirements: ["Docker with Compose v2", "A host you control"],
    steps: [
      "git clone https://github.com/shreejitverma/cryozen-releases.git",
      "cd cryozen-releases && cp .env.example .env",
      "docker compose up -d, then open http://localhost:7000",
    ],
  },
];

export const desktopPlatforms = platforms.filter((p) => p.id !== "docker");

export function getPlatform(id: PlatformId): Platform {
  const found = platforms.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown platform: ${id}`);
  return found;
}

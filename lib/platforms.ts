/**
 * Platform definitions for the download surface.
 *
 * Asset names must match what `.github/workflows/release.yml` in the product
 * repo uploads to each GitHub release. If a build script renames an artifact,
 * change it here too or the download button falls back to the releases page.
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
}

export const platforms: Platform[] = [
  {
    id: "macos",
    name: "macOS",
    shortName: "macOS",
    assetName: "CryoZen.dmg",
    fileLabel: "Disk image (.dmg)",
    summary:
      "A drag-to-Applications launcher app. Opening it starts the local server and opens CryoZen in an app window.",
    requirements: ["macOS 13 Ventura or newer", "Python 3.11 or newer"],
    steps: [
      "Open CryoZen.dmg and drag CryoZen to Applications.",
      "Launch CryoZen. The first run creates a virtual environment and installs dependencies, which takes a few minutes.",
      "The interface opens at http://127.0.0.1:7860 once the server is ready.",
    ],
  },
  {
    id: "windows",
    name: "Windows",
    shortName: "Windows",
    assetName: "CryoZen-Windows-Portable.zip",
    fileLabel: "Portable archive (.zip)",
    summary:
      "A portable folder with a launcher. Nothing is written outside the folder you unzip it into.",
    requirements: ["Windows 10 or newer (64-bit)", "Python 3.11 or newer on PATH"],
    steps: [
      "Unzip CryoZen-Windows-Portable.zip somewhere you can write to.",
      "Run the CryoZen launcher in that folder. The first run sets up the environment.",
      "The interface opens at http://127.0.0.1:7860 once the server is ready.",
    ],
  },
  {
    id: "linux",
    name: "Linux",
    shortName: "Linux",
    assetName: "CryoZen-Linux-Portable.tar.gz",
    fileLabel: "Portable archive (.tar.gz)",
    summary:
      "A portable directory with a shell launcher. Works on any distribution with Python available.",
    requirements: ["A 64-bit distribution with glibc", "Python 3.11 or newer, including python3-venv"],
    steps: [
      "Extract the archive: tar -xzf CryoZen-Linux-Portable.tar.gz",
      "Run ./CryoZen.sh inside the extracted directory. The first run sets up the environment.",
      "The interface opens at http://127.0.0.1:7860 once the server is ready.",
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

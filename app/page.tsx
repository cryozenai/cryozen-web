import {
  ClosingSection,
  Hero,
  InsideSection,
  PrivateSection,
  StartSection,
  TeamsSection,
  TourSection,
  type DownloadProps,
} from "@/components/home/sections";
import { SinglePlayback } from "@/components/home/single-playback";
import { dockerCommands, dockerPort } from "@/lib/platforms";
import { assetSizeFor, assetUrlByName, downloadUrlFor, getLatestRelease } from "@/lib/releases";

export const revalidate = 3600;

export default async function HomePage() {
  const latest = await getLatestRelease();

  const download: DownloadProps = {
    links: {
      macos: downloadUrlFor("macos", latest),
      windows: downloadUrlFor("windows", latest),
      linux: downloadUrlFor("linux", latest),
      docker: "/download#docker",
    },
    sizes: {
      macos: assetSizeFor("macos", latest),
      windows: assetSizeFor("windows", latest),
      linux: assetSizeFor("linux", latest),
    },
    intelHref: assetUrlByName("CryoZen-Intel.dmg", latest),
  };

  return (
    <>
      <SinglePlayback />
      <Hero releaseTag={latest.release?.tag ?? null} download={download} />
      <StartSection dockerPort={dockerPort} />
      <InsideSection />
      <PrivateSection />
      <TourSection />
      <TeamsSection />
      <ClosingSection
        download={download}
        checksumsHref={assetUrlByName("SHA256SUMS.txt", latest)}
        dockerCommands={dockerCommands}
        dockerPort={dockerPort}
      />
    </>
  );
}

import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#05080F",
          backgroundImage:
            "radial-gradient(1000px 500px at 50% -10%, rgba(127,242,255,0.25), transparent 70%)",
          color: "#C9D6E3",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <svg width="56" height="56" viewBox="0 0 32 32" fill="none">
            <path
              d="M16 1.5 30.5 16 16 30.5 1.5 16Z"
              stroke="#7FF2FF"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M16 8.5 23.5 16 16 23.5 8.5 16Z"
              stroke="#EAFCFF"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontSize: 30,
              letterSpacing: "0.2em",
              color: "#EAFCFF",
              fontWeight: 600,
            }}
          >
            CRYOZEN
          </span>
        </div>

        <div
          style={{
            marginTop: "56px",
            fontSize: 76,
            lineHeight: 1.05,
            color: "#EAFCFF",
            fontWeight: 600,
            maxWidth: "900px",
          }}
        >
          Your AI workspace. On hardware you control.
        </div>

        <div style={{ marginTop: "32px", fontSize: 30, color: "#7C8DA1", maxWidth: "880px" }}>
          Chat, agents, documents, mail, and calendar in one self-hosted application. No
          telemetry.
        </div>

        <div style={{ marginTop: "56px", fontSize: 26, color: "#4FE3E8" }}>{site.domain}</div>
      </div>
    ),
    size,
  );
}

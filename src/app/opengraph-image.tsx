import { ImageResponse } from "next/og";

// Edge runtime so the bundled .ttf assets load via fetch(new URL(...)).
export const runtime = "edge";

// The branded card shown when ramblebabble.com is shared. Uses the real fonts
// (Caveat Brush for "Babble" + "wildly wacky") so it matches the site logo.
export const alt =
  "RambleBabble: Ramble in. Brilliance out... sometimes wildly wacky.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GRADIENT = "linear-gradient(95deg,#7b5cff,#ff4d9d 55%,#ff6f61)";
const SCRIPT_GRADIENT = {
  backgroundImage: GRADIENT,
  backgroundClip: "text" as const,
  WebkitBackgroundClip: "text" as const,
  color: "transparent",
  fontFamily: "Caveat Brush",
};

export default async function OpengraphImage() {
  const [caveat, heavy] = await Promise.all([
    fetch(new URL("./CaveatBrush.ttf", import.meta.url)).then((r) =>
      r.arrayBuffer(),
    ),
    fetch(new URL("./HeavySans.ttf", import.meta.url)).then((r) =>
      r.arrayBuffer(),
    ),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0c0f",
          fontFamily: "HeavySans",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 12,
            backgroundImage: GRADIENT,
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            color: "#8f7bff",
            fontSize: 24,
            letterSpacing: 9,
            marginBottom: 24,
          }}
        >
          [ THE THOUGHT REFINERY ]
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ color: "#f3f5f7", fontSize: 124 }}>Ramble</span>
          <span
            style={{
              ...SCRIPT_GRADIENT,
              marginLeft: 22,
              fontSize: 176,
              transform: "rotate(-7deg)",
              paddingBottom: 20,
            }}
          >
            Babble
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            justifyContent: "center",
            marginTop: 34,
            width: 1060,
          }}
        >
          <span
            style={{ display: "flex", color: "#c7ccd4", fontSize: 40, marginRight: 16 }}
          >
            Ramble in. Brilliance out...
          </span>
          <span style={{ ...SCRIPT_GRADIENT, display: "flex", fontSize: 60 }}>
            sometimes wildly wacky.
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Caveat Brush", data: caveat, style: "normal", weight: 400 },
        { name: "HeavySans", data: heavy, style: "normal", weight: 900 },
      ],
    },
  );
}

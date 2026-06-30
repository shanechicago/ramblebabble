import { ImageResponse } from "next/og";

// The branded card that shows when ramblebabble.com is shared in a text,
// message, or social post.
export const alt =
  "RambleBabble: Ramble in. Brilliance out... sometimes wildly wacky.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GRADIENT = "linear-gradient(95deg,#7b5cff,#ff4d9d 55%,#ff6f61)";

export default function OpengraphImage() {
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
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* brand-gradient top bar */}
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

        {/* eyebrow */}
        <div
          style={{
            display: "flex",
            color: "#8f7bff",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 9,
            marginBottom: 30,
          }}
        >
          [ THE THOUGHT REFINERY ]
        </div>

        {/* wordmark */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              color: "#f3f5f7",
              fontSize: 128,
              fontWeight: 800,
              letterSpacing: -4,
            }}
          >
            Ramble
          </span>
          <span
            style={{
              marginLeft: 26,
              fontSize: 150,
              fontWeight: 800,
              fontStyle: "italic",
              transform: "rotate(-7deg)",
              backgroundImage: GRADIENT,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Babble
          </span>
        </div>

        {/* the original tagline */}
        <div
          style={{
            display: "flex",
            color: "#c7ccd4",
            fontSize: 42,
            fontWeight: 500,
            marginTop: 48,
            width: 1000,
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          Ramble in. Brilliance out... sometimes wildly wacky.
        </div>
      </div>
    ),
    { ...size },
  );
}

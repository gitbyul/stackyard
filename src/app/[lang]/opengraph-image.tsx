import { ImageResponse } from "next/og";

// Shared preview card for links to the site (built once at build time).
export const alt = "Stackyard: warehouse design studio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1a2e4c";
const SIGNAL = "#f9ad26";
const MUTED = "#616a75";

const MODULES = ["Movement analysis", "Layout studio", "Slotting", "Productivity", "Process maps"];

/** Stacked-pallet mark from the logo, drawn with plain boxes for Satori. */
function Mark() {
  const bar = (w: number, color: string) => (
    <div style={{ width: w, height: 22, borderRadius: 5, background: color, display: "flex" }} />
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      {bar(52, SIGNAL)}
      {bar(76, "#7f8ea6")}
      {bar(100, INK)}
    </div>
  );
}

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#fbfcfd",
          color: INK,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Mark />
            <div style={{ fontSize: 48, letterSpacing: -1 }}>Stackyard</div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: MUTED }}>Live demo · Next.js 16</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* The built-in font has one weight, so hierarchy comes from size. */}
          <div style={{ fontSize: 76, lineHeight: 1.05, letterSpacing: -2.5, maxWidth: 1000 }}>
            From order data to a warehouse you can walk through.
          </div>
          <div style={{ fontSize: 30, color: MUTED }}>Warehouse design studio for logistics consultants</div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {MODULES.map((m) => (
              <div
                key={m}
                style={{
                  display: "flex",
                  fontSize: 22,
                  padding: "10px 20px",
                  borderRadius: 999,
                  border: "2px solid #dde2e6",
                  background: "#ffffff",
                }}
              >
                {m}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}

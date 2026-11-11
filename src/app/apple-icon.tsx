import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The home-screen icon for iPhone and iPad, which do not accept SVG: the same design as public/icon.svg. */
export default function AppleIcon() {
  const ball = (left: number, top: number, d: number, background: string) => (
    <div style={{ display: "flex", position: "absolute", left, top, width: d, height: d, borderRadius: 9999, background }} />
  );
  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: "#0e7a42" }}>
        <div style={{ display: "flex", position: "absolute", left: 13, top: 13, width: 154, height: 154, borderRadius: 17, border: "8px solid #5a3a1e" }} />
        {ball(37, 37, 106, "#0a5a30")}
        {ball(54, 89, 32, "#f6f4ec")}
        {ball(95, 59, 32, "#c8201e")}
        {ball(105, 101, 21, "#17171a")}
      </div>
    ),
    size,
  );
}

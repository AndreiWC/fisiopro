import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 2,
            top: 7,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#0d9457",
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 12,
            top: 7,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#f2653c",
          }}
        />
      </div>
    ),
    { ...size }
  );
}

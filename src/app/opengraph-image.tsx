import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Encaixa — a agenda que se encaixa no seu negócio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          background: "linear-gradient(135deg, #0d9457 0%, #0b7a49 55%, #14201a 100%)",
          color: "#f4fbf6",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#f2653c",
            }}
          />
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>
            Encaixa
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.15,
            maxWidth: 920,
            letterSpacing: -1.5,
          }}
        >
          A agenda que se encaixa no seu negócio
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 36,
            fontSize: 30,
            color: "#d9ecdf",
            maxWidth: 820,
          }}
        >
          Agendamentos para barbearias, salões, clínicas de estética, fisioterapia, odontologia e consultórios médicos.
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

import { ImageResponse } from "next/og";
import type { GameId } from "@/core/game";
import { SITE_NAME } from "@/core/site";
import { getGame } from "@/games/registry";

/** Link-preview size used by Facebook, LinkedIn, X, WhatsApp, Slack and others. */
export const SHARE_SIZE = { width: 1200, height: 630 };

const INK = "#0b0f0d";
const IVORY = "#f0e9d8";
const MUTED = "#a9a28f";
const BRASS = "#d4a94e";

/** Boards drawn as a disc rather than a rectangle. */
const ROUND_BOARDS: GameId[] = ["crokinole"];

/** The game's own table in its starting position, turned on its side, drawn with plain boxes for ImageResponse. */
function TableDrawing({ gameId, width }: { gameId: GameId; width: number }) {
  const { game, theme } = getGame(gameId);
  const table = game.createTable();
  const bodies = game.createInitialBodies(table);
  const { surface } = theme;
  // The table's long side runs across the card: its y becomes x.
  const scale = width / table.length;
  const height = table.width * scale;
  const rail = Math.max(14, theme.frame * scale * 0.8);
  const round = ROUND_BOARDS.includes(gameId);
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: width + 2 * rail,
        height: height + 2 * rail,
        background: surface.rail,
        borderRadius: round ? 9999 : 18,
        boxShadow: "0 30px 60px rgba(0,0,0,0.55)",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: rail,
          top: rail,
          width,
          height,
          background: surface.cloth,
          borderRadius: round ? 9999 : 4,
          boxShadow: `inset 0 0 ${rail * 2}px ${surface.clothShade}`,
        }}
      />
      {table.pockets
        .filter((p) => !p.unmarked)
        .map((p) => {
          const r = Math.max(10, p.radius * scale * 1.1);
          return (
            <div
              key={p.id}
              style={{ display: "flex", position: "absolute", left: rail + p.position.y * scale - r, top: rail + p.position.x * scale - r, width: 2 * r, height: 2 * r, borderRadius: 9999, background: "#050505" }}
            />
          );
        })}
      {bodies.map((b) => {
        const r = Math.max(6, b.radius * scale * 1.5);
        return (
          <div
            key={b.id}
            style={{
              display: "flex",
              position: "absolute",
              left: rail + b.position.y * scale - r,
              top: rail + b.position.x * scale - r,
              width: 2 * r,
              height: 2 * r,
              borderRadius: 9999,
              background: theme.ballColour(b.id),
              boxShadow: "0 3px 5px rgba(0,0,0,0.45)",
            }}
          />
        );
      })}
    </div>
  );
}

/** A 1200 x 630 link preview: a title on the left, a game's table on the right. */
export function shareCard({ eyebrow, title, subtitle, gameId }: { eyebrow: string; title: string; subtitle: string; gameId: GameId }) {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: INK, color: IVORY, padding: "64px 56px 64px 72px", alignItems: "center", gap: 48 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, color: BRASS, letterSpacing: 4, textTransform: "uppercase" }}>
            <div style={{ display: "flex", width: 22, height: 22, borderRadius: 9999, background: "radial-gradient(circle at 35% 30%, #fff, #f0e9d8 40%, #a59a80)" }} />
            {eyebrow}
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 68, fontWeight: 700, lineHeight: 1.05 }}>{title}</div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 28, lineHeight: 1.35, color: MUTED }}>{subtitle}</div>
          <div style={{ display: "flex", marginTop: 36, fontSize: 24, color: IVORY }}>{`${SITE_NAME} · Free in your browser`}</div>
        </div>
        <TableDrawing gameId={gameId} width={430} />
      </div>
    ),
    SHARE_SIZE,
  );
}

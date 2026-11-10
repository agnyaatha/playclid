"use client";

import { usePathname } from "next/navigation";
import { findGame } from "@/games/registry";
import { TableLoader } from "./TableLoader";

/** The loading screen for a page: a cue game or a board game, matching the game in the address. */
export function RouteLoader({ label }: { label?: string }) {
  const entry = findGame(usePathname().split("/")[1] ?? "");
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <TableLoader shape={entry?.theme.shape} label={label} />
    </div>
  );
}

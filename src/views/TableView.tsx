"use client";

import { useCallback, type ComponentProps, type CSSProperties } from "react";
import { usePref } from "@/core/prefs/usePref";
import { Segmented } from "@/ui/kit";
import type { CameraMode } from "./3d/camera";
import { TableCanvas3D } from "./3d/TableCanvas3D";
import { TableCanvas } from "./2d/TableCanvas";

export type ViewMode = "2d" | "3d";

const isView = (v: unknown): v is ViewMode => v === "2d" || v === "3d";
const isCamera = (v: unknown): v is CameraMode => v === "auto" || v === "pov" || v === "top";

interface Props extends ComponentProps<typeof TableCanvas> {
  /** Change of aim in radians from dragging in the 3D behind-the-ball view. */
  onAimDelta?: (radians: number) => void;
}

/** The table in 2D or 3D, with its view controls floating over it. Either view takes the same props. */
export function TableView({ onAimDelta, ...props }: Props) {
  const [view, setView] = usePref<ViewMode>("view", "2d", isView);
  const [camera, setCamera] = usePref<CameraMode>("camera", "auto", isCamera);
  const fallBack = useCallback(() => setView("2d"), [setView]);
  const { table, theme } = props;
  const aspect = (table.length + 2 * theme.frame) / (table.width + 2 * theme.frame);

  return (
    <div className="table-box" style={{ "--table-aspect": aspect } as CSSProperties}>
      {view === "2d" ? <TableCanvas {...props} /> : <TableCanvas3D {...props} cameraMode={camera} onAimDelta={onAimDelta} onUnavailable={fallBack} />}
      <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-wrap items-center gap-2">
        <div className="pointer-events-auto">
          <Segmented
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: "2d", label: "2D" },
              { value: "3d", label: "3D" },
            ]}
          />
        </div>
        {view === "3d" && (
          <div className="pointer-events-auto">
            <Segmented
              label="Camera"
              value={camera}
              onChange={setCamera}
              options={[
                { value: "auto", label: "Auto" },
                { value: "pov", label: "Cue" },
                { value: "top", label: "Top" },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

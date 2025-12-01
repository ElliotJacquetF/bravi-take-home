"use client";

import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import { Pencil, Trash2 } from "lucide-react";
import type { TransferEdgeData } from "./types";

type ManhattanEdgeProps = EdgeProps;

function ManhattanEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  data,
}: ManhattanEdgeProps) {
  const edgeData = (data ?? {}) as TransferEdgeData;
  const offset = typeof edgeData.offset === "number" ? edgeData.offset : 0;
  const verticalOut = 28;
  const verticalIn = 28;
  const midX = (sourceX + targetX) / 2 + offset;
  const startY = sourceY + verticalOut;
  const endY = targetY - verticalIn;

  const edgePath = [
    `M ${sourceX} ${sourceY}`,
    `L ${sourceX} ${startY}`,
    `L ${midX} ${startY}`,
    `L ${midX} ${endY}`,
    `L ${targetX} ${endY}`,
    `L ${targetX} ${targetY}`,
  ].join(" ");

  const labelX = midX;
  const labelY = (startY + endY) / 2;

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
            zIndex: 50,
          }}
          className="flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-800 transition hover:border hover:border-slate-300 hover:bg-slate-50"
          onClick={() => edgeData.onEdit?.(id)}
          aria-label="Edit transfer trigger"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-800 transition hover:border hover:border-slate-300 hover:bg-slate-50"
          onClick={() => edgeData.onDelete?.(id)}
          aria-label="Delete transfer"
        >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const ManhattanEdge = memo(ManhattanEdgeComponent);

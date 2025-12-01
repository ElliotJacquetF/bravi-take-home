"use client";

import { memo } from "react";
import type { EdgeProps } from "@xyflow/react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";
import { Pencil, Trash2 } from "lucide-react";
import type { TransferEdgeData } from "@/lib/flowTypes";

type ButtonEdgeProps = EdgeProps<TransferEdgeData>;

function ButtonEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  markerStart,
  data,
}: ButtonEdgeProps) {
  const edgeData = data ?? {};
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const handleEdit = () => {
    console.log("edge edit click", { id, hasHandler: !!data?.onEdit, data });
    edgeData.onEdit?.(id);
  };
  const handleDelete = () => {
    console.log("edge delete click", { id, hasHandler: !!data?.onDelete, data });
    edgeData.onDelete?.(id);
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} markerStart={markerStart} style={style} />
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
            onClick={handleEdit}
            aria-label="Edit transfer trigger"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-800 transition hover:border hover:border-slate-300 hover:bg-slate-50"
            onClick={handleDelete}
            aria-label="Delete transfer"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const ButtonEdge = memo(ButtonEdgeComponent);

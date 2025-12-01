"use client";

import type { AssistantNodeData } from "@/lib/flowTypes";
import { cn } from "@/lib/utils";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { GripVertical, Trash2, Plus, Pencil } from "lucide-react";

type AssistantNodeProps = NodeProps<Node<AssistantNodeData>>;

export function AssistantNode({ data }: AssistantNodeProps) {
  const toolCount = data.tools.length;
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-4 shadow-sm transition-shadow relative",
        data.isActive ? "border-amber-300 ring-2 ring-amber-200 animate-pulse" : "border-slate-200"
      )}
    >
      <Handle
        id="source-top"
        type="source"
        position={Position.Top}
        className="!opacity-0"
      />
      <Handle
        id="source-bottom"
        type="source"
        position={Position.Bottom}
        className="!opacity-0"
      />
      <Handle
        id="target-top"
        type="target"
        position={Position.Top}
        className="!opacity-0"
      />
      <Handle
        id="target-bottom"
        type="target"
        position={Position.Bottom}
        className="!opacity-0"
      />
      {data.assistant.nonDeletable ? (
        <span className="absolute left-1/2 -top-3 -translate-x-1/2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
          Main
        </span>
      ) : null}
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-slate-400" />
        <div className="flex-1">
          <h3 className="truncate text-sm font-medium text-slate-900">
            {data.assistant.name}
          </h3>
        </div>
        {data.assistant.nonDeletable ? null : (
          <button
            aria-label="Delete assistant"
            className="rounded-full p-1 text-slate-400 hover:text-slate-600"
            onClick={() => data.onDelete?.(data.assistant.id)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {toolCount === 0 ? (
          <span className="rounded-md border border-dashed border-slate-200 px-2 py-1 text-[11px] text-slate-500">
            No tools
          </span>
        ) : (
          data.tools.map((tool) => (
            <span
              key={tool.id}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium",
                "bg-slate-100 text-slate-700",
                data.inFlightToolId === tool.id || data.recentlyActiveToolId === tool.id
                  ? "ring-2 ring-amber-200 animate-pulse"
                  : ""
              )}
            >
              {tool.name}
            </span>
          ))
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:border-slate-300"
          onClick={() => data.onEdit?.(data.assistant.id)}
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
        <button
          className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:border-slate-300"
          onClick={() => data.onTransfers?.(data.assistant.id)}
        >
          <Plus className="h-3 w-3" />
          Transfer
        </button>
      </div>
    </div>
  );
}

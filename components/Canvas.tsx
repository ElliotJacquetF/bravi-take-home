"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  Node,
  ReactFlow,
  ReactFlowProvider,
  type Edge as FlowEdge,
  type EdgeTypes,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { getCurrentSquad, useAppStore } from "@/hooks/useStore";
import { AssistantNode } from "./AssistantNode";
import type { ToolDefinition } from "@/lib/types";
import { Pencil, Trash2 } from "lucide-react";
import { ButtonEdge } from "./edges/ButtonEdge";
import { ManhattanEdge } from "./edges/ManhattanEdge";

const nodeTypes = { assistant: AssistantNode };
const edgeTypes: EdgeTypes = {
  transfer: ButtonEdge,
  transferOrth: ManhattanEdge,
};

type Props = {
  onEdit: (id: string) => void;
  onTransfers: (id: string) => void;
  onEditEdge?: (edgeId: string, trigger: string) => void;
  onDeleteEdge?: (edgeId: string) => void;
  recentlyActiveToolId?: string | null;
  recentlyActiveAssistantId?: string | null;
};

export function Canvas({ onEdit, onTransfers, onEditEdge, onDeleteEdge, recentlyActiveToolId, recentlyActiveAssistantId }: Props) {
  return (
    <ReactFlowProvider>
      <CanvasInner
        onEdit={onEdit}
        onTransfers={onTransfers}
        onEditEdge={onEditEdge}
        onDeleteEdge={onDeleteEdge}
        recentlyActiveToolId={recentlyActiveToolId}
        recentlyActiveAssistantId={recentlyActiveAssistantId}
      />
    </ReactFlowProvider>
  );
}

function CanvasInner({ onEdit, onTransfers, onEditEdge, onDeleteEdge, recentlyActiveToolId, recentlyActiveAssistantId }: Props) {
  const squad = useAppStore((state) => getCurrentSquad(state));
  const assistants = squad?.assistants ?? [];
  const tools = squad?.toolLibrary ?? [];
  const runtime = squad?.runtime ?? {
    activeAssistantId: "",
    waitingAssistant: false,
    inFlightToolId: null,
    inTransferEdgeId: null,
    error: null,
  };
  const edges = squad?.edges ?? [];
  const addEdgeToStore = useAppStore((state) => state.addEdge);
  const removeAssistant = useAppStore((state) => state.removeAssistant);
  const setNodePosition = useAppStore((state) => state.setNodePosition);

  const nodes = useMemo<Node[]>(() => {
    return assistants.map((assistant, idx) => {
      const attachedTools: ToolDefinition[] = assistant.toolIds
        .map((id) => tools.find((t) => t.id === id))
        .filter(Boolean) as ToolDefinition[];
      const pos = squad?.nodePositions?.[assistant.id] ?? { x: 180 + idx * 220, y: 100 + idx * 60 };
      return {
        id: assistant.id,
        type: "assistant",
        position: pos,
        data: {
          assistant,
          tools: attachedTools,
          isActive:
            runtime.activeAssistantId === assistant.id &&
            (runtime.waitingAssistant || runtime.inFlightToolId !== null || recentlyActiveAssistantId === assistant.id),
          inFlightToolId: runtime.inFlightToolId,
          onEdit,
          onTransfers,
          onDelete: removeAssistant,
          recentlyActiveToolId,
        },
      };
    });
  }, [assistants, tools, runtime.activeAssistantId, runtime.inFlightToolId, runtime.waitingAssistant, onEdit, onTransfers, recentlyActiveToolId, recentlyActiveAssistantId]);

  const flowEdges: FlowEdge[] = useMemo(
    () =>
      edges.map((e) => {
        const sourceHandle = "source-bottom";
        const targetHandle = "target-top";
        // Offset reciprocal edges to avoid overlapping paths
        const hasReverse = edges.some((other) => other.source === e.target && other.target === e.source);
        const offset = hasReverse ? (e.source < e.target ? 35 : -35) : 0;
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle,
          targetHandle,
          type: "transferOrth",
          animated: false,
          markerEnd: { type: "arrowclosed" },
          data: {
            onEdit: () => {
              console.log("Canvas onEditEdge dispatch", { edgeId: e.id, trigger: e.trigger, hasProp: !!onEditEdge });
              onEditEdge?.(e.id, e.trigger);
            },
            onDelete: () => {
              console.log("Canvas onDeleteEdge dispatch", { edgeId: e.id, hasProp: !!onDeleteEdge });
              onDeleteEdge?.(e.id);
            },
            offset,
          },
          style: {
            stroke: "#4b5563",
            strokeWidth: 2,
            opacity: 0.9,
          },
        } as FlowEdge;
      }),
    [edges, onDeleteEdge, onEditEdge]
  );

  const handleNodesChange = (changes: NodeChange[]) => {
    changes.forEach((change) => {
      if (change.type === "position" && change.position) {
        setNodePosition(change.id, change.position.x, change.position.y);
      }
    });
  };

  if (!squad) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-600">
        Select or create a squad to start.
      </div>
    );
  }

  return (
    <div className="h-full">
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        defaultEdgeOptions={{
          type: "transferOrth",
          animated: false,
          markerEnd: { type: "arrowclosed" },
          style: { stroke: "#4b5563", strokeWidth: 2, opacity: 0.9 },
        }}
        onNodesChange={handleNodesChange}
        onConnect={(params) => {
          if (!params.source || !params.target) return;
          addEdgeToStore({
            id: `${params.source}-${params.target}-${Date.now()}`,
            source: params.source,
            target: params.target,
            trigger: "Describe when to transfer.",
          });
        }}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={12} color="#e5e7eb" />
        <div className="absolute bottom-3 left-3 z-10 rounded-full border border-slate-200 bg-white/90 shadow-sm">
          <Controls showInteractive={false} position="bottom-left" />
        </div>
      </ReactFlow>
    </div>
  );
}

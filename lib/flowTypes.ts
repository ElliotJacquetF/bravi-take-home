import type { Assistant, ToolDefinition } from "./types";

export type AssistantNodeData = {
  assistant: Assistant;
  tools: ToolDefinition[];
  isActive: boolean;
  inFlightToolId?: string | null;
  onEdit?: (id: string) => void;
  onTransfers?: (id: string) => void;
  onDelete?: (id: string) => void;
  recentlyActiveToolId?: string | null;
};

export type TransferEdgeData = {
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  offset?: number;
};

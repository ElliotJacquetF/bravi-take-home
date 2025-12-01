export type ToolKind = "math" | "english" | "customApi" | "planner" | "code";

export type ToolSchema = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict?: boolean;
};

export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  kind: ToolKind;
  schema: ToolSchema;
  config?: Record<string, unknown>;
};

export type ToolExecutionResult = {
  output: string;
  error?: string;
};
export type ToolExecutor = (
  args: Record<string, unknown>,
  config?: Record<string, unknown>
) => Promise<ToolExecutionResult>;

export type Assistant = {
  id: string;
  name: string;
  systemPrompt: string;
  toolIds: string[];
  nonDeletable?: boolean;
};

export type AssistantEdge = {
  id: string;
  source: string;
  target: string;
  trigger: string;
};

export type NodePositions = Record<
  string,
  {
    x: number;
    y: number;
  }
>;

export type ToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type ToolResult = {
  callId: string;
  output: string;
};

export type TransferEvent = {
  fromId: string;
  toId: string;
  reason?: string;
};

export type ConversationTurn =
  | {
      id: string;
      role: "user" | "assistant";
      content: string;
    }
  | {
      id: string;
      role: "plan";
      content: string;
    }
  | {
      id: string;
      role: "tool";
      content: string;
      toolCall: ToolCall;
    }
  | {
      id: string;
      role: "tool_result";
      content: string;
      toolResult: ToolResult;
    }
  | {
      id: string;
      role: "transfer";
      content: string;
      transfer: TransferEvent;
    };

export type RuntimeState = {
  activeAssistantId: string;
  waitingAssistant: boolean;
  inFlightToolId: string | null;
  error: string | null;
  inTransferEdgeId?: string | null;
};

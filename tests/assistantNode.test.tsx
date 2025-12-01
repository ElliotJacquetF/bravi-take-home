import { render, screen } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { AssistantNode } from "@/components/AssistantNode";
import type { Assistant, ToolDefinition } from "@/lib/types";

const baseAssistant: Assistant = {
  id: "main",
  name: "Main Assistant",
  systemPrompt: "Prompt",
  toolIds: [],
  nonDeletable: true,
};

const tool: ToolDefinition = {
  id: "addition",
  name: "addition",
  description: "add",
  kind: "math",
  schema: { type: "function", name: "addition", description: "", parameters: {}, strict: true },
};

describe("AssistantNode", () => {
  it("renders assistant name and tool badges", () => {
    render(
      <ReactFlowProvider>
        <AssistantNode
          id="1"
          type="assistant"
          data={{ assistant: baseAssistant, tools: [tool], isActive: true }}
          selected={false}
          dragging={false}
          dragHandle={undefined}
          isConnectable={false}
          zIndex={0}
          xPos={0}
          yPos={0}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          events={{}}
        />
      </ReactFlowProvider>
    );
    expect(screen.getByText("Main Assistant")).toBeInTheDocument();
    expect(screen.getByText("addition")).toBeInTheDocument();
    expect(screen.getAllByText("Main")).toHaveLength(1);
  });
});

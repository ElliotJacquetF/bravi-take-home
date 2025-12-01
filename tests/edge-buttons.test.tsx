import { render, fireEvent } from "@testing-library/react";
import { ReactFlowProvider, Position } from "@xyflow/react";
import { ButtonEdge } from "@/components/edges/ButtonEdge";

describe("ButtonEdge", () => {
  it("calls edit and delete handlers when buttons are clicked", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const labelRoot = document.createElement("div");
    labelRoot.className = "react-flow__edgelabel-renderer";
    document.body.appendChild(labelRoot);

    const { getByLabelText } = render(
      <ReactFlowProvider>
        <svg>
          <ButtonEdge
            id="e-1"
            source="a"
            target="b"
            sourceX={0}
            sourceY={0}
            targetX={100}
            targetY={100}
            sourcePosition={Position.Bottom}
            targetPosition={Position.Top}
            style={{}}
            data={{ onEdit, onDelete }}
          />
        </svg>
      </ReactFlowProvider>
    );

    fireEvent.click(getByLabelText("Edit transfer trigger"));
    fireEvent.click(getByLabelText("Delete transfer"));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
import { vi } from "vitest";

vi.mock("@xyflow/react", async () => {
  const actual = await vi.importActual<typeof import("@xyflow/react")>("@xyflow/react");
  return {
    ...actual,
    EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

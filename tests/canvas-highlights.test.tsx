import { act, render, screen } from "@testing-library/react";
import { Canvas } from "@/components/Canvas";
import { appStore, getCurrentSquad } from "@/hooks/useStore";

describe("Canvas highlights", () => {
  beforeEach(() => {
    appStore.getState().resetStore();
  });

  it("highlights assistant only when active/waiting/in-flight/recent", () => {
    render(
      <Canvas
        onEdit={() => {}}
        onTransfers={() => {}}
        recentlyActiveToolId={null}
        recentlyActiveAssistantId={null}
      />
    );
    const node = screen.getByText("Main Assistant").closest(".react-flow__node");
    expect(node?.className).not.toContain("ring-amber");
    act(() => {
      appStore.getState().setWaitingAssistant(true);
    });
    const nodeActive = screen.getByText("Main Assistant").closest(".react-flow__node");
    const card = nodeActive?.querySelector("div.rounded-2xl");
    expect(card?.className ?? "").toContain("ring-amber-200");
  });

  it("highlights tool badge when in-flight tool matches", () => {
    const mainId = getCurrentSquad(appStore.getState())!.runtime.activeAssistantId;
    const tool = getCurrentSquad(appStore.getState())!.toolLibrary.find((t) => t.id === "addition")!;
    appStore.getState().attachToolToAssistant(mainId, tool);
    render(
      <Canvas
        onEdit={() => {}}
        onTransfers={() => {}}
        recentlyActiveToolId={"addition"}
        recentlyActiveAssistantId={null}
      />
    );
    const badge = screen.getByText("addition");
    expect(badge.className).toContain("ring-amber");
  });
});

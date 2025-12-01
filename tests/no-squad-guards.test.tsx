import { render } from "@testing-library/react";
import { ChatPanel } from "@/components/ChatPanel";
import { Canvas } from "@/components/Canvas";
import { appStore } from "@/hooks/useStore";

describe("guards when no squad is selected", () => {
  beforeEach(() => {
    appStore.setState((state) => ({ ...state, squads: [], currentSquadId: null }));
  });

  it("ChatPanel renders nothing without a squad", () => {
    const { container } = render(<ChatPanel />);
    expect(container.innerHTML).toBe("");
  });

  it("Canvas shows empty state when no squad", () => {
    const { getByText } = render(
      <Canvas
        onEdit={() => {}}
        onTransfers={() => {}}
        recentlyActiveToolId={null}
        recentlyActiveAssistantId={null}
      />
    );
    expect(getByText(/Select or create a squad/)).toBeInTheDocument();
  });
});

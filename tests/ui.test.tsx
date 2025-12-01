import { act, render, screen, fireEvent, within } from "@testing-library/react";
import { afterEach } from "vitest";
import { appStore } from "@/hooks/useStore";
import { Sidebar } from "@/components/Sidebar";
import { ToolLibrary } from "@/components/ToolLibrary";

afterEach(() => {
  appStore.getState().resetStore();
});

describe("Sidebar and ToolLibrary integration", () => {
  it("updates prompt via Sidebar textarea", () => {
    render(<Sidebar />);
    const textarea = screen.getByRole("textbox");
    act(() => {
      fireEvent.change(textarea, { target: { value: "New system prompt" } });
    });
    expect((textarea as HTMLTextAreaElement).value).toBe("New system prompt");
  });

  it("attaches and detaches tools via ToolLibrary", () => {
    render(<ToolLibrary />);
    const additionBtn = screen.getByText("addition");
    act(() => {
      fireEvent.click(additionBtn);
    });
    expect(screen.getAllByText(/Attached/).length).toBeGreaterThan(0);
    act(() => {
      fireEvent.click(additionBtn);
    });
    const additionButtonEl = screen.getByText("addition").closest("button");
    expect(additionButtonEl).toBeTruthy();
    if (additionButtonEl) {
      expect(within(additionButtonEl).queryByText(/Attached/)).toBeNull();
    }
  });
});

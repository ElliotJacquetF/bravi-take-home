import { act, render, screen, fireEvent, within } from "@testing-library/react";
import { afterEach } from "vitest";
import { appStore } from "@/hooks/useStore";
import { Sidebar } from "@/components/Sidebar";
import { ToolLibrary } from "@/components/ToolLibrary";

afterEach(() => {
  act(() => appStore.getState().resetStore());
});

describe("Sidebar and ToolLibrary integration", () => {
  it("updates prompt via Sidebar textarea", async () => {
    render(<Sidebar />);
    const textarea = screen.getByRole("textbox");
    await act(async () => {
      await fireEvent.change(textarea, { target: { value: "New system prompt" } });
    });
    expect((textarea as HTMLTextAreaElement).value).toBe("New system prompt");
  });

  it("attaches and detaches tools via ToolLibrary", async () => {
    render(<ToolLibrary />);
    const additionBtn = screen.getByText("addition");
    await act(async () => {
      await fireEvent.click(additionBtn);
    });
    expect(screen.getAllByText(/Attached/).length).toBeGreaterThan(0);
    await act(async () => {
      await fireEvent.click(additionBtn);
    });
    const additionButtonEl = screen.getByText("addition").closest("button");
    expect(additionButtonEl).toBeTruthy();
    if (additionButtonEl) {
      expect(within(additionButtonEl).queryByText(/Attached/)).toBeNull();
    }
  });
});

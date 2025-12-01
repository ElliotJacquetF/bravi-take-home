import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { ChatPanel } from "@/components/ChatPanel";
import { appStore } from "@/hooks/useStore";

vi.mock("@/lib/llm/openai", () => ({
  runOpenAIChat: vi.fn().mockResolvedValue({
    choices: [{ message: { role: "assistant", content: "Hello!" } }],
  }),
}));

afterEach(() => {
  act(() => appStore.getState().resetStore());
});

describe("ChatPanel", () => {
  it("adds user messages and clears input", async () => {
    render(<ChatPanel />);
    const input = screen.getByPlaceholderText("Type a message...");
    await act(async () => {
      fireEvent.change(input, { target: { value: "Hello" } });
      // Provide a fake API key to bypass the required check
      fireEvent.change(screen.getByPlaceholderText("OpenAI API key (stored locally)"), {
        target: { value: "test-key" },
      });
      await fireEvent.click(screen.getByText("Send"));
    });
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("shows empty state", () => {
    render(<ChatPanel />);
    expect(screen.getByText("No messages yet.")).toBeInTheDocument();
  });
});

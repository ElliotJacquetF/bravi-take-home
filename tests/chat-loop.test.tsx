import { render, screen, act, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { ChatPanel } from "@/components/ChatPanel";
import { appStore, getCurrentSquad } from "@/hooks/useStore";
import { runOpenAIChat } from "@/lib/llm/openai";

vi.mock("@/lib/llm/openai", () => ({
  runOpenAIChat: vi.fn(),
}));

describe("Chat loop tool call", () => {
  beforeEach(() => {
    (runOpenAIChat as any).mockReset();
    (runOpenAIChat as any)
      // call 1: assistant triggers addition directly
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                { id: "call-1", type: "function", function: { name: "addition", arguments: '{"a":2,"b":3}' } },
              ],
            },
          },
        ],
      })
      // call 2: final text
      .mockResolvedValueOnce({
        choices: [{ message: { role: "assistant", content: "Result is 5" } }],
      });
    appStore.getState().resetStore();
    const mainId = getCurrentSquad(appStore.getState())!.runtime.activeAssistantId;
    const tool = getCurrentSquad(appStore.getState())!.toolLibrary.find((t) => t.id === "addition")!;
    appStore.getState().attachToolToAssistant(mainId, tool);
  });

  it("logs tool call and final answer", async () => {
    render(<ChatPanel />);
    const input = screen.getByPlaceholderText("Type a message...");
    // set key
    await act(async () => {
      const keyInput = screen.getByPlaceholderText("OpenAI API key (stored locally)");
      fireEvent.change(keyInput, { target: { value: "test-key" } });
    });
    await act(async () => {
      fireEvent.change(input, { target: { value: "hi" } });
      fireEvent.click(screen.getByText("Send"));
    });
    expect(await screen.findByText(/Tool call: addition/)).toBeInTheDocument();
    expect(await screen.findByText(/Tool result/)).toBeInTheDocument();
    expect(await screen.findByText("Result is 5")).toBeInTheDocument();
  });

  it("handles transfer to another assistant", async () => {
    const runMock = runOpenAIChat as any;
    runMock.mockReset();
    runMock
      // call 1: main transfers
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "transfer-call",
                  type: "function",
                  function: { name: "transfer_to_math", arguments: '{"reason":"math question"}' },
                },
              ],
            },
          },
        ],
      })
      // call 2: math calls addition
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "math-call",
                  type: "function",
                  function: { name: "addition", arguments: '{"a":1,"b":2}' },
                },
              ],
            },
          },
        ],
      })
      // call 3: math final
      .mockResolvedValueOnce({
        choices: [{ message: { role: "assistant", content: "Done" } }],
      });

    // add math assistant and edge
    appStore.getState().addAssistant({ id: "math", name: "Math Assistant", systemPrompt: "math", toolIds: [] });
    const tool = getCurrentSquad(appStore.getState())!.toolLibrary.find((t) => t.id === "addition")!;
    appStore.getState().attachToolToAssistant("math", tool);
    appStore.getState().addEdge({
      id: "main-math",
      source: "main",
      target: "math",
      trigger: "Transfer math questions to Math Assistant.",
    });

    render(<ChatPanel />);
    const input = screen.getByPlaceholderText("Type a message...");
    await act(async () => {
      const keyInput = screen.getByPlaceholderText("OpenAI API key (stored locally)");
      fireEvent.change(keyInput, { target: { value: "test-key" } });
    });
    await act(async () => {
      fireEvent.change(input, { target: { value: "route" } });
      fireEvent.click(screen.getByText("Send"));
    });

    expect(await screen.findByText(/Transfer: main → math/)).toBeInTheDocument();
    expect(await screen.findByText(/Tool call: addition/)).toBeInTheDocument();
    const results = await screen.findAllByText(/Tool result/);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText("Done")).toBeInTheDocument();
    expect(getCurrentSquad(appStore.getState())?.runtime.activeAssistantId).toBe("math");
  });

  it("shows plan text and transfer tool call from the same response", async () => {
    const runMock = runOpenAIChat as any;
    runMock.mockReset();
    runMock
      // call 1: main triggers planner tool
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "planner-1",
                  type: "function",
                  function: {
                    name: "planner",
                    arguments:
                      '{"query":"use planner","assistants":[{"id":"main","name":"Main","triggers":[],"tools":[]}],"context":""}',
                  },
                },
              ],
            },
          },
        ],
      })
      // call 2: planner LLM output
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: '{"steps":[{"id":"1","assistant":"math","question":"do math","notes":""}]}',
            },
          },
        ],
      })
      // call 3: main transfers based on plan
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "transfer-plan",
                  type: "function",
                  function: { name: "transfer_to_math", arguments: '{"reason":"math needed"}' },
                },
              ],
            },
          },
        ],
      })
      // call 4: math does work
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: "Handled by math",
            },
          },
        ],
      });

    appStore.getState().addAssistant({ id: "math", name: "Math Assistant", systemPrompt: "math", toolIds: [] });
    appStore.getState().addEdge({
      id: "main-math",
      source: "main",
      target: "math",
      trigger: "Transfer math questions to Math Assistant.",
    });

    render(<ChatPanel />);
    const input = screen.getByPlaceholderText("Type a message...");
    await act(async () => {
      const keyInput = screen.getByPlaceholderText("OpenAI API key (stored locally)");
      fireEvent.change(keyInput, { target: { value: "test-key" } });
    });
    await act(async () => {
      fireEvent.change(input, { target: { value: "run plan" } });
      fireEvent.click(screen.getByText("Send"));
    });

    const plans = await screen.findAllByText(/steps/);
    expect(plans.length).toBeGreaterThan(0);
    expect(await screen.findByText(/Transfer: main → math/)).toBeInTheDocument();
    expect(await screen.findByText("Handled by math")).toBeInTheDocument();
    expect(getCurrentSquad(appStore.getState())?.runtime.activeAssistantId).toBe("math");
  });
});

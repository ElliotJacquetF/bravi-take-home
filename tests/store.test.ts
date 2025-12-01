import { createTestStore, getCurrentSquad } from "@/hooks/useStore";

describe("store (multi-assistant ready)", () => {
  it("attaches and detaches tools for the main assistant", () => {
    const store = createTestStore();
    const squad = getCurrentSquad(store.getState())!;
    const mainId = squad.runtime.activeAssistantId;
    const tool = {
      id: "addition",
      name: "addition",
      description: "",
      kind: "math",
      schema: { type: "function", name: "addition", description: "", parameters: {}, strict: true },
    };
    store.getState().attachToolToAssistant(mainId, tool);
    expect(getCurrentSquad(store.getState())?.assistants.find((a) => a.id === mainId)?.toolIds).toContain("addition");
    store.getState().detachToolFromAssistant(mainId, "addition");
    expect(getCurrentSquad(store.getState())?.assistants.find((a) => a.id === mainId)?.toolIds).not.toContain("addition");
  });

  it("updates prompt", () => {
    const store = createTestStore();
    const mainId = getCurrentSquad(store.getState())!.runtime.activeAssistantId;
    store.getState().setAssistantPrompt(mainId, "New prompt");
    expect(getCurrentSquad(store.getState())?.assistants.find((a) => a.id === mainId)?.systemPrompt).toBe("New prompt");
  });

  it("resets conversation", () => {
    const store = createTestStore();
    store.getState().addConversationTurn({ id: "1", role: "user", content: "hi" });
    store.getState().resetConversation();
    expect(getCurrentSquad(store.getState())?.conversation).toHaveLength(0);
  });

  it("resets store", () => {
    const store = createTestStore();
    const mainId = getCurrentSquad(store.getState())!.runtime.activeAssistantId;
    const basePrompt = getCurrentSquad(store.getState())?.assistants.find((a) => a.id === mainId)?.systemPrompt;
    store.getState().setAssistantPrompt(mainId, "Changed");
    store.getState().resetStore();
    expect(getCurrentSquad(store.getState())?.assistants.find((a) => a.id === mainId)?.systemPrompt).toBe(basePrompt);
  });
});

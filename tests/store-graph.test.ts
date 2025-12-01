import { createTestStore, getCurrentSquad } from "@/hooks/useStore";

describe("store graph behaviors", () => {
  it("adds and removes assistants, respecting nonDeletable main", () => {
    const store = createTestStore();
    const mainId = getCurrentSquad(store.getState())!.runtime.activeAssistantId;
    store.getState().addAssistant({ id: "math", name: "Math", systemPrompt: "math", toolIds: [] });
    expect(getCurrentSquad(store.getState())?.assistants.find((a) => a.id === "math")).toBeTruthy();
    store.getState().removeAssistant(mainId);
    expect(getCurrentSquad(store.getState())?.assistants.find((a) => a.id === mainId)).toBeTruthy();
    store.getState().removeAssistant("math");
    expect(getCurrentSquad(store.getState())?.assistants.find((a) => a.id === "math")).toBeFalsy();
  });

  it("adds and removes edges, avoiding duplicates", () => {
    const store = createTestStore();
    store.getState().addEdge({ id: "e1", source: "main", target: "other", trigger: "t" });
    store.getState().addEdge({ id: "e1", source: "main", target: "other", trigger: "t" });
    expect(getCurrentSquad(store.getState())?.edges.filter((e) => e.id === "e1")).toHaveLength(1);
    store.getState().removeEdge("e1");
    expect(getCurrentSquad(store.getState())?.edges.find((e) => e.id === "e1")).toBeFalsy();
  });

  it("can add template-like edges", () => {
    const store = createTestStore();
    store.getState().addAssistant({ id: "math", name: "Math", systemPrompt: "math", toolIds: [] });
    store.getState().addEdge({ id: "main-math", source: "main", target: "math", trigger: "t" });
    expect(getCurrentSquad(store.getState())?.edges.find((e) => e.id === "main-math")).toBeTruthy();
  });

  it("switches active assistant only if it exists", () => {
    const store = createTestStore();
    const mainId = getCurrentSquad(store.getState())!.runtime.activeAssistantId;
    store.getState().addAssistant({ id: "english", name: "English", systemPrompt: "english", toolIds: [] });
    store.getState().setActiveAssistant("english");
    expect(getCurrentSquad(store.getState())?.runtime.activeAssistantId).toBe("english");
    store.getState().setActiveAssistant("missing");
    expect(getCurrentSquad(store.getState())?.runtime.activeAssistantId).toBe("english");
    store.getState().removeAssistant("english");
    expect(getCurrentSquad(store.getState())?.runtime.activeAssistantId).toBe(mainId);
  });

  it("merges new custom tools into library once", () => {
    const store = createTestStore();
    const mainId = getCurrentSquad(store.getState())!.runtime.activeAssistantId;
    const customTool = {
      id: "custom-1",
      name: "Custom",
      description: "desc",
      kind: "customApi",
      schema: { type: "function", name: "custom-1", description: "", parameters: {} },
    };
    store.getState().attachToolToAssistant(mainId, customTool);
    expect(getCurrentSquad(store.getState())?.toolLibrary.filter((t) => t.id === "custom-1")).toHaveLength(1);
    store.getState().attachToolToAssistant(mainId, customTool);
    expect(getCurrentSquad(store.getState())?.toolLibrary.filter((t) => t.id === "custom-1")).toHaveLength(1);
  });
});

import { createTestStore, getCurrentSquad } from "@/hooks/useStore";

const baseRuntime = {
  activeAssistantId: "main",
  waitingAssistant: false,
  inFlightToolId: null,
  error: null,
  inTransferEdgeId: null,
};

describe("squad management", () => {
  it("creates a new squad and makes it current", () => {
    const store = createTestStore();
    store.getState().createSquad({
      id: "new-squad",
      name: "New Squad",
      assistants: [
        { id: "main", name: "Main", systemPrompt: "prompt", toolIds: [], nonDeletable: true },
      ],
      edges: [],
      toolLibrary: [],
      conversation: [],
      runtime: { ...baseRuntime },
    });
    expect(store.getState().currentSquadId).toBe("new-squad");
    expect(getCurrentSquad(store.getState())?.name).toBe("New Squad");
  });

  it("deletes squads and clears current when none remain", () => {
    const store = createTestStore();
    const firstId = store.getState().currentSquadId;
    if (firstId) store.getState().deleteSquad(firstId);
    expect(store.getState().squads).toHaveLength(0);
    expect(store.getState().currentSquadId).toBeNull();
  });

  it("resetStore restores default squad and entrypoint", () => {
    const store = createTestStore();
    const original = store.getState().currentSquadId;
    store.getState().resetStore();
    expect(store.getState().currentSquadId).toBe(original);
    const squad = getCurrentSquad(store.getState());
    expect(squad?.assistants.find((a) => a.id === "main")).toBeTruthy();
    expect(squad?.runtime.activeAssistantId).toBe("main");
  });
});

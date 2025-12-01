// Global store with multi-squad support.
"use client";

import { createStore, type StateCreator } from "zustand/vanilla";
import { useStore } from "zustand";
import { buildCustomApiTool, prebuiltTools } from "@/lib/tools";
import type {
  Assistant,
  AssistantEdge,
  ConversationTurn,
  RuntimeState,
  ToolDefinition,
} from "@/lib/types";

export type Squad = {
  id: string;
  name: string;
  assistants: Assistant[];
  edges: AssistantEdge[];
  nodePositions?: Record<string, { x: number; y: number }>;
  toolLibrary: ToolDefinition[];
  conversation: ConversationTurn[];
  runtime: RuntimeState;
};

type StoreData = {
  squads: Squad[];
  currentSquadId: string | null;
  currentPlan: string | null;
};

type StoreActions = {
  setCurrentSquad: (id: string | null) => void;
  setPlan: (plan: string | null) => void;
  createSquad: (squad: Squad) => void;
  deleteSquad: (id: string) => void;
  setAssistantPrompt: (assistantId: string, prompt: string) => void;
  setAssistantName: (assistantId: string, name: string) => void;
  attachToolToAssistant: (assistantId: string, tool: ToolDefinition) => void;
  detachToolFromAssistant: (assistantId: string, toolId: string) => void;
  addAssistant: (assistant: Assistant) => void;
  removeAssistant: (assistantId: string) => void;
  addEdge: (edge: AssistantEdge) => void;
  removeEdge: (edgeId: string) => void;
  updateEdgeTrigger: (edgeId: string, trigger: string) => void;
  setActiveAssistant: (assistantId: string) => void;
  addConversationTurn: (turn: ConversationTurn) => void;
  setInFlightTool: (toolId: string | null) => void;
  setWaitingAssistant: (waiting: boolean) => void;
  setError: (err: string | null) => void;
  setTransferEdge: (edgeId: string | null) => void;
  setNodePosition: (assistantId: string, x: number, y: number) => void;
  resetConversation: () => void;
  resetStore: () => void;
};

export type StoreState = StoreData & StoreActions;

const mainRouterPrompt =
  `You are the entrypoint planner/router.
If the task is simple enough for a single specialist, transfer directly to that assistant.
If the task is complex or multi-step, call the planner tool once to draft a brief step-by-step plan with assigned assistants, then transfer to the first step's assistant.
Do not perform specialist work yourself. Avoid re-planning once a plan is set. Stay concise and action-oriented.`;

const mainAssistant: Assistant = {
  id: "main",
  name: "Main Assistant",
  systemPrompt: mainRouterPrompt,
  toolIds: ["planner"],
  nonDeletable: true,
};

const weatherTool = buildCustomApiTool(
  "weather",
  "get_weather",
  "http://localhost:5001/weather",
  "GET",
  { city: { type: "string" } }
);

const weatherAssistant: Assistant = {
  id: "weather",
  name: "Weather Assistant",
  systemPrompt:
    "You are the weather specialist. Fetch weather by city using get_weather. If a request is not weather-related or needs another domain, transfer to the Main Assistant. Do not answer out-of-domain queries.",
  toolIds: [weatherTool.id],
};

const initialSquad = (): Squad => ({
  id: "default-weather",
  name: "Main + Weather",
  assistants: [mainAssistant, weatherAssistant],
  edges: [
    { id: "main-weather", source: "main", target: "weather", trigger: "Transfer weather or forecast questions to Weather Assistant." },
  ],
  nodePositions: {
    main: { x: 320, y: 140 },
    weather: { x: 320, y: 380 },
  },
  toolLibrary: [...prebuiltTools, weatherTool],
  conversation: [],
  runtime: {
    activeAssistantId: mainAssistant.id,
    waitingAssistant: false,
    inFlightToolId: null,
    error: null,
    inTransferEdgeId: null,
  },
});

const createInitialData = (): StoreData => ({
  squads: [initialSquad()],
  currentSquadId: "default-weather",
  currentPlan: null,
});

const updateCurrentSquad = (
  state: StoreState,
  updater: (squad: Squad) => Squad
): StoreState => {
  if (!state.currentSquadId) return state;
  return {
    ...state,
    squads: state.squads.map((s) =>
      s.id === state.currentSquadId ? updater(s) : s
    ),
  };
};

const initializer: StateCreator<StoreState> = (set, _get) => ({
  ...createInitialData(),
  setCurrentSquad: (id) => set((state) => ({ ...state, currentSquadId: id })),
  setPlan: (plan) => set((state) => ({ ...state, currentPlan: plan })),
  createSquad: (squad) =>
    set((state) => ({ ...state, squads: [...state.squads, squad], currentSquadId: squad.id })),
  deleteSquad: (id) =>
    set((state) => {
      const remaining = state.squads.filter((s) => s.id !== id);
      const current = state.currentSquadId === id ? remaining[0]?.id ?? null : state.currentSquadId;
      return { ...state, squads: remaining, currentSquadId: current };
    }),
  setAssistantPrompt: (assistantId, prompt) =>
    set((state) =>
      updateCurrentSquad(state, (squad) => ({
        ...squad,
        assistants: squad.assistants.map((a) =>
          a.id === assistantId ? { ...a, systemPrompt: prompt } : a
        ),
      }))
    ),
  setAssistantName: (assistantId, name) =>
    set((state) =>
      updateCurrentSquad(state, (squad) => ({
        ...squad,
        assistants: squad.assistants.map((a) =>
          a.id === assistantId ? { ...a, name } : a
        ),
      }))
    ),
  attachToolToAssistant: (assistantId, tool) =>
    set((state) =>
      updateCurrentSquad(state, (squad) => {
        const assistants = squad.assistants.map((a) =>
          a.id === assistantId && !a.toolIds.includes(tool.id)
            ? { ...a, toolIds: [...a.toolIds, tool.id] }
            : a
        );
        const toolLibrary = squad.toolLibrary.some((t) => t.id === tool.id)
          ? squad.toolLibrary
          : [...squad.toolLibrary, tool];
        return { ...squad, assistants, toolLibrary };
      })
    ),
  detachToolFromAssistant: (assistantId, toolId) =>
    set((state) =>
      updateCurrentSquad(state, (squad) => ({
        ...squad,
        assistants: squad.assistants.map((a) =>
          a.id === assistantId ? { ...a, toolIds: a.toolIds.filter((id) => id !== toolId) } : a
        ),
      }))
    ),
  addAssistant: (assistant) =>
    set((state) =>
      updateCurrentSquad(state, (squad) => {
        if (squad.assistants.some((a) => a.id === assistant.id)) return squad;
        return { ...squad, assistants: [...squad.assistants, assistant] };
      })
    ),
  removeAssistant: (assistantId) =>
    set((state) =>
      updateCurrentSquad(state, (squad) => {
        const target = squad.assistants.find((a) => a.id === assistantId);
        if (!target || target.nonDeletable) return squad;
        const assistants = squad.assistants.filter((a) => a.id !== assistantId);
        const edges = squad.edges.filter((e) => e.source !== assistantId && e.target !== assistantId);
        const active =
          squad.runtime.activeAssistantId === assistantId ? mainAssistant.id : squad.runtime.activeAssistantId;
        const { [assistantId]: _, ...restPositions } = squad.nodePositions ?? {};
        return {
          ...squad,
          assistants,
          edges,
          nodePositions: restPositions,
          runtime: { ...squad.runtime, activeAssistantId: active },
        };
      })
    ),
  addEdge: (edge) =>
    set((state) =>
      updateCurrentSquad(state, (squad) => {
        if (squad.edges.some((e) => e.id === edge.id)) return squad;
        return { ...squad, edges: [...squad.edges, edge] };
      })
    ),
  removeEdge: (edgeId) =>
    set((state) =>
      updateCurrentSquad(state, (squad) => ({
        ...squad,
        edges: squad.edges.filter((e) => e.id !== edgeId),
      }))
    ),
  updateEdgeTrigger: (edgeId, trigger) =>
    set((state) =>
      updateCurrentSquad(state, (squad) => ({
        ...squad,
        edges: squad.edges.map((e) => (e.id === edgeId ? { ...e, trigger } : e)),
      }))
    ),
  setActiveAssistant: (assistantId) =>
    set((state) =>
      updateCurrentSquad(state, (squad) => {
        if (!squad.assistants.some((a) => a.id === assistantId)) return squad;
        return { ...squad, runtime: { ...squad.runtime, activeAssistantId: assistantId } };
      })
    ),
  addConversationTurn: (turn) =>
    set((state) =>
      updateCurrentSquad(state, (squad) => ({
        ...squad,
        conversation: [...squad.conversation, turn],
      }))
    ),
  setInFlightTool: (toolId) =>
    set((state) =>
      updateCurrentSquad(state, (squad) => ({
        ...squad,
        runtime: { ...squad.runtime, inFlightToolId: toolId },
      }))
    ),
  setWaitingAssistant: (waiting) =>
    set((state) =>
      updateCurrentSquad(state, (squad) => ({
        ...squad,
        runtime: { ...squad.runtime, waitingAssistant: waiting },
      }))
    ),
  setError: (err) =>
    set((state) =>
      updateCurrentSquad(state, (squad) => ({
        ...squad,
        runtime: { ...squad.runtime, error: err ?? null },
      }))
    ),
  setTransferEdge: (edgeId) =>
    set((state) =>
      updateCurrentSquad(state, (squad) => ({
        ...squad,
        runtime: { ...squad.runtime, inTransferEdgeId: edgeId },
      }))
    ),
  setNodePosition: (assistantId, x, y) =>
    set((state) =>
      updateCurrentSquad(state, (squad) => ({
        ...squad,
        nodePositions: { ...(squad.nodePositions ?? {}), [assistantId]: { x, y } },
      }))
    ),
  resetConversation: () =>
    set((state) => ({
      ...updateCurrentSquad(state, (squad) => ({
        ...squad,
        conversation: [],
        runtime: {
          ...squad.runtime,
          activeAssistantId: mainAssistant.id,
          waitingAssistant: false,
          inFlightToolId: null,
          error: null,
          inTransferEdgeId: null,
        },
      })),
      currentPlan: null,
    })),
  resetStore: () => set(() => createInitialData()),
});

export const appStore = createStore<StoreState>(initializer);
export const useAppStore = <T,>(
  selector: (state: StoreState) => T,
  equalityFn?: (a: T, b: T) => boolean
) => (useStore as any)(appStore, selector, equalityFn);

export function createTestStore() {
  return createStore<StoreState>(initializer);
}

export function getCurrentSquad(state: StoreState): Squad | null {
  if (!state.currentSquadId) return null;
  return state.squads.find((s) => s.id === state.currentSquadId) ?? null;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentSquad, useAppStore } from "@/hooks/useStore";
import type { Assistant, ConversationTurn, ToolDefinition } from "@/lib/types";
import { cn } from "@/lib/utils";
import { runOpenAIChat } from "@/lib/llm/openai";
import { executeLocalTool } from "@/lib/tools";

function TurnBubble({ turn }: { turn: ConversationTurn }) {
  if (turn.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white">
          {turn.content}
        </div>
      </div>
    );
  }
  if (turn.role === "assistant") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-lg bg-white px-3 py-2 text-sm text-zinc-900 shadow">
          {turn.content}
        </div>
      </div>
    );
  }
  if (turn.role === "plan") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          Original plan: {turn.content}
        </div>
      </div>
    );
  }
  if (turn.role === "transfer") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
          Transfer: {turn.transfer.fromId} → {turn.transfer.toId} {turn.transfer.reason ? `(${turn.transfer.reason})` : ""}
        </div>
      </div>
    );
  }
  if (turn.role === "tool") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Tool call: {turn.toolCall.name} args {turn.toolCall.arguments}
        </div>
      </div>
    );
  }
  if (turn.role === "tool_result") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          Tool result: {turn.toolResult.output}
        </div>
      </div>
    );
  }
  return null;
}

function safeParseArgs(args: string): Record<string, unknown> {
  try {
    return JSON.parse(args);
  } catch {
    return {};
  }
}

async function generatePlanWithLLM(params: {
  apiKey: string;
  model: string;
  plannerArgs: Record<string, unknown>;
}) {
  const { apiKey, model, plannerArgs } = params;
  const systemPrompt =
    "You are the planning tool. Given a user query, the assistant roster (ids, names, triggers, tool names), and optional recent context, return ONLY a JSON object {\"steps\":[{\"id\":\"1\",\"assistant\":\"assistantId\",\"question\":\"what this step answers\",\"notes\":\"optional\"},...]}. Break the problem into minimal sequential steps, assign each to the best assistant by specialty/trigger/tool, and keep questions concise. Use provided assistant ids exactly.";
  const res = await runOpenAIChat({
    apiKey,
    model,
    systemPrompt,
    tools: [],
    toolChoice: "none",
    messages: [{ role: "user", content: JSON.stringify(plannerArgs) }],
  });
  return res.choices[0].message.content ?? "";
}

async function runAssistantLoop(params: {
  apiKey: string;
  model: string;
  assistantId: string;
  getAssistantById: (id: string) => { prompt: string; tools: ToolDefinition[]; name?: string } | null;
  edges: { source: string; target: string; trigger: string }[];
  conversation: ConversationTurn[];
  plan: string | null;
  setPlan: (plan: string | null) => void;
  assistants: Assistant[];
  toolLibrary: ToolDefinition[];
  onToolUsed?: (toolId: string) => void;
  onAssistantActive?: (id: string) => void;
  addTurn: (turn: ConversationTurn) => void;
  setInFlight: (toolId: string | null) => void;
  setWaiting: (waiting: boolean) => void;
  setError: (err: string | null) => void;
  setActiveAssistant: (id: string) => void;
  setTransferEdge: (edgeId: string | null) => void;
}) {
  const { apiKey, model, getAssistantById, edges, onToolUsed, onAssistantActive, addTurn, setInFlight, setWaiting, setError, setActiveAssistant, setTransferEdge, plan: initialPlan, setPlan, assistants, toolLibrary } = params;
  let transcript = [...params.conversation];
  let currentAssistantId = params.assistantId;
  let activePlan = initialPlan ?? null;

  const currentAssistant = () => getAssistantById(currentAssistantId);

  const buildMessages = (turns: ConversationTurn[], meta?: { name?: string }) => {
    const preamble =
      activePlan && meta
        ? [
            {
              role: "system" as const,
              content: `Original plan: ${activePlan}\nYour specialty: ${meta.name ?? ""}.\nYou were tasked with executing a part of this plan. Follow it, stay within your tools, and transfer to the next assistant when another step is theirs.`,
            },
          ]
        : [];
    return [
      ...preamble,
      ...(turns
        .map((turn) => {
          if (turn.role === "user" || turn.role === "assistant" || turn.role === "plan") {
            return { role: turn.role === "plan" ? "assistant" : turn.role, content: turn.content };
          }
          if (turn.role === "tool_result") {
            return { role: "tool", tool_call_id: turn.toolResult.callId, content: turn.toolResult.output };
          }
          if (turn.role === "tool") {
            return {
              role: "assistant",
              tool_calls: [
                {
                  id: turn.toolCall.id,
                  type: "function" as const,
                  function: { name: turn.toolCall.name, arguments: turn.toolCall.arguments },
                },
              ],
            };
          }
          return null;
        })
        .filter(Boolean) as any[]),
    ];
  };

  for (let step = 0; step < 20; step++) {
    onAssistantActive?.(currentAssistantId);
    const assistant = currentAssistant();
    if (!assistant) break;
    const roster = assistants.map((a) => ({
      id: a.id,
      name: a.name,
      triggers: edges.filter((e) => e.source === a.id).map((e) => ({ to: e.target, trigger: e.trigger })),
      tools: toolLibrary.filter((t) => a.toolIds.includes(t.id)).map((t) => t.name),
    }));
    const toolSchemas = assistant.tools.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.schema.name,
        description: tool.schema.description,
        parameters: tool.schema.parameters,
        strict: true,
      },
    }));
    const plannerPayload =
      assistant.id === "main" && !activePlan && assistants.length > 1
        ? {
            query: transcript.find((t) => t.role === "user")?.content ?? "",
            assistants: roster,
            context: transcript.map((t) => t.content).join(" "),
          }
        : null;
    const response = await runOpenAIChat({
      apiKey,
      model,
      systemPrompt: assistant.prompt,
      tools: toolSchemas,
      messages: buildMessages(transcript, { name: assistant.name }).concat(
        plannerPayload ? [{ role: "user", content: `Planner context: ${JSON.stringify(plannerPayload)}` }] : []
      ),
    });
    const msg = response.choices[0].message;

    if (msg.content) {
      const completionTurn: ConversationTurn = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: msg.content,
      };
      addTurn(completionTurn);
      transcript = [...transcript, completionTurn];
    }

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      for (const toolCall of msg.tool_calls) {
        const callId = toolCall.id;
        const toolName = toolCall.function.name;
        const args = toolCall.function.arguments;
        const assistantNow = currentAssistant();
        const tool = assistantNow?.tools.find((t) => t.schema.name === toolName || t.id === toolName);
        if (toolName.startsWith("transfer_to_")) {
          const targetId = toolName.replace("transfer_to_", "");
          const edge = edges.find((e) => e.source === currentAssistantId && e.target === targetId);
          if (!edge) {
            const invalid: ConversationTurn = {
              id: `${callId}-invalid`,
              role: "assistant",
              content: `Cannot transfer to ${targetId}. Define a valid edge first.`,
            };
            addTurn(invalid);
            transcript = [...transcript, invalid];
            setInFlight(null);
            continue;
          }
          const parsed = safeParseArgs(args) as { reason?: string };
          const fromId = currentAssistantId;
          setError(null);
          setInFlight(null);
          setTransferEdge(edge.id);
          setActiveAssistant(targetId);
          currentAssistantId = targetId;
          onAssistantActive?.(targetId);
          const transferTurn: ConversationTurn = {
            id: `${callId}-transfer`,
            role: "transfer",
            content: "",
            transfer: { fromId, toId: targetId, reason: parsed.reason ?? edge.trigger },
          };
          addTurn(transferTurn);
          transcript = [...transcript, transferTurn];
          setInFlight(null);
          continue;
        }

        if (!tool) {
          const missing = {
            id: `${callId}-error`,
            role: "assistant" as const,
            content: `Tool ${toolName} not available.`,
          };
          addTurn(missing);
          transcript = [...transcript, missing];
          setInFlight(null);
          continue;
        }

        if (toolName === "planner") {
          if (activePlan) {
            const infoTurn: ConversationTurn = {
              id: `${callId}-plan-skip`,
              role: "assistant",
              content: "Plan already exists; proceeding with execution.",
            };
            addTurn(infoTurn);
            transcript = [...transcript, infoTurn];
            setInFlight(null);
            continue;
          }
          setInFlight("planner");
          const parsedArgs = safeParseArgs(args);
          const planContent = await generatePlanWithLLM({
            apiKey,
            model,
            plannerArgs: {
              query: parsedArgs.query ?? transcript.find((t) => t.role === "user")?.content ?? "",
              assistants: parsedArgs.assistants ?? roster,
              context: parsedArgs.context ?? transcript.map((t) => t.content).join(" "),
            },
          });
          const planStr = planContent || JSON.stringify({ steps: [] });
          activePlan = planStr;
          setPlan(planStr);
          const planTurn: ConversationTurn = { id: `${callId}-plan`, role: "plan", content: planStr };
          addTurn(planTurn);
          transcript = [...transcript, planTurn];
          setInFlight(null);
          continue;
        }

        setInFlight(toolName);
        const callTurn: ConversationTurn = {
          id: callId,
          role: "tool",
          content: "",
          toolCall: { id: callId, name: toolName, arguments: args },
        };
        addTurn(callTurn);
        transcript = [...transcript, callTurn];

        onToolUsed?.(tool.id);
        const parsedArgs = safeParseArgs(args);
        const result = await executeLocalTool(tool, parsedArgs);
        const resultTurn: ConversationTurn = {
          id: `${callId}-result`,
          role: "tool_result",
          content: "",
          toolResult: { callId, output: result.error ? `error: ${result.error}` : result.output },
        };
        addTurn(resultTurn);
        transcript = [...transcript, resultTurn];
        setError(result.error ?? null);
        setInFlight(null);
      }
      continue;
    }

    break;
  }

  setInFlight(null);
  setWaiting(false);
}

export function ChatPanel({
  open = true,
  onToolUsed,
  onAssistantActive,
}: {
  open?: boolean;
  onToolUsed?: (toolId: string) => void;
  onAssistantActive?: (assistantId: string) => void;
}) {
  const squad = useAppStore((state) => getCurrentSquad(state));
  const assistants = squad?.assistants ?? [];
  const toolLibrary = squad?.toolLibrary ?? [];
  const conversation = squad?.conversation ?? [];
  const runtime = squad?.runtime ?? {
    activeAssistantId: "",
    waitingAssistant: false,
    inFlightToolId: null,
    error: null,
  };
  const currentPlan = useAppStore((state) => state.currentPlan);
  const setPlan = useAppStore((state) => state.setPlan);
  const addConversationTurn = useAppStore((state) => state.addConversationTurn);
  const resetConversation = useAppStore((state) => state.resetConversation);
  const setInFlightTool = useAppStore((state) => state.setInFlightTool);
  const setWaitingAssistant = useAppStore((state) => state.setWaitingAssistant);
  const setRuntimeError = useAppStore((state) => state.setError);
  const setActiveAssistant = useAppStore((state) => state.setActiveAssistant);
  const edges = squad?.edges ?? [];
  const setTransferEdge = useAppStore((state) => state.setTransferEdge);

  const activeAssistant = useMemo(
    () => assistants.find((a) => a.id === runtime.activeAssistantId) ?? assistants[0],
    [assistants, runtime.activeAssistantId]
  );

  const attachedTools = useMemo(() => {
    const base = toolLibrary.filter((t) => activeAssistant.toolIds.includes(t.id));
    const transfer = toolLibrary.find((t) => t.id === "transfer");
    if (transfer && !base.some((t) => t.id === transfer.id)) base.push(transfer);
    return base;
  }, [toolLibrary, activeAssistant]);

  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!squad || !activeAssistant) return null;

  useEffect(() => {
    const savedKey = typeof window !== "undefined" ? localStorage.getItem("OPENAI_KEY") : "";
    if (savedKey) setApiKey(savedKey);
  }, []);

  const getAssistantById = (id: string) => {
    const assistant = assistants.find((a) => a.id === id);
    if (!assistant) return null;
    const baseTools = toolLibrary.filter((t) => assistant.toolIds.includes(t.id));
    const outgoing = edges.filter((e) => e.source === id);
    const transferTools: ToolDefinition[] = outgoing.map((edge) => ({
      id: `transfer_to_${edge.target}`,
      name: `transfer_to_${edge.target}`,
      description: `${edge.trigger} Use this to hand off to ${edge.target}. Do not use for unrelated queries.`,
      kind: "customApi",
      schema: {
        type: "function",
        name: `transfer_to_${edge.target}`,
        description: edge.trigger,
        strict: true,
        parameters: {
          type: "object",
          properties: {
            reason: { type: "string", description: "Short reason for this transfer" },
          },
          required: ["reason"],
          additionalProperties: false,
        },
      },
    }));
    const promptSuffix =
      outgoing.length > 0
        ? `\nTransfer rules:\n${outgoing
            .map((edge) => `- Use transfer_to_${edge.target} when: ${edge.trigger}`)
            .join("\n")}\nDo not invent tools.`
        : "";
    return {
      name: assistant.name,
      basePrompt: assistant.systemPrompt,
      prompt: `${assistant.systemPrompt}${promptSuffix}`,
      tools: [...baseTools, ...transferTools],
    };
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!apiKey) {
      setError("API key required");
      return;
    }
    setError(null);
    onAssistantActive?.(activeAssistant.id);
    const userTurn: ConversationTurn = { id: crypto.randomUUID(), role: "user", content: text };
    addConversationTurn(userTurn);
    setInput("");
    setLoading(true);
    setWaitingAssistant(true);
    try {
      let planText = currentPlan;
      const convoForLoop: ConversationTurn[] = [...conversation, userTurn];
      await runAssistantLoop({
        apiKey,
        model,
        assistantId: activeAssistant.id,
        getAssistantById,
        edges,
        conversation: convoForLoop,
        plan: planText ?? null,
        setPlan,
        assistants,
        toolLibrary,
        onToolUsed,
        onAssistantActive: (id) => onAssistantActive?.(id),
        addTurn: addConversationTurn,
        setInFlight: setInFlightTool,
        setWaiting: setWaitingAssistant,
        setError: setRuntimeError,
        setActiveAssistant,
        setTransferEdge,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
      setWaitingAssistant(false);
    }
  };

  return (
    <div
      className={cn(
        "fixed left-0 top-[88px] z-30 h-[calc(100vh-88px)] w-full max-w-xl transform border-r border-slate-200 bg-white shadow-lg transition-transform lg:max-w-[38vw]",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-full flex-col px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Test Squad</h2>
          <p className="text-xs text-slate-500">Active assistant: {activeAssistant.name}</p>
        </div>
          <button
            className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
            onClick={() => resetConversation()}
          >
            Restart
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 shadow-sm"
            placeholder="OpenAI API key (stored locally)"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              if (typeof window !== "undefined") localStorage.setItem("OPENAI_KEY", e.target.value);
            }}
            type="password"
          />
          <select
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            <option value="gpt-5-nano">gpt-5-nano</option>
            <option value="gpt-5">gpt-5</option>
          </select>
        </div>
        <div className="mt-3 flex-1 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
          {conversation.length === 0 ? (
            <p className="text-xs text-slate-500">No messages yet.</p>
          ) : (
            conversation.map((turn) => <TurnBubble key={turn.id} turn={turn} />)
          )}
        </div>
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        <div className="mt-3 flex items-center gap-2">
          <input
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            className={cn(
              "rounded-md px-3 py-2 text-sm font-semibold",
              input.trim() && !loading
                ? "bg-indigo-600 text-white hover:bg-indigo-500"
                : "bg-slate-200 text-slate-500 cursor-not-allowed"
            )}
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            {loading ? "Running..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

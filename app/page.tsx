// Multi-squad home + builder experience.
"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, FileText, Play, Plus, Trash2 } from "lucide-react";
import { getCurrentSquad, type Squad, useAppStore } from "@/hooks/useStore";
import { cn } from "@/lib/utils";
import { Canvas } from "@/components/Canvas";
import { ChatPanel } from "@/components/ChatPanel";
import { InfoCards } from "@/components/InfoCards";
import { prebuiltTools } from "@/lib/tools";
import type { Assistant, AssistantEdge, ToolDefinition } from "@/lib/types";
import { ToolSelector } from "@/components/ToolSelector";

type DraftToolSet = Set<string>;
type ToolPreset = "none" | "math" | "english";
type View = "home" | "builder";
type TemplateKey = "empty" | "teacher";

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [showChat, setShowChat] = useState(false);
  const [showPayload, setShowPayload] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editMode, setEditMode] = useState<"prompt" | "tools">("prompt");
  const [editingAssistantId, setEditingAssistantId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [draftPrompt, setDraftPrompt] = useState("");
  const [draftTools, setDraftTools] = useState<DraftToolSet>(new Set());
  const [recentToolId, setRecentToolId] = useState<string | null>(null);
  const [recentAssistantId, setRecentAssistantId] = useState<string | null>(null);
  const [showAddAssistant, setShowAddAssistant] = useState(false);
  const [newAssistantName, setNewAssistantName] = useState("");
  const [newAssistantPrompt, setNewAssistantPrompt] = useState("");
  const [newAssistantPreset, setNewAssistantPreset] = useState<ToolPreset>("none");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSquadName, setNewSquadName] = useState("");
  const [newSquadTemplate, setNewSquadTemplate] = useState<TemplateKey>("empty");
  const [showAddTransfer, setShowAddTransfer] = useState(false);
  const [transferSource, setTransferSource] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferTrigger, setTransferTrigger] = useState<string>("");
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [editingEdgeTrigger, setEditingEdgeTrigger] = useState<string>("");

  const squads = useAppStore((state) => state.squads);
  const currentSquad = useAppStore((state) => getCurrentSquad(state));
  const setCurrentSquad = useAppStore((state) => state.setCurrentSquad);
  const createSquad = useAppStore((state) => state.createSquad);
  const deleteSquad = useAppStore((state) => state.deleteSquad);
  const assistants: Assistant[] = currentSquad?.assistants ?? [];
  const toolLibrary: ToolDefinition[] = currentSquad?.toolLibrary ?? [];
  const runtime = currentSquad?.runtime ?? {
    activeAssistantId: "",
    waitingAssistant: false,
    inFlightToolId: null,
    error: null,
    inTransferEdgeId: null,
  };
  const setAssistantPrompt = useAppStore((state) => state.setAssistantPrompt);
  const setAssistantName = useAppStore((state) => state.setAssistantName);
  const attachToolToAssistant = useAppStore((state) => state.attachToolToAssistant);
  const detachToolFromAssistant = useAppStore((state) => state.detachToolFromAssistant);
  const addAssistant = useAppStore((state) => state.addAssistant);
  const edges: AssistantEdge[] = currentSquad?.edges ?? [];
  const removeEdge = useAppStore((state) => state.removeEdge);
  const addEdge = useAppStore((state) => state.addEdge);
  const updateEdgeTrigger = useAppStore((state) => state.updateEdgeTrigger);

  const activeAssistant = useMemo(
    () => assistants.find((a) => a.id === runtime.activeAssistantId) ?? assistants[0],
    [assistants, runtime.activeAssistantId]
  );

  const allTools = useMemo(() => {
    const map = new Map<string, (typeof prebuiltTools)[number]>();
    prebuiltTools.forEach((t) => map.set(t.id, t));
    toolLibrary.forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  }, [toolLibrary]);

  const payload = {
    assistant: activeAssistant,
    tools: activeAssistant ? toolLibrary.filter((t) => activeAssistant.toolIds.includes(t.id)) : [],
    model: "gpt-5.1",
    provider: "openai",
  };

  const openEdit = (assistantId: string) => {
    const target = assistants.find((a) => a.id === assistantId) ?? activeAssistant;
    if (!target) return;
    setEditName(target.name);
    setDraftPrompt(target.systemPrompt);
    setDraftTools(new Set(target.toolIds));
    setEditingAssistantId(target.id);
    setEditMode("prompt");
    setEditing(true);
  };

  const openTransfersPanel = (assistantId: string) => {
    setTransferSource(assistantId);
    const firstTarget = assistants.find((a) => a.id !== assistantId)?.id ?? null;
    setTransferTarget(firstTarget);
    setTransferTrigger("");
    setShowAddTransfer(true);
  };

  const openEdgeEditor = (edgeId: string, trigger: string) => {
    console.log("openEdgeEditor called", { edgeId, trigger });
    setEditingEdgeId(edgeId);
    setEditingEdgeTrigger(trigger);
  };

  const closeEditor = () => {
    setEditing(false);
    setEditingAssistantId(null);
  };

  const saveEdit = () => {
    if (!editingAssistantId) return;
    const target = assistants.find((a) => a.id === editingAssistantId);
    if (!target) return;
    setAssistantPrompt(target.id, draftPrompt);
    if (editName.trim() && editName.trim() !== target.name) {
      setAssistantName(target.id, editName.trim());
    }
    const current = new Set(target.toolIds);
    draftTools.forEach((id) => {
      if (!current.has(id)) {
        const tool = allTools.find((t) => t.id === id);
        if (tool) attachToolToAssistant(target.id, tool);
      }
    });
    current.forEach((id) => {
      if (!draftTools.has(id)) detachToolFromAssistant(target.id, id);
    });
    setEditingAssistantId(null);
    setEditName("");
    setEditing(false);
  };

  const handleCreateSquad = () => {
    const name =
      newSquadName.trim() || (newSquadTemplate === "empty" ? "Untitled Squad" : "Teacher Squad");
    const squad = newSquadTemplate === "empty" ? emptySquadTemplate(name) : teacherTemplate(name);
    createSquad(squad);
    setCurrentSquad(squad.id);
    setView("builder");
    setShowCreateModal(false);
    setNewSquadName("");
    setNewSquadTemplate("empty");
  };

  const header =
    view === "builder" ? (
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm"
              onClick={() => {
                setView("home");
                setShowChat(false);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{currentSquad?.name ?? "Squad Builder"}</h1>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Up to date
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300"
              onClick={() => setShowPayload(true)}
            >
              <FileText className="h-4 w-4" />
              View API Payload
            </button>
            <button
              className={cn(
                "flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm",
                showChat
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "text-slate-700 hover:border-slate-300"
              )}
              onClick={() => setShowChat((v) => !v)}
            >
              <Play className="h-4 w-4" />
              {showChat ? "Close Chat" : "Test Squad"}
            </button>
          </div>
        </div>
      </header>
    ) : null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {header}

      {view === "home" ? (
        <section className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Squads</p>
              <h1 className="text-2xl font-bold text-slate-900">Manage your squads</h1>
              <p className="text-sm text-slate-600">Open an existing squad or spin up a new one from a template.</p>
            </div>
            <button
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              onClick={() => setShowCreateModal(true)}
            >
              New Squad
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {squads.length === 0 ? (
                <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">No squads yet</p>
                    <p className="text-xs text-slate-500">Create one to start routing between assistants.</p>
                  </div>
                  <button
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Create squad
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {squads.map((squad) => (
                    <div
                      key={squad.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{squad.name}</p>
                        <p className="text-xs text-slate-500">
                          {squad.assistants.length} assistants · {squad.edges.length} transfers
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-300"
                          onClick={() => {
                            setCurrentSquad(squad.id);
                            setView("builder");
                          }}
                        >
                          Open
                        </button>
                        <button
                          className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:border-red-300"
                          onClick={() => deleteSquad(squad.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Tools</h2>
              <p className="text-xs text-slate-500">Built-in math/english, custom APIs, transfer tools per edges.</p>
              <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                <p>Math tools: {prebuiltTools.filter((t) => t.kind === "math").length}</p>
                <p>English tools: {prebuiltTools.filter((t) => t.kind === "english").length}</p>
                <p>Custom API tools: configure per assistant in the studio.</p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative h-[calc(100vh-136px)] overflow-hidden bg-slate-50">
          {currentSquad ? (
            <>
              <div className="absolute left-4 top-4 z-20 w-72">
                <InfoCards />
              </div>
              <div className="absolute inset-0">
              <Canvas
                onEdit={openEdit}
                onTransfers={(id) => {
                  openTransfersPanel(id);
                }}
                onEditEdge={openEdgeEditor}
                onDeleteEdge={(edgeId) => removeEdge(edgeId)}
                recentlyActiveToolId={recentToolId}
                recentlyActiveAssistantId={recentAssistantId}
              />
            </div>
              <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
                <button
                  className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-neutral-50 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm"
                  onClick={() => setShowAddAssistant(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Assistant
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-700">
              <p className="text-sm font-semibold">No squad selected.</p>
              <button
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                onClick={() => setView("home")}
              >
                Return to squads
              </button>
            </div>
          )}
        </section>
      )}

      {view === "builder" && currentSquad ? (
        <ChatPanel
          open={showChat}
          onToolUsed={(id) => {
            setRecentToolId(id);
            setTimeout(() => setRecentToolId(null), 2000);
          }}
          onAssistantActive={(id) => {
            setRecentAssistantId(id);
            setTimeout(() => setRecentAssistantId(null), 2000);
          }}
        />
      ) : null}

      {showPayload ? (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowPayload(false)}>
          <div
            className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">API Payload</p>
                <p className="text-xs text-slate-500">
                  Model: {payload.model} · Provider: {payload.provider}
                </p>
              </div>
              <button
                className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:border-slate-300"
                onClick={() => setShowPayload(false)}
              >
                Close
              </button>
            </div>
            <div className="h-full overflow-y-auto space-y-3 px-4 py-4">
              <div>
                <p className="text-xs font-medium text-slate-700">OpenAI API Key</p>
                <p className="mb-2 text-[11px] text-slate-500">
                  Stored locally in your browser. Not sent anywhere else.
                </p>
                <input
                  type="password"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm"
                  placeholder="sk-..."
                  value=""
                  readOnly
                />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-700">Current Payload</p>
                <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                  {JSON.stringify(payload, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showAddTransfer && transferSource ? (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowAddTransfer(false)}>
          <div
            className="absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-900">Add transfer</h3>
            <p className="text-xs text-slate-500">
              From {assistants.find((a) => a.id === transferSource)?.name ?? transferSource}
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-700">Target assistant</p>
                <select
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm"
                  value={transferTarget ?? ""}
                  onChange={(e) => setTransferTarget(e.target.value)}
                >
                  <option value="" disabled>
                    Select target
                  </option>
                  {assistants
                    .filter((a) => a.id !== transferSource)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-700">Trigger (required)</p>
                <textarea
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-800 shadow-inner"
                  rows={3}
                  value={transferTrigger}
                  onChange={(e) => setTransferTrigger(e.target.value)}
                  placeholder="Describe when to transfer..."
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
                onClick={() => setShowAddTransfer(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                onClick={() => {
                  if (!transferSource || !transferTarget || !transferTrigger.trim()) return;
                  addEdge({
                    id: `${transferSource}-${transferTarget}-${Date.now()}`,
                    source: transferSource,
                    target: transferTarget,
                    trigger: transferTrigger.trim(),
                  });
                  setShowAddTransfer(false);
                  setTransferTrigger("");
                  setTransferSource(null);
                  setTransferTarget(null);
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={closeEditor}>
          <div
            className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Edit Assistant</p>
                <p className="text-xs text-slate-500">
                  {assistants.find((a) => a.id === editingAssistantId)?.name ?? activeAssistant?.name}
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 px-4 py-4">
              <div className="flex gap-2">
                <button
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-semibold",
                    editMode === "prompt" ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-700"
                  )}
                  onClick={() => setEditMode("prompt")}
                >
                  Prompt & Name
                </button>
                <button
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-semibold",
                    editMode === "tools" ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-700"
                  )}
                  onClick={() => setEditMode("tools")}
                >
                  Tools
                </button>
              </div>
              {editMode === "prompt" ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-700">Assistant name</p>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-700">System prompt</p>
                    <textarea
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-800 shadow-inner"
                      rows={5}
                      value={draftPrompt}
                      onChange={(e) => setDraftPrompt(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-slate-700">Tools</p>
                  <p className="text-[11px] text-slate-500">Search and toggle tools for this assistant.</p>
                  <ToolSelector
                    tools={allTools}
                    attachedIds={draftTools}
                    onAttach={(tool) => setDraftTools(new Set(draftTools).add(tool.id))}
                    onDetach={(id) => {
                      const next = new Set(draftTools);
                      next.delete(id);
                      setDraftTools(next);
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
                onClick={closeEditor}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                onClick={saveEdit}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showAddAssistant ? (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowAddAssistant(false)}>
          <div
            className="absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-900">Add Assistant</h3>
            <div className="mt-3 space-y-2">
              <div>
                <p className="text-xs font-medium text-slate-700">Name</p>
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm"
                  value={newAssistantName}
                  onChange={(e) => setNewAssistantName(e.target.value)}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-700">System prompt</p>
                <textarea
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-800 shadow-inner"
                  rows={3}
                  value={newAssistantPrompt}
                  onChange={(e) => setNewAssistantPrompt(e.target.value)}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-700">Tool preset</p>
                <select
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm"
                  value={newAssistantPreset}
                  onChange={(e) => setNewAssistantPreset(e.target.value as ToolPreset)}
                >
                  <option value="none">None</option>
                  <option value="math">Math tools</option>
                  <option value="english">English tools</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
                onClick={() => setShowAddAssistant(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                onClick={() => {
                  if (!newAssistantName.trim() || !currentSquad) return;
                  const id = newAssistantName.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
                  addAssistant({
                    id,
                    name: newAssistantName.trim(),
                    systemPrompt: newAssistantPrompt.trim() || "You are a specialist assistant.",
                    toolIds: [],
                  });
                  const presetTools =
                    newAssistantPreset === "math"
                      ? prebuiltTools.filter((t) => t.kind === "math")
                      : newAssistantPreset === "english"
                        ? prebuiltTools.filter((t) => t.kind === "english")
                        : [];
                  presetTools.forEach((t) => attachToolToAssistant(id, t));
                  setShowAddAssistant(false);
                  setNewAssistantName("");
                  setNewAssistantPrompt("");
                  setNewAssistantPreset("none");
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCreateModal ? (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowCreateModal(false)}>
          <div
            className="absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-900">Create a squad</h3>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-700">Name</p>
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm"
                  value={newSquadName}
                  onChange={(e) => setNewSquadName(e.target.value)}
                  placeholder="e.g. Support triage"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-700">Template</p>
                <select
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm"
                  value={newSquadTemplate}
                  onChange={(e) => setNewSquadTemplate(e.target.value as TemplateKey)}
                >
                  <option value="empty">Empty (Main only)</option>
                  <option value="teacher">Teacher (Main + Math + English)</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                onClick={handleCreateSquad}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingEdgeId ? (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setEditingEdgeId(null)}>
          <div
            className="absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-900">Edit trigger</h3>
            <textarea
              className="mt-2 w-full rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-800 shadow-inner"
              rows={3}
              value={editingEdgeTrigger}
              onChange={(e) => setEditingEdgeTrigger(e.target.value)}
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
                onClick={() => setEditingEdgeId(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                onClick={() => {
                  if (!editingEdgeId || !editingEdgeTrigger.trim()) return;
                  updateEdgeTrigger(editingEdgeId, editingEdgeTrigger.trim());
                  setEditingEdgeId(null);
                  setEditingEdgeTrigger("");
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function baseRuntime() {
  return {
    activeAssistantId: "main",
    waitingAssistant: false,
    inFlightToolId: null,
    error: null,
    inTransferEdgeId: null,
  };
}

const mainRouterPrompt =
  `You are the entrypoint planner/router.
If the task is simple enough for a single specialist, transfer directly to that assistant.
If the task is complex or multi-step, call the planner tool once to draft a brief step-by-step plan with assigned assistants, then transfer to the first step's assistant.
Do not perform specialist work yourself. Avoid re-planning once a plan is set. Stay concise and action-oriented.`;

function emptySquadTemplate(name: string): Squad {
  const main: Assistant = {
    id: "main",
    name: "Main Assistant",
    systemPrompt: mainRouterPrompt,
    toolIds: ["planner"],
    nonDeletable: true,
  };
  return {
    id: `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
    name,
    assistants: [main],
    edges: [],
    nodePositions: {
      main: { x: 240, y: 160 },
    },
    toolLibrary: [...prebuiltTools],
    conversation: [],
    runtime: baseRuntime(),
  };
}

function teacherTemplate(name: string): Squad {
  const main: Assistant = {
    id: "main",
    name: "Main Assistant",
    systemPrompt: mainRouterPrompt,
    toolIds: ["planner"],
    nonDeletable: true,
  };
  const math: Assistant = {
    id: "math",
    name: "Math Assistant",
    systemPrompt:
      "You are the math specialist.\n- Scope: arithmetic, algebra, numeric reasoning. Use your math tools when available; if a needed tool is missing, compute directly.\n- Plan & context: before acting, review prior messages and plan content to see the current step and numbers already produced (user text, tool outputs, earlier assistant replies). Reuse those numbers—do not re-ask for data already present.\n- Transfers: use transfer_to_english only when NEW text analysis is required (word/letter counts, frequency, etc). If English already provided counts or text-derived numbers, DO NOT send it back—finish the math yourself.\n- Loop control: avoid repeated transfers. Once you’ve handed off for text analysis and got numbers back, stay and finish.\n- Responses: be concise; if you used tools, summarize the numeric result clearly.",
    toolIds: prebuiltTools.filter((t) => t.kind === "math").map((t) => t.id),
  };
  const english: Assistant = {
    id: "english",
    name: "English Assistant",
    systemPrompt:
      "You are the English/text specialist.\n- Scope: word/letter counts, frequency, simple text analysis. Use your English tools when available; if a needed tool is missing, compute directly.\n- Plan & context: before acting, review prior messages and plan content to see the current step and any numbers already produced (user text, tool outputs, earlier assistant replies). Reuse those numbers—do not re-ask for data already present.\n- Transfers: use transfer_to_math only when NEW math is required. If math already provided results, DO NOT send it back—finish the text-side response yourself.\n- Loop control: avoid repeated transfers. Once you’ve handed off for math and got numbers back, stay and finish.\n- Responses: be concise; if you used tools, summarize the counts/results clearly. No forced JSON unless explicitly requested.",
    toolIds: prebuiltTools.filter((t) => t.kind === "english").map((t) => t.id),
  };
  return {
    id: `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
    name,
    assistants: [main, math, english],
    edges: [
      { id: "main-math", source: "main", target: "math", trigger: "Transfer when a step needs arithmetic, algebraic manipulation, or any numeric operations." },
      { id: "main-english", source: "main", target: "english", trigger: "Transfer when a step needs word/letter counts, text analysis, or linguistic checks. Do not transfer if the answer is already present in previous messages." },
      { id: "english-math", source: "english", target: "math", trigger: "Transfer when a math computation is required after text processing. Do not transfer if the needed numeric result is already present in previous messages." },
      { id: "math-english", source: "math", target: "english", trigger: "Transfer when wording, counts, or text/letter analysis is required after math. Do not transfer if the needed textual/count answer is already in previous messages." },
    ],
    nodePositions: {
      main: { x: 300, y: 140 },
      math: { x: 20, y: 380 },
      english: { x: 580, y: 380 },
    },
    toolLibrary: [...prebuiltTools],
    conversation: [],
    runtime: baseRuntime(),
  };
}

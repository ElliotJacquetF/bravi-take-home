"use client";

import { useState } from "react";
import { buildCustomApiTool } from "@/lib/tools";
import { getCurrentSquad, useAppStore } from "@/hooks/useStore";

type Props = {
  open: boolean;
  onClose: () => void;
  targetAssistantId?: string;
};

export function CustomApiDialog({ open, onClose, targetAssistantId }: Props) {
  const attachToolToAssistant = useAppStore((state) => state.attachToolToAssistant);
  const squad = useAppStore((state) => getCurrentSquad(state));
  const assistants = squad?.assistants ?? [];
  const defaultAssistantId = squad?.runtime.activeAssistantId ?? assistants[0]?.id ?? "";

  const [name, setName] = useState("get_weather");
  const [url, setUrl] = useState("http://localhost:5001/weather");
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [paramsJson, setParamsJson] = useState('{\n  "city": { "type": "string" }\n}');
  const [error, setError] = useState<string | null>(null);
  const [selectedAssistantId, setSelectedAssistantId] = useState(targetAssistantId ?? defaultAssistantId);

  if (!open) return null;

  const handleSave = () => {
    try {
      const parsed = JSON.parse(paramsJson) as Record<string, unknown>;
      const tool = buildCustomApiTool(`custom-${Date.now()}`, name, url, method, parsed);
      const targetId = selectedAssistantId || targetAssistantId || defaultAssistantId;
      if (targetId) {
        attachToolToAssistant(targetId, tool);
      }
      onClose();
    } catch (err) {
      setError("Params JSON invalid");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose}>
      <div
        className="absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-slate-900">Add Custom API Tool</h3>
        <div className="mt-3 space-y-2">
          <div>
            <p className="text-xs font-medium text-slate-700">Tool name</p>
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-700">Endpoint URL</p>
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-700">Method</p>
            <select
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm"
              value={method}
              onChange={(e) => setMethod(e.target.value as "GET" | "POST")}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-700">Params JSON schema</p>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-800 shadow-inner"
              rows={5}
              value={paramsJson}
              onChange={(e) => setParamsJson(e.target.value)}
            />
            <p className="text-[11px] text-slate-500">
              Example: {"{ \"query\": { \"type\": \"string\" } }"}
            </p>
          </div>
          {targetAssistantId ? null : (
            <div>
              <p className="text-xs font-medium text-slate-700">Attach to assistant</p>
              <select
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm"
                value={selectedAssistantId}
                onChange={(e) => setSelectedAssistantId(e.target.value)}
              >
                {assistants.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

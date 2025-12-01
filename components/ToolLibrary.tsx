"use client";

import { prebuiltTools } from "@/lib/tools";
import { getCurrentSquad, useAppStore } from "@/hooks/useStore";
import { cn } from "@/lib/utils";
import type { ToolDefinition } from "@/lib/types";

type ToolLibraryProps = {
  title?: string;
};

export function ToolLibrary({ title = "Tool Library" }: ToolLibraryProps) {
  const squad = useAppStore((state) => getCurrentSquad(state));
  const assistant =
    squad?.assistants.find((a) => a.id === squad.runtime.activeAssistantId) ?? squad?.assistants[0];
  const attachToolToAssistant = useAppStore((state) => state.attachToolToAssistant);
  const detachToolFromAssistant = useAppStore((state) => state.detachToolFromAssistant);

  if (!assistant) return null;

  const handleToggle = (tool: ToolDefinition) => {
    const isAttached = assistant.toolIds.includes(tool.id);
    if (isAttached) {
      detachToolFromAssistant(assistant.id, tool.id);
    } else {
      attachToolToAssistant(assistant.id, tool);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
        <p className="text-xs text-zinc-500">{assistant.name}</p>
      </div>
      <div className="space-y-2">
        {prebuiltTools.map((tool) => {
          const isAttached = assistant.toolIds.includes(tool.id);
          return (
            <button
              key={tool.id}
              onClick={() => handleToggle(tool)}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-left shadow-sm transition hover:border-zinc-300",
                isAttached
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-zinc-200 bg-white text-zinc-800"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{tool.name}</span>
                <span className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">{tool.kind}</span>
              </div>
              <p className="text-xs text-zinc-500">{tool.description}</p>
              {isAttached ? (
                <p className="mt-1 text-[10px] font-medium text-emerald-700">Attached (click to detach)</p>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

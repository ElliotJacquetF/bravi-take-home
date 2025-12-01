"use client";

import { getCurrentSquad, useAppStore } from "@/hooks/useStore";

export function Sidebar() {
  const squad = useAppStore((state) => getCurrentSquad(state));
  const activeAssistant =
    squad?.assistants.find((a) => a.id === squad.runtime.activeAssistantId) ?? squad?.assistants[0];
  const resetConversation = useAppStore((state) => state.resetConversation);
  const setAssistantPrompt = useAppStore((state) => state.setAssistantPrompt);

  if (!activeAssistant) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-800">System prompt</h3>
        <p className="text-xs text-zinc-500">Edit the main assistant prompt.</p>
        <textarea
          className="mt-2 w-full rounded-lg border border-zinc-200 bg-white p-2 text-sm text-zinc-800 shadow-inner"
          rows={4}
          value={activeAssistant?.systemPrompt ?? ""}
          onChange={(e) => activeAssistant && setAssistantPrompt(activeAssistant.id, e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-800">Conversation</p>
          <p className="text-xs text-zinc-500">Restart clears chat only.</p>
        </div>
        <button
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          onClick={() => resetConversation()}
        >
          Restart
        </button>
      </div>
    </div>
  );
}

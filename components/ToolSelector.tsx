"use client";

import { useMemo, useState } from "react";
import type { ToolDefinition } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CustomApiDialog } from "./CustomApiDialog";

type Props = {
  tools: ToolDefinition[];
  attachedIds: Set<string>;
  onAttach: (tool: ToolDefinition) => void;
  onDetach: (toolId: string) => void;
  targetAssistantId?: string;
};

const filterByCategory = (
  tools: ToolDefinition[],
  category: "all" | "built-in" | "math" | "english" | "api"
) => {
  if (category === "all") return tools;
  if (category === "built-in") return tools.filter((t) => t.kind !== "customApi");
  if (category === "api") return tools.filter((t) => t.kind === "customApi");
  return tools.filter((t) => t.kind === category);
};

export function ToolSelector({ tools, attachedIds, onAttach, onDetach, targetAssistantId }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | "built-in" | "math" | "english" | "api">("built-in");
  const [showCustomDialog, setShowCustomDialog] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const base = filterByCategory(tools, category).filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        (t.kind ?? "").toString().toLowerCase().includes(q)
    );
    return base.sort((a, b) => {
      const aAttached = attachedIds.has(a.id) ? 0 : 1;
      const bAttached = attachedIds.has(b.id) ? 0 : 1;
      if (aAttached !== bAttached) return aAttached - bAttached;
      return a.name.localeCompare(b.name);
    });
  }, [tools, query, category, attachedIds]);

  const builtIn = filtered.filter((t) => t.kind !== "customApi");
  const apiOnly = filtered.filter((t) => t.kind === "customApi");
  const isAll = category === "all";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm"
          placeholder="Search tools..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        {(["all", "built-in", "math", "english", "api"] as const).map((cat) => (
          <button
            key={cat}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold border",
              category === cat
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
            onClick={() => setCategory(cat)}
          >
            {cat === "api"
              ? "API tools"
              : cat === "built-in"
                ? "Built-in"
                : cat === "all"
                  ? "All"
                  : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {isAll || category === "built-in" || category === "math" || category === "english" ? (
        <Section
          title="Built-in tools"
          tools={builtIn}
          attachedIds={attachedIds}
          onAttach={onAttach}
          onDetach={onDetach}
        />
      ) : null}

      {isAll || category === "api" ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-800">API tools</p>
            <button
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:border-slate-300"
              onClick={() => setShowCustomDialog(true)}
            >
              + Create API tool
            </button>
          </div>
          <Section
            title=""
            tools={apiOnly}
            attachedIds={attachedIds}
            onAttach={onAttach}
            onDetach={onDetach}
          />
          <CustomApiDialog
            open={showCustomDialog}
            onClose={() => setShowCustomDialog(false)}
            targetAssistantId={targetAssistantId}
          />
        </>
      ) : null}
    </div>
  );
}

function Section({
  title,
  tools,
  attachedIds,
  onAttach,
  onDetach,
}: {
  title: string;
  tools: ToolDefinition[];
  attachedIds: Set<string>;
  onAttach: (tool: ToolDefinition) => void;
  onDetach: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {title ? <p className="text-xs font-semibold text-slate-800">{title}</p> : null}
      {tools.length === 0 ? (
        <p className="text-xs text-slate-500">No tools found.</p>
      ) : (
        tools.map((tool) => {
          const isAttached = attachedIds.has(tool.id);
          return (
            <button
              key={tool.id}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-left text-sm shadow-sm transition",
                isAttached
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
              )}
              onClick={() => (isAttached ? onDetach(tool.id) : onAttach(tool))}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{tool.name}</span>
                <span className="text-[10px] uppercase tracking-[0.08em] text-slate-500">
                  {tool.kind}
                </span>
              </div>
              <p className="text-xs text-slate-500">{tool.description}</p>
              {isAttached ? (
                <p className="mt-1 text-[10px] font-medium text-emerald-700">Attached</p>
              ) : null}
            </button>
          );
        })
      )}
    </div>
  );
}

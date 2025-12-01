"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, Shuffle, Layers } from "lucide-react";

const defaultCards = [
  {
    id: "how",
    title: "How Squads Work",
    icon: Sparkles,
    bullets: [
      "One assistant can call tools to answer queries.",
      "Tools are attached per assistant.",
      "System prompts steer behavior and tool use.",
    ],
    bg: "bg-blue-50 border-blue-100",
  },
  {
    id: "transfer",
    title: "Transfer Logic",
    icon: Shuffle,
    bullets: [
      "In Part 1, stay within the Main assistant.",
      "Later, transfers route to specialists.",
      "Edges define allowed transfer paths.",
    ],
    bg: "bg-emerald-50 border-emerald-100",
  },
  {
    id: "specialization",
    title: "Assistant Specialization",
    icon: Layers,
    bullets: [
      "Attach math or English tools as needed.",
      "Custom API tools extend capability.",
      "Keep prompts concise and directive.",
    ],
    bg: "bg-purple-50 border-purple-100",
  },
];

export function InfoCards() {
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("infoCards");
    if (saved) setDismissed(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("infoCards", JSON.stringify(dismissed));
  }, [dismissed]);

  const visible = defaultCards.filter((c) => !dismissed.includes(c.id));

  const dismiss = (id: string) => setDismissed((prev) => [...prev, id]);

  return (
    <div className="flex flex-col gap-4">
      {visible.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className={`relative w-full rounded-2xl border ${card.bg} p-4 shadow-sm`}
          >
            <button
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              onClick={() => dismiss(card.id)}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-slate-700" />
              <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              {card.bullets.map((b, idx) => (
                <li key={idx}>• {b}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

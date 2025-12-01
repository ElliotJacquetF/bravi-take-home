import type { ToolDefinition, ToolExecutionResult, ToolSchema } from "./types";
import { executeCodeInWorker } from "./executeCode";

const strictParams = (properties: Record<string, unknown>, required: string[]): ToolSchema["parameters"] => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

const mathTool = (name: string, description: string): ToolDefinition => ({
  id: name,
  name,
  description,
  kind: "math",
  schema: {
    type: "function",
    name,
    description,
    strict: true,
    parameters: strictParams(
      {
        a: { type: "number", description: "First operand" },
        b: { type: "number", description: "Second operand" },
      },
      ["a", "b"]
    ),
  },
});

const englishTool = (name: string, description: string, properties: Record<string, unknown>): ToolDefinition => ({
  id: name,
  name,
  description,
  kind: "english",
  schema: {
    type: "function",
    name,
    description,
    strict: true,
    parameters: strictParams(properties, Object.keys(properties)),
  },
});

export const mathTools: ToolDefinition[] = [
  mathTool("addition", "Add two numbers."),
  mathTool("subtraction", "Subtract b from a."),
  mathTool("multiplication", "Multiply two numbers."),
  mathTool("division", "Divide a by b (non-zero divisor)."),
];

export const englishTools: ToolDefinition[] = [
  englishTool("word_count", "Count words in the given text.", {
    text: { type: "string", description: "The text to analyze" },
  }),
  englishTool("letters_count", "Count letters in the given text (ignore whitespace).", {
    text: { type: "string", description: "The text to analyze" },
  }),
  englishTool("most_used_word", "Return the most frequent word in the text.", {
    text: { type: "string", description: "The text to analyze" },
  }),
  englishTool("letter_frequency", "Return letter frequency counts.", {
    text: { type: "string", description: "The text to analyze" },
  }),
];

export const executeCodeTool: ToolDefinition = {
  id: "execute_code",
  name: "execute_code",
  description: "Execute small, pure JavaScript snippets in a sandboxed worker and return their result. Always include an explicit return in the code.",
  kind: "code",
  schema: {
    type: "function",
    name: "execute_code",
    description: "Run JavaScript code in a sandboxed worker. Only language: javascript. Code must explicitly return a value.",
    strict: true,
    parameters: strictParams(
      {
        language: { type: "string", description: "Language to execute (must be 'javascript')" },
        code: { type: "string", description: "Small JavaScript snippet to execute; should return a value" },
      },
      ["language", "code"]
    ),
  },
};

export const plannerTool: ToolDefinition = {
  id: "planner",
  name: "planner",
  description: "Create a brief numbered plan and assign each step to the right assistant.",
  kind: "planner",
  schema: {
    type: "function",
    name: "planner",
    description: "Return ONLY JSON plan: {\"steps\":[{\"id\":\"1\",\"question\":\"...\",\"assistant\":\"assistantId\",\"notes\":\"...\"}]}",
    strict: true,
    parameters: strictParams(
      {
        query: { type: "string", description: "User query to solve" },
        assistants: {
          type: "array",
          description: "Assistant roster with triggers and tools",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              triggers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    to: { type: "string" },
                    trigger: { type: "string" },
                  },
                  required: ["to", "trigger"],
                  additionalProperties: false,
                },
                description: "Edges from this assistant to others",
              },
              tools: {
                type: "array",
                items: { type: "string" },
                description: "Tool names/ids attached",
              },
            },
            required: ["id", "name", "triggers", "tools"],
            additionalProperties: false,
          },
        },
        context: { type: "string", description: "Recent conversation or notes (optional)" },
      },
      ["query", "assistants", "context"]
    ),
  },
};

const sanitizeToolName = (name: string) => {
  const cleaned = name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const collapsed = cleaned.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  return collapsed || "custom_api";
};

export const buildCustomApiTool = (id: string, name: string, url: string, method: "GET" | "POST", params: Record<string, unknown>): ToolDefinition => {
  const safeName = sanitizeToolName(name);
  return {
    id,
    name: safeName,
    description: `API call to ${url} with method ${method}.`,
    kind: "customApi",
    config: { url, method, params },
    schema: {
      type: "function",
      name: safeName,
      description: "Call the configured API endpoint.",
      strict: true,
      parameters: strictParams(
        {
          payload: {
            type: "object",
            description: "Request parameters",
            properties: params,
            required: Object.keys(params),
            additionalProperties: false,
          },
        },
        ["payload"]
      ),
    },
  };
};

export const prebuiltTools: ToolDefinition[] = [...mathTools, ...englishTools, executeCodeTool, plannerTool];
export const transferTool: ToolDefinition = {
  id: "transfer",
  name: "transfer",
  description: "Transfer the conversation to another assistant by id.",
  kind: "math", // kind unused for transfer
  schema: {
    type: "function",
    name: "transfer",
    description: "Handoff to another assistant by specifying its id and reason.",
    strict: true,
    parameters: strictParams(
      {
        targetId: { type: "string", description: "Assistant id to transfer to" },
        reason: { type: "string", description: "Why this transfer is needed" },
      },
      ["targetId", "reason"]
    ),
  },
};

// Local executors (sync/async) for built-in tools.
export async function executeLocalTool(tool: ToolDefinition, args: Record<string, unknown>): Promise<ToolExecutionResult> {
  try {
    switch (tool.kind) {
      case "code":
        return await handleExecuteCode(args);
      case "planner":
        return await handlePlanner(args);
      case "math":
        return { output: String(handleMath(tool.id, args)) };
      case "english":
        return { output: JSON.stringify(handleEnglish(tool.id, args)) };
      case "customApi":
        return await handleCustomApi(tool, args);
      default:
        return { output: "", error: "Unsupported tool kind" };
    }
  } catch (err) {
    return { output: "", error: err instanceof Error ? err.message : "Tool execution failed" };
  }
}

function handleMath(name: string, args: Record<string, unknown>): number {
  const a = Number(args.a);
  const b = Number(args.b);
  if (Number.isNaN(a) || Number.isNaN(b)) throw new Error("Invalid operands");
  if (name === "addition") return a + b;
  if (name === "subtraction") return a - b;
  if (name === "multiplication") return a * b;
  if (name === "division") {
    if (b === 0) throw new Error("Division by zero");
    return a / b;
  }
  throw new Error("Unknown math tool");
}

function handleEnglish(name: string, args: Record<string, unknown>) {
  const text = String(args.text ?? "");
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (name === "word_count") return { count: words.length };
  if (name === "letters_count") {
    const letters = text.replace(/\s+/g, "");
    return { count: letters.length };
  }
  if (name === "most_used_word") {
    const freq = new Map<string, number>();
    for (const w of words) freq.set(w.toLowerCase(), (freq.get(w.toLowerCase()) ?? 0) + 1);
    let best = "";
    let max = 0;
    freq.forEach((v, k) => {
      if (v > max) {
        best = k;
        max = v;
      }
    });
    return { word: best, count: max };
  }
  if (name === "letter_frequency") {
    const freq: Record<string, number> = {};
    for (const ch of text.replace(/\s+/g, "").toLowerCase()) {
      freq[ch] = (freq[ch] ?? 0) + 1;
    }
    return freq;
  }
  throw new Error("Unknown english tool");
}

async function handleCustomApi(tool: ToolDefinition, args: Record<string, unknown>): Promise<ToolExecutionResult> {
  const config = tool.config as { url: string; method: string; params?: Record<string, unknown> } | undefined;
  if (!config) return { output: "", error: "Missing custom API config" };
  const payload = (args.payload as Record<string, unknown>) ?? {};
  const method = (config.method ?? "GET").toUpperCase();
  let url = config.url;
  // For GET, append query params
  if (method === "GET" && payload && typeof payload === "object") {
    const qs = new URLSearchParams();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.append(k, String(v));
    });
    if (Array.from(qs.keys()).length > 0) {
      url += (url.includes("?") ? "&" : "?") + qs.toString();
    }
  }
  try {
    const headers: Record<string, string> = {};
    if (method !== "GET") headers["Content-Type"] = "application/json";
    const res = await fetch(url, {
      method,
      headers,
      body: method === "GET" ? undefined : JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { output: JSON.stringify({ status: res.status, data }) };
  } catch (err) {
    return { output: "", error: err instanceof Error ? err.message : "Custom API call failed" };
  }
}

async function handlePlanner(args: Record<string, unknown>): Promise<ToolExecutionResult> {
  // Planner is executed via LLM in ChatPanel; here we simply echo the provided plan field if present.
  if (args.plan) return { output: String(args.plan) };
  return { output: JSON.stringify({ steps: [] }) };
}

async function handleExecuteCode(args: Record<string, unknown>): Promise<ToolExecutionResult> {
  const language = String(args.language ?? "").toLowerCase();
  const code = typeof args.code === "string" ? args.code : "";
  if (language !== "javascript") {
    return { output: JSON.stringify({ ok: false, error: "Only 'javascript' is supported in this demo." }) };
  }
  if (!code.trim()) {
    return { output: JSON.stringify({ ok: false, error: "No code provided." }) };
  }
  const result = await executeCodeInWorker(code);
  return { output: JSON.stringify(result) };
}

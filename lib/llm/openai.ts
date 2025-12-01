type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string }
  | { role: "assistant"; tool_calls: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

type ToolSchema = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    strict?: boolean;
  };
};

type OpenAIResponse = {
  choices: Array<{
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: ToolCall[];
    };
  }>;
};

export async function runOpenAIChat(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  tools: ToolSchema[];
  messages: ChatMessage[];
  toolChoice?: "auto" | "none" | { type: "function"; name: string } | { type: "allowed_tools"; mode: "auto" | "required" | "none"; tools: { type: "function"; name: string }[] };
}): Promise<OpenAIResponse> {
  const { apiKey, model, systemPrompt, tools, messages, toolChoice } = params;
  const body = {
    model,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    tools,
    tool_choice: toolChoice ?? "auto",
    parallel_tool_calls: false,
    stream: false,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${errText}`);
  }

  return (await res.json()) as OpenAIResponse;
}

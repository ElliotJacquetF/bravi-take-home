Bravi tech stack : 
- Languages: TypeScript, Python
- AI/ML: OpenAI, Anthropic, Vapi for voice processing
- Frameworks: Next.js, React, React Native
- Database: PostgreSQL, Supabase
- UI: shadcn/ui, Tailwind CSS
- Deployment: Vercel, Inngest

## Goal & Scope
- Build a client-only Next.js 14 app with React Flow to configure assistants and tools, run LLM function-calling chats, visualize tool calls and assistant transfers, and load templates. API key is entered in UI and stored locally; no backend/auth/db.
- Part 1: single Main Assistant with editable prompt, attachable math/English tools + configurable Custom API tool, chat with restart, and tool-call highlighting.
- Part 2: multiple assistants, directed edges for transfers, prompt-driven routing, canvas/chat visualization of handoffs, templates (main+math+english, plus a second template like "Teacher" with routing prompts). Bonus: optional coding assistant with safe `execute_code`.

## Stack Choices
- Next.js 14 (App Router), TypeScript, React, React Flow (`@xyflow/react`), Tailwind CSS + shadcn/ui.
- State: Zustand.
- LLM: OpenAI function calling first; adapter ready for Anthropic tool use.
- Tooling: npm (no pnpm). Tests with Vitest + React Testing Library + happy-dom.

## Architecture Overview
- Client shell: canvas + sidebar + chat panel.
- State store (Zustand): assistants, tools, edges, active assistant, conversation, in-flight tool/transfer highlights.
- LLM adapter: maps assistant prompt + attached tools (strict JSON schemas) to provider calls; executes tool-call loop.
- Tool runtime: local math/English, Custom API via fetch (user-defined URL/method/params), transfer tool to switch assistants.
- Templates loader: resets graph to predefined squads.

## Data Model (lean)
- Assistant: {id, name, systemPrompt, toolIds, nonDeletable?}.
- Tool: {id, name, description, kind (math|english|customApi|transfer), schema, config?}.
- Edge: {id, from, to} defining allowed transfers.
- ConversationTurn: {id, role (user|assistant|tool|transfer), content, toolCall?, toolResult?, transferEvent?}.
- Runtime: {activeAssistantId, inFlightToolId?, inTransfer?, error?}.

## Tool/LLM Integration
- Strict JSON schemas, small tool set per assistant; `parallel_tool_calls` disabled; `allowed_tools` scoped to attached tools + transfer tool.
- Loop: send messages + tools → model may emit tool_call → execute locally → append tool_call_output → continue → stop on final answer.
- Transfer modeled as a tool: args include targetAssistantId (validated against edges) + rationale; switches `activeAssistantId`, logs chat event, highlights new node.
- Custom API tool: user-configured schema + endpoint/method/params; executed via fetch with error handling. Streaming optional for argument-fill highlights.

## Multi-Assistant Orchestration
- Single active assistant highlighted on canvas; tool badges highlight when running.
- Directed edges gate transfers; invalid targets rejected with prompt to pick a valid edge.
- Shared conversation history survives transfers so specialists see prior context.
- Prompts per assistant: domain remit, when to answer vs. transfer, use only attached tools, be concise.
- Main Assistant is non-deletable and the conversation entry point.
- Template selection clears current graph, loads prebuilt squad (Main + Math + English + edges) or second template (e.g., Teacher), resets active assistant to Main. Restart conversation clears chat only (keeps current graph).

## UI/UX Plan
- Canvas (React Flow): custom AssistantNode showing name, tool badges, active/highlight states; edges drawn for transfers; minimap/controls.
- Sidebar: assistant list, prompt editor, tool attachments; template selector.
- Tool Library: predefined math/English tools; Custom API configurator (URL, method, params); attach/detach actions.
- Chat Panel: conversation feed with tool-call/result/transfer events; input box; restart conversation button.
- Status cues: active assistant glow, live tool-call highlight while executing, edge flash on transfer; error toasts/messages for failed tools/transfers.

## Testing (npm)
- Vitest + RTL + happy-dom.
- Unit: tool executors (math/English/custom API with fetch mocked), transfer validator, template loader.
- Store: attach/detach tools, set active assistant, transfer changes `activeAssistantId`, restart/template reset.
- Component smokes: AssistantNode renders badges/active; ToolLibrary attach/detach updates store; ChatPanel renders/clears.
- Small integration: mock LLM adapter to emit tool_call → tool_result → final answer; assert chat log and highlights.
- Commands: `npm test`, `npm run test:watch`.

## Milestones / Tasks
1) Scaffold Next.js + Tailwind + shadcn + React Flow; base layout.
2) Types + Zustand store for assistants/tools/edges/conversation/runtime.
3) Tool library UI + executors; Custom API configurator; attach/detach.
4) Main assistant UI: non-deletable node, prompt editor, tool badges, restart chat.
5) LLM loop integration: tool-calling, local execution, error surfacing, highlights.
6) Multi-assistant + transfers: add nodes/edges, transfer tool/logic, active highlights, chat announcements.
7) Templates: load/clear squads (main-only; main+math+english; second template such as Teacher with routing prompts).
8) Optional bonus: coding assistant + safe `execute_code` tool; add template.
9) Polish: UI tweaks, README design decisions, deploy to Vercel (later), keep API key local.

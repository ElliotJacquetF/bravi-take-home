# Bravi Take-Home — Assistant Squad Builder

Client-side Next.js app to build, route, and test AI assistants with tools on a React Flow canvas (no backend, all in the browser).

---

## Setup & Run

```bash
npm install
npm run dev
```

Then:

- Open http://localhost:3000
- Enter your OpenAI API key in the chat panel (stored only in localStorage)
- Pick a model (gpt-5.1 by default)
- Use the canvas + chat to build and test your assistant squad

---

## Design Decisions

### State Management
- Zustand single store (`hooks/useStore.tsx`) holds:
  - Assistants (id, name, system prompt, attached tools)
  - Directed transfer edges between assistants (with human-readable triggers)
  - Tool library (math, English, code exec, planner, custom API, etc.)
  - Canvas layout (node positions)
  - Conversation transcript + runtime state: active assistant, in-flight tool calls, optional execution plan
- This keeps React components dumb and pushes orchestration + graph state into a central store.

### Transfers & Orchestration
- Each directed edge A → B is backed by a transfer tool:
  - Tool name derived from the target assistant
  - Description includes the user-defined trigger
- When the LLM calls a transfer tool:
  - The app updates the active assistant in the store
  - A single “Transfer: A → B (reason…)” message is added to chat
  - The corresponding edge and new active node are visually highlighted on the canvas
- Canvas uses custom Manhattan edges (orthogonal-ish routing) with inline edit/delete buttons on each edge.

### Prompt Engineering Strategy
- Main Assistant (router + planner):
  - Acts as the entrypoint.
  - Must call the planner tool when a query requires multiple steps/subtasks to get a plan, then transfer to the first step.
  - For very simple single-step queries: can route/answer directly with its tools.
- Specialist Assistants (Math, English, Coding, etc.):
  - System prompts constrain them to their domain.
  - Prefer tools; transfer when out-of-scope.
  - Follow the plan from Main when present; avoid re-planning.
- This approximates a query-decomposition agent: plan once at the top via the planner tool, then route and execute via specialists with function calling.

---

## What I Would Add With More Time
- Assistant templates & orchestrators:
  - More predefined assistant templates (e.g. teacher, coding tutor, support bot).
  - Distinct “router/orchestrator” assistant templates that can be used for orchestration.
- Backend & persistence:
  - Lightweight backend (or edge functions) to persist squads/templates/layouts.
  - Conversations and plans across time and browsers.
  - Cleaner, more robust deployment setup.
- MCP & external tools:
  - Integrate MCP-style tool access to connect assistants to external APIs/services in a standard way.
  - UI for discovering and attaching MCP tools to assistants.
- Multimodal integrations:
  - Audio input/output for conversations.
  - Image tools (describe, caption, OCR) wired as assistant tools on the canvas.

---

## Live Demo
- Vercel: https://bravi-take-home.vercel.app/
- Loom walkthrough: https://www.loom.com/share/9d601f8ccdcc4f04bada90a27c7c3d6b

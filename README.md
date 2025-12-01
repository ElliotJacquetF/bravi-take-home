## Bravi Take-Home — Assistant Squad Builder (Client Only)

Canvas + chat app to build, route, and test AI assistants with tools. Supports single- and multi-assistant squads, transfer routing, templates, custom API tools, and live OpenAI function calling.

## Setup & Run
```bash
npm install
npm run dev
```
Open http://localhost:3000 and enter your OpenAI API key in the chat panel input (stored locally in `localStorage`). Default model is `gpt-5` (you can switch to `gpt-5-nano` in the dropdown).

## Testing
```bash
npm test
```
Vitest + React Testing Library + happy-dom (act warnings currently emitted in tests).

## Features
- React Flow canvas with draggable assistants, top/bottom handles, Manhattan edges with inline edit/delete controls, and active/highlight states.
- Planner-first orchestration: Main plans (JSON plan), then routes via transfer tools; plan is injected into specialists’ prompts.
- Multi-assistant squads: add assistants, edit prompts/tools, configure transfers with triggers; templates for Main+Math+English and Main+Weather.
- Tooling: built-in math/English tools, Custom API tool builder, per-assistant tool attachment, local tool execution.
- Chat panel: conversation history, active assistant display, transfer announcements, tool highlight, restart conversation, model picker.

## Design Decisions
- State: Zustand store with multi-squad support (assistants, edges, node positions, tool library, conversation, runtime, plan).
- Orchestration: Two-phase Main call (plan with tools disabled → route with transfer tool). Specialists receive the plan in a preamble and must stay in-domain, transferring when needed. Iteration cap raised to 20.
- Transfers: One transfer tool per outgoing edge; transfers add a chat “Transfer” turn but suppress tool call/result spam for transfers.
- Layout: Default template positions place specialists below Main, widely spaced; fitView defaults to a slightly zoomed-out viewport.
- Prompts: Main enforces planning + routing; specialists are allowed to answer directly if a needed tool is missing but prefer tools and transfers.

## What I’d Add With More Time
---
## Live Demo
---

## AGENT PLAYBOOK (Codex)

Purpose: How the AI agent works in this repo so behavior is predictable and safe.

### Scope
- Implement features, UI, tests, and docs for the assistant orchestrator. No backend/auth/db work. Keep API keys local only.

### Commands & Approvals
- Ask user before running any terminal command (except `npm test` / `npm run test:watch` when explicitly asked to tes or read-only commands these can be performed without my authorization but try to keep them limited to not use too much context).
- No package installs without explicit approval. No network access unless approved.

### Editing Rules
- Use `apply_patch` for single-file edits. Keep files ASCII unless already using Unicode.
- Add comments only when clarifying non-obvious logic.
- Never revert or overwrite user changes. Do not stage/commit changes unless explicitly requested.
- No destructive git commands (`git reset --hard`, `git checkout --`, etc.).

### Stack Notes
- Next.js 14 App Router, TypeScript, React Flow, Tailwind + shadcn/ui, Zustand.
- LLM integration via function/tool calling (OpenAI first; Anthropic adapter possible). API keys collected in UI, stored locally (not committed).
- Client-only: all state in browser; no backend.
- Always read `design-page.md` at session start and treat it as the source of truth for the plan.

### Testing
- Use npm (not pnpm/yarn). Fast tests with Vitest + React Testing Library + happy-dom.
- Whenever code changes are made, run `npm test` (or `npm run test:watch`) unless the user explicitly says to skip; report results concisely.
- Mock LLM/fetch in tests; keep tests deterministic and quick.

### UX/Behavior Expectations
- Canvas highlights active assistant and running tool; chat announces transfers/tool calls.
- Keep prompts concise and routing-focused; surface errors in chat/UI.

### Safety & Git
- Do not add, stage, or commit git changes unless the user asks.
- If unexpected repo changes appear, pause and ask the user.

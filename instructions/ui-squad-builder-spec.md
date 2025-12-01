# Squad Builder – UI & Interaction Specification

This document describes the **visual design** and **UX behavior** of the Squad Builder app, inspired by the Bravi screenshot, for implementation in **Next.js 14 + React Flow + Tailwind + shadcn/ui**.

The coding agent should treat this as the source of truth for layout and components.  
Functionality / state management is described at a high level; low-level architecture is in a separate doc.

---

## 1. High-Level Layout

### 1.1 Pages / Routes

- **Home / Squads List (`/`)**
  - Displays existing squads and a “New Squad” entry flow.
  - Also exposes a “Tools” entry point to inspect all tools.
- **Tools Overview (`/tools`)**
  - Lists all defined tools (math, English, custom APIs).
  - For now it is view-only; testing tools can be added later.
- **Squad Builder (`/squads/[id]`)**
  - Main screen that mimics the Bravi screenshot.
  - Layout:
    - Top header bar
    - Tab bar (“Workflow”, etc.)
    - Main area:
      - Left informational column (cards)
      - Center canvas (React Flow)
      - Floating “Add Assistant” pill at bottom center
    - Right side overlays (Assistant config, API payload sheet)
    - Sliding chat panel from the **left** when testing a squad.

---

## 2. Theme

- **Light theme only** for now.
- Colors should be chosen to be readable on a light background; no dark-mode styles are required.

---

## 3. Squad Builder Header

### 3.1 Top Left

- **Back arrow button**
  - Icon: left arrow (e.g. `ArrowLeft`).
  - Clicking navigates back to **Home / Squads List**.
  - Layout: icon + squad name text.

- **Squad name**
  - Text: e.g. `Squad Darty`.
  - Style:
    - `text-xl font-semibold` (or similar).
    - Placed immediately to the right of the back arrow.

- **Status pill**
  - Small dot + text, e.g. “● Up to date”.
  - Green dot, neutral text.
  - Placed right after squad name with a small gap.

### 3.2 Top Right Controls

Aligned right, in a horizontal row with small spacing:

1. **View API Payload** (secondary button)
   - Icon on left (e.g. `FileText`).
   - Opens a **right-side sheet** with:
     - A formatted JSON preview of the current squad config (assistants, tools, edges).
     - A small section for **API usage info** (model name, provider).
     - **API key input**:
       - Label: `OpenAI API Key`.
       - Password-style text input.
       - Helper text: “Stored locally in your browser (localStorage). Not sent anywhere else.”
       - “Save” button to persist key locally.

2. **Test Squad** (secondary button)
   - Icon: `Play`.
   - Clicking toggles the **Chat Panel** visibility (see section 7).
   - When the chat is open, the button can appear pressed or change label to “Close Chat”.

3. **Save Changes** (primary button)
   - Prominent filled button (e.g. `bg-indigo-500 text-white`).
   - Icon optional (e.g. `Save`).
   - Can:
     - Trigger a “Saved” toast and/or
     - Persist squad state to `localStorage`.

> **Note:** There is **no Share Link button** in this design.

---

## 4. Tabs Under Header

Directly under the top bar, full width:

- Use shadcn `Tabs` if convenient.
- Tabs:
  - `Workflow` (default)
  - `General Settings`
  - `Preview` (optional / placeholder)
- For this assignment:
  - `Workflow` shows the canvas and info cards (main content).
  - `General Settings` can hold squad-level settings (even if minimal).
  - `Preview` can be a stub or reused for future features.

---

## 5. Workflow View Layout

Below the tabs:

### 5.1 Background

- Full-page light background with a **subtle dotted grid** to mimic a design canvas.
  - Implement via React Flow background (dot type) or a CSS pattern.
- The page should feel airy and minimal with generous white space.

### 5.2 Left Informational Column

- Column of 2–3 **info cards** pinned to the left side (similar to the screenshot):
  - Example cards:
    - “How Squads Work”
    - “Transfer Logic”
    - “Assistant Specialization”
  - Each card:
    - shadcn `Card` with:
      - Soft pastel background (blue / green / purple).
      - `rounded-2xl`, `border`, subtle `shadow-sm`.
    - Content:
      - Title row with small icon + title text.
      - 2–4 bullets explaining concepts.
    - Small “X” in top-right to close.

- **Persistence rule:**
  - When a squad is **first created**, all cards are visible.
  - If a user closes/dismisses a card for a given squad, it stays dismissed for that squad on subsequent visits.
  - Implementation detail: store this per-squad in local state plus `localStorage` (or squad metadata).

### 5.3 React Flow Canvas (Center)

- Occupies most of the horizontal space.
- Shows:
  - Assistant nodes (custom node type).
  - Transfer edges (directed).
- React Flow features:
  - Zoom controls at bottom-left (e.g. + / – / fit view).
  - Optional minimap at bottom-right.
  - Panning by dragging empty space.

---

## 6. Assistants: Node Design & Behavior

### 6.1 Node Layout

Each assistant is rendered as a **card-like node**:

- **Overall**
  - `rounded-2xl`
  - `bg-white`
  - `border border-slate-200`
  - `shadow-sm`
  - Padding inside (e.g. `p-3` or `p-4`).

- **Header row (top)**
  - Left → right:
    1. **Drag handle**
       - Icon: “6 dots” (e.g. `GripVertical`).
       - Acts as visual cue that node is draggable.
    2. **Assistant name**
       - Example: “Assistant Principal – Darty”.
       - Styling: `text-sm font-medium`, truncated with ellipsis if long.
    3. **Badges**
       - For the **Main Assistant**, show a “Main” badge:
         - `bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full`.
    4. **Top-right icons**
       - Optional duplicate/cloned icon.
       - **Bin icon (delete)**:
         - Visible and clickable for **non-main** assistants.
         - **Hidden or disabled** for the **Main Assistant**.
         - On click, show a confirmation dialog before removal.

- **Body area**
  - Two sections stacked vertically:

  1. **Tools strip**
     - Displays all tools attached to this assistant.
     - Each tool shown as a pill/badge:
       - Example label: `addition`, `most_used_word`, `Custom API: get_weather`.
       - Styling:
         - `inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full`
         - Neutral or category-based background (e.g. math = blue, English = violet, custom API = teal).
     - Long tool lists wrap onto multiple lines.

  2. **Action buttons row**
     - At bottom of node:
       - **Edit** (left)
         - shadcn `Button` with `size="sm"` and `variant="outline"` or `ghost`.
         - Opens **Assistant Config panel** (see 6.3).
       - **Destination** (right or next to Edit)
         - Same button style.
         - Opens **Destination panel** (see 6.4).

- **System prompt is not shown** on the node. Only name and tools appear on the node.

### 6.2 States & Highlights

- **Active assistant**
  - The assistant that currently handles conversation.
  - Visual:
    - Border changes to `border-indigo-500`.
    - Slight glow: e.g. `shadow-[0_0_0_2px_rgba(79,70,229,0.25)]`.

- **Tool in use**
  - When a tool is executing:
    - The corresponding tool badge in that node:
      - Gains highlighted background (e.g. `bg-amber-100`) and subtle pulse animation.
    - Alternatively, the entire node can pulse; but at minimum the badge should change.

- **Transfer in progress**
  - When the transfer tool fires between assistants:
    - The React Flow edge representing source → target briefly:
      - Changes color (e.g. to indigo).
      - Optionally pulses/fades.
    - A message appears in the chat log (see section 7).

### 6.3 Assistant Config Panel (Edit)

- Trigger: click **Edit** on any assistant node.
- Appears as a **right-side sheet** overlaying the canvas (header and tabs remain visible).
- Contents:
  - **Assistant name input**
  - **System prompt textarea** (multi-line, resizable).
  - **Tool attachment section**:
    - For each available tool (from library), show:
      - Tool name, type, short description.
      - Checkbox or toggle to mark it attached to this assistant.
    - Attached tools here should match the badges shown on the node.
  - Main Assistant:
    - Same config, except no delete capability.

### 6.4 Destination Panel

- Trigger: click **Destination** on an assistant node.
- Appears as a modal or right-side sheet.
- Purpose: configure **valid transfer targets** for this assistant.
- Contents:
  - List of other assistants with toggles/checkboxes:
    - Each row: assistant name + short description (optional) + checkbox.
  - On save:
    - React Flow edges are updated to match selected destinations (directed edges from current assistant to checked assistants).
  - This panel can also show a small note: “Transfers are only allowed along these edges”.

---

## 7. Add Assistant

At the **bottom center** of the canvas area, overlaying the grid, there is a large “Add Assistant” pill:

- Style:
  - Card-like pill:
    - `rounded-2xl`
    - `border border-dashed border-slate-300`
    - `bg-neutral-50`
    - `shadow-sm`
    - Padding like `px-5 py-3`
  - Content:
    - Left icon: user-plus (e.g. `UserPlus`).
    - Text: `Add Assistant`.
    - Right icon: `+`.

- Behavior:
  - On click, open a dialog with:
    - Assistant name input (required).
    - Template/role dropdown:
      - `Blank Assistant` (no tools attached).
      - `Math Assistant` (pre-attach all math tools).
      - `English Assistant` (pre-attach all English tools).
      - (No Teacher or Coding template for now.)
  - After creation:
    - New node is placed in the layout (e.g. centered near bottom).
    - No edges are created automatically, unless you choose to add simple defaults later (optional).

---

## 8. Home / Squads List Page (`/`)

The home page is simple and clean.

### 8.1 Header

- App title, e.g. `Assistant Squads`.
- Optional subtitle: “Build and orchestrate multi-agent assistants.”

### 8.2 Squads List

- Grid or column of cards; each card is a squad:

  - Squad card content:
    - Squad name.
    - Optional metadata: “Last edited X”.
    - “Open” button (primary or outline).
  - Clicking card or Open button navigates to `/squads/[id]`.

### 8.3 New Squad

- A prominent **“Create New Squad”** button or card:

  - On click, open dialog with:
    - Squad name input.
    - Template selector (radios or cards):
      - `Blank Squad`
        - Only Main Assistant is created.
      - `Math + English Squad`
        - Main Assistant + Math Assistant + English Assistant.
        - Edges: Main → Math, Main → English.
    - Confirm → create the squad, then navigate to its builder page.

### 8.4 Tools Overview Entry

Below the list of squads (or in the header area), add a clear button or card:

- Label: `View All Tools` or `Tools`.
- Style: secondary card/button.
- Clicking navigates to **`/tools`** (Tools Overview page).

---

## 9. Tools Overview Page (`/tools`)

This page shows all tools defined in the system.

### 9.1 Layout

- Title: `Tools`.
- Subtext: “Browse all tools available to your assistants. You’ll attach tools from each assistant’s Edit panel.”

### 9.2 Tool List

- Group by category:

  - **Math Tools**
    - addition(a, b)
    - subtraction(a, b)
    - multiplication(a, b)
    - division(a, b)
  - **English Tools**
    - word_count(text)
    - letters_count(text)
    - most_used_word(text)
    - letter_frequency(text)
  - **Custom API Tools**
    - List any user-created custom API tools (e.g. `get_weather`).

- Each tool:
  - Card or list row with:
    - Name
    - Category (Math / English / Custom API)
    - Description
    - (Optional for future): A “Test” or “Run” button (can be disabled or not implemented yet).

- Optional button: **“Create Custom API Tool”**
  - Opens a dialog to configure a new custom API tool:
    - Name
    - Endpoint URL
    - Method (GET/POST)
    - Parameters definition (name/type/description).
  - On save, tool is added to the global tool library and visible in both `/tools` and assistant Edit panels.

---

## 10. Templates (Behavior + Visual)

At squad creation time, templates define initial canvas configuration.

### 10.1 Blank Squad

- One **Main Assistant** node is created:
  - Centered at the top of the canvas.
  - Has the `Main` badge.
  - No tools attached initially (or minimal default if you prefer).
  - No edges.

### 10.2 Math + English Squad

- Nodes:
  - Main Assistant at top center (with `Main` badge).
  - Math Assistant at bottom-left.
  - English Assistant at bottom-right.
- Tools:
  - Math Assistant:
    - All math tools attached.
  - English Assistant:
    - All English tools attached.
- Edges:
  - Directed edges:
    - Main → Math
    - Main → English

> No Teacher template is needed for now.

---

## 11. Chat / Test Squad Panel

Triggered by the **Test Squad** button.

### 11.1 Layout

- Slides in from the **left side** of the viewport.
- Width ~35–40% of viewport on desktop.
- Height: full viewport height minus main header.
- Styling:
  - `bg-white`, `border-r border-slate-200`, `shadow-lg`.
  - Z-index high enough to sit above React Flow canvas.

### 11.2 Contents

- **Header**
  - Title: `Test Squad`.
  - Subtitle: `Active assistant: <Name>`.
  - Close icon (X) on the right; clicking closes the panel (and toggles button state).

- **Conversation area**
  - Scrollable vertical list of messages (most recent at bottom).
  - Message types:

    1. **User message**
       - Right-aligned bubble.
       - Background: light indigo or neutral.
       - Label: optional small “You” tag.

    2. **Assistant message**
       - Left-aligned bubble.
       - Shows assistant name above bubble (e.g. “Math Assistant”).
       - Neutral background.

    3. **Tool call event**
       - System-style row, different styling (no bubble):
         - Text example:  
           `Main Assistant → calling tool "addition" with { "a": 5, "b": 3 }`
       - Use monospaced font for arguments.

    4. **Transfer event**
       - System row:
         - `Transferring conversation from Main Assistant to English Assistant…`

- **Input area**
  - Fixed at bottom of panel.
  - Contains:
    - Text input/textarea for user message.
    - Primary “Send” button.
    - Secondary “Restart Conversation” button:
      - Clears the conversation history for this squad test session.
      - **Does not** change graph (assistants, tools, edges).

---

## 12. Tool Library Integration (Runtime vs UI)

- **Attaching/detaching tools to assistants**
  - Done **only through the Assistant Config (Edit) panel**:
    - The panel shows all tools from the global library.
    - User can toggle tools on/off per assistant.
  - The node’s tool badges should reflect this set.

- **Tool Library display on Squad Builder page**
  - A separate panel (right-side or bottom dock) may be added later if desired, but is **not required** for attaching tools.
  - The main, guaranteed place to view and toggle tools for a specific assistant is the Edit panel.

---

## 13. Visual Style Summary

- **Colors**
  - Background: light gray/neutral (e.g. `bg-slate-50`).
  - Nodes & cards: `bg-white`, `border-slate-200`.
  - Primary accent: indigo/blue (for main buttons and active states).
  - Info cards: pale blue/green/purple backgrounds.
  - Active assistant: indigo border and glow.
  - Tool badges: soft neutrals or category-tinted.

- **Typography**
  - Use default app font (e.g. Inter/system).
  - Titles: `text-xl font-semibold`.
  - Node titles: `text-sm font-medium`.
  - Body text: `text-sm`.

- **Shape & Shadows**
  - Prefer `rounded-2xl` for nodes, info cards, and Add Assistant pill.
  - Use subtle shadows (`shadow-sm`, `shadow-md`) for depth.

---

## 14. Interaction Rules Summary

- **Main Assistant**
  - Always exists in every squad.
  - Marked with `Main` badge.
  - **Cannot be deleted.**

- **Assistants**
  - Draggable via handle.
  - Non-main assistants are deletable via bin icon (with confirmation).
  - Have `Edit` and `Destination` buttons.
  - Their tools are managed in the Edit panel; the node shows the resulting tool list.

- **Edges**
  - Directed, representing allowed transfer paths.
  - Created/updated based on Destination panel state or via React Flow handles.
  - Highlight briefly when a transfer occurs.

- **Chat / Test Squad**
  - Entry point is the current **active assistant**.
  - Transfers change the active assistant and update node highlight.
  - “Restart Conversation” resets chat history but preserves the graph and templates.

---

_End of UI spec._

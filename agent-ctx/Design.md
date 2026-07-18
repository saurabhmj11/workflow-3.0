# Design.md — UI/UX & Aesthetics
## OpenWorkflow 3.0

This document covers the visual identity, typography, theme, and component guidelines for the application.

---

## 1. Visual Theme & Colors

The platform uses a dark-mode optimized, modern aesthetic using standard Tailwind CSS v4 and `oklch` color spaces. The UI is built on top of `shadcn/ui` with custom variables.

### Core Color Palette (oklch)
- **Background**: `oklch(0.145 0 0)` (Dark Zinc)
- **Foreground**: `oklch(0.985 0 0)` (Light Text)
- **Primary**: `oklch(0.922 0 0)` 
- **Card/Popover**: `oklch(0.205 0 0)` (Slightly lighter than background)
- **Border/Input**: `oklch(1 0 0 / 10%)` for subtle borders.
- **Accents**: We use vivid gradients (e.g., `from-violet-600 to-cyan-500`) for branding, primary buttons, and icon containers.

### Design Tokens
- **Border Radius**: `0.625rem` (10px) as the base radius, resulting in slightly rounded, friendly yet professional corners.
- **Shadows**: Usage of colored shadows (e.g., `shadow-violet-500/20`) for emphasis on primary actions.
- **Glassmorphism**: Heavy use of `backdrop-blur-sm` and translucent backgrounds (e.g., `bg-zinc-900/80`) over subtle gradient backdrops.

---

## 2. Typography

- **Font Family**: Geist Sans (`var(--font-geist-sans)`) as the primary sans-serif font.
- **Monospace**: Geist Mono (`var(--font-geist-mono)`) for code blocks, JSON payloads, and node IDs.
- **Hierarchy**:
  - H1/Titles: Bold, high contrast (`text-zinc-100`).
  - Body: Medium contrast (`text-zinc-300`).
  - Small/Muted: Low contrast (`text-zinc-500`).

---

## 3. UI Components (shadcn/ui)

All standard UI elements must use the `shadcn/ui` primitive components located in `@/components/ui/`.
- **Buttons**:
  - Primary: Gradient backgrounds (`bg-linear-to-r from-violet-600 to-cyan-600`).
  - Secondary/Outline: `bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800`.
- **Cards**: Used for encapsulating forms, nodes, and dashboard panels.
- **Inputs**: `h-11` height, subtle borders with focus rings matching the brand violet (`focus-visible:ring-violet-500/20`).

---

## 4. Animations & Micro-interactions

Animations add a "premium" feel to the workflow execution and interactions.
- **Node Shake**: `.animate-node-shake` (0.4s ease-in-out) used for error states in the workflow canvas.
- **Pulse Glow**: `.animate-pulse-glow` (1.5s infinite) used for active/running nodes.
- **Transitions**: All hover states on buttons and links should have subtle transition utilities (`transition-colors`).

---

## 5. Icons

- We exclusively use **Lucide React** (`lucide-react`) for all iconography. 
- Stroke width should consistently be 2px (default).
- Never use emojis as structural UI icons.

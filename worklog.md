# OpenWorkflow — Sprint 1 Worklog

---
Task ID: 1
Agent: Main
Task: Fix React Flow screenToFlowPosition error

Work Log:
- Diagnosed `reactFlowRef.current?.screenToFlowPosition is not a function` error
- Root cause: @xyflow/react v12 ref prop doesn't forward ReactFlowInstance properly
- Fixed by using `onInit` callback to capture the instance instead of `ref`
- Changed `useRef<ReactFlowInstance>(null)` → `useRef<ReactFlowInstance | null>(null)`
- Changed `<ReactFlow ref={reactFlowRef}>` → `<ReactFlow onInit={(instance) => { reactFlowInstance.current = instance }}>`

Stage Summary:
- Drag-and-drop from Node Palette to canvas now works correctly
- screenToFlowPosition properly converts screen coordinates to flow coordinates

---
Task ID: 2
Agent: Subagent (full-stack-developer)
Task: Build Node Configuration Panel

Work Log:
- Created `/src/components/config/node-config-panel.tsx` with 470 lines
- Implemented CONFIG_SCHEMA covering all 24 node types with type-specific config fields
- Built ConfigField renderer supporting 7 field types: text, number, select, textarea, switch, array-string, array-object
- Added header with category icon/badge, editable label, node type info, close button
- Added ScrollArea for overflow, footer with destructive "Delete Node" button
- Updated page.tsx with onNodeClick/onPaneClick handlers, conditional right panel rendering
- Enhanced AgentNode with brighter ring/glow effect on selection

Stage Summary:
- Click any node → config panel opens in right sidebar
- Click canvas → deselects, shows Approval+Execution panels
- All 24 node types have meaningful config fields
- Config changes are immediate (no save button needed)

---
Task ID: 3
Agent: Subagent (full-stack-developer)
Task: Build Prisma schema + API routes for workflow persistence

Work Log:
- Replaced placeholder User/Post models with Workflow, XmlNode, Edge, Execution models
- Created `/src/lib/api-utils.ts` with shared serialization/response utilities
- Created `/src/app/api/workflows/route.ts` — GET (list) + POST (create)
- Created `/src/app/api/workflows/[id]/route.ts` — GET/PUT/DELETE single workflow
- Created `/src/app/api/workflows/[id]/execute/route.ts` — POST (trigger execution)
- Created `/src/app/api/executions/route.ts` — GET (list executions)
- Ran `prisma db push` successfully

Stage Summary:
- Full CRUD API for workflows with cascade delete
- Workflows stored with their nodes and edges in SQLite
- Execution records tracked with status, steps, costs
- API returns consistent `{ ok: true, data }` format

---
Task ID: 4
Agent: Subagent (full-stack-developer)
Task: Add visual execution states on nodes

Work Log:
- Added CSS keyframe animations: node-shake (error), pulse-glow (running)
- Updated AgentNode to read execution status from store using optimized selector
- Implemented visual states: Running (pulse glow + spinner), Success (green ring + check), Error (red ring + shake + X), Pending (dimmed)
- Added edge highlighting during execution: success=emerald, running=blue, error=red

Stage Summary:
- Nodes visually show execution progress in real-time
- Performance optimized: Zustand selector returns primitive to avoid unnecessary re-renders
- Error nodes shake, running nodes pulse, completed nodes glow green

---
Task ID: 5
Agent: Subagent (full-stack-developer)
Task: Add keyboard shortcuts + Save/Load functionality

Work Log:
- Added useEffect for keyboard shortcuts in page.tsx (Delete, Escape, Ctrl+Z/Y)
- Shortcuts disabled when focused on input/textarea/select
- Added workflowId/setWorkflowId to workflow store
- Created `/src/components/workflow/load-workflow-dialog.tsx` — dialog for loading saved workflows
- Added Save button (floppy disk icon) with POST/PUT logic
- Added Load button (folder open icon) that opens dialog
- Toast notifications for save/load/delete success/failure

Stage Summary:
- Delete/Backspace deletes selected node
- Ctrl+Z undo, Ctrl+Y redo, Escape deselects
- Save creates new or updates existing workflow via API
- Load dialog shows all saved workflows with delete option

---
Task ID: 6
Agent: Subagent (full-stack-developer)
Task: Build workflow templates

Work Log:
- Created `/src/lib/templates.ts` with 4 starter templates:
  1. Customer Support Triage (beginner, 7 nodes)
  2. Lead Qualification Pipeline (intermediate, 7 nodes)
  3. Incident Response Workflow (intermediate, 9 nodes)
  4. Content Review Pipeline (beginner, 7 nodes)
- Created `/src/components/workflow/template-gallery.tsx` — 2-column grid dialog
- Added Templates button (Lightbulb icon) to toolbar
- Added empty state overlay when canvas has 0 nodes
- Fixed HeadsetHelp → Headset icon (not available in lucide-react)

Stage Summary:
- 4 production-ready template workflows available
- Template gallery with category/difficulty badges and node flow preview
- Empty canvas shows "Start building" prompt with template button
- All templates include meaningful configs and correct edge handles

---
Build Verification (Sprint 1):
- `bun run lint` — passes clean
- `npx next build` — compiles successfully, all routes generated
- Dev server returns 200 on all pages
- API endpoints tested: GET /api/workflows returns `{ ok: true, data: [] }`

# OpenWorkflow — Sprint 2 Worklog

---
Task ID: 7
Agent: Subagent (full-stack-developer)
Task: Build Variable/Context System

Work Log:
- Created `/src/lib/variable-resolver.ts` — the template variable resolution engine
- Supports syntax: `{{nodes.nodeId.field}}`, `{{input.field}}`, `{{config.key}}`, `{{context.variables.key}}`, `{{bare_variable}}`
- `resolveVariables()` walks objects/arrays recursively, resolves all `{{...}}` templates
- `evaluateSimpleCondition()` handles `===`, `!==`, `>`, `>=`, `<`, `<=`, `||`, `&&`
- `simpleHash()` for deterministic classifier simulation
- Updated engine.ts to track `nodeOutputs` map and resolve config before each node execution
- Condition, switch, classifier nodes now use real expression evaluation

Stage Summary:
- Data flows between nodes via `{{variable}}` template resolution
- Condition nodes evaluate real expressions instead of random
- Classifier nodes produce deterministic results based on input hash
- Backward compatible — existing workflows without templates still work

---
Task ID: 8
Agent: Subagent (full-stack-developer)
Task: Build Real AI Execution + Enhanced Canvas UX

Work Log:
- Created `/src/app/api/ai/completions/route.ts` — server-side proxy using z-ai-web-dev-sdk
- Updated engine.ts LLM runner to call `/api/ai/completions` with config (model, temperature, systemPrompt)
- Falls back to simulated responses on API failure
- Installed @dagrejs/dagre for auto-layout
- Created `/src/lib/auto-layout.ts` — dagre-based left-to-right auto-layout
- Created `/src/components/edges/flow-edge.tsx` — custom edge with handle label badges
- Updated page.tsx: Layout button, custom edge types, edge labels from sourceHandle
- Updated node-palette.tsx: search input with real-time filtering

Stage Summary:
- LLM nodes call real AI API with simulated fallback
- Auto-layout button arranges nodes cleanly
- Custom edges show "true"/"false"/"approved"/"rejected" labels
- Palette has search/filter functionality

---
Task ID: 9
Agent: Subagent (full-stack-developer)
Task: Build Workflow Versioning

Work Log:
- Added WorkflowVersion model to Prisma schema (id, workflowId, version, snapshot, changeNote)
- Created `/src/app/api/workflows/[id]/versions/route.ts` — GET (list) + POST (create version)
- Created `/src/app/api/workflows/[id]/versions/[version]/route.ts` — GET (single) + POST (restore)
- Created `/src/components/workflow/version-history.tsx` — Sheet panel with timeline layout
- Updated page.tsx: Save creates version snapshot, Version History toolbar button
- Rollback creates new version entry (immutable history)

Stage Summary:
- Every save creates an immutable version snapshot
- Version history timeline with preview and restore
- Rollback is non-destructive (creates new version entry)
- Auto-increment version numbers per workflow

---
Task ID: 10
Agent: Subagent (full-stack-developer)
Task: Build MCP Integration Layer

Work Log:
- Added MCPServer and MCPTool models to Prisma schema
- Added MCPToolDefinition and MCPServerDefinition types to types.ts
- Created `/src/lib/mcp-defaults.ts` — 8 builtin tools with full JSON Schema definitions
- Created API routes: /api/mcp/servers, /api/mcp/servers/[id], /api/mcp/servers/[id]/tools, /api/mcp/tools
- Created `/src/components/mcp/tool-browser.tsx` — split-panel dialog with search, categories, schema detail
- Updated agent node config: tag-based tools input with "Browse" button
- Added MCP Plug button to toolbar

Stage Summary:
- 8 builtin MCP tools: web_search, calculator, http_request, file_read, code_execute, database_query, email_send, slack_message
- Custom tools can be registered via API
- Agent node has tag-based tool selection with browser integration
- Tool search, category filtering, and schema viewing

---
Build Verification (Sprint 2):
- `npx next build` — compiles successfully, 13 routes generated
- All API endpoints tested and working
- MCP tools API returns 8 builtin tools with full schemas
- Dev server running on port 3000

# OpenWorkflow — Bug Fix: Run Button Crash

---
Task ID: 11
Agent: Main
Task: Fix client-side crash when clicking the Run button

Work Log:
- Investigated "Application error: a client-side exception has occurred" crash
- Read all key files: page.tsx, engine.ts, workflow-store.ts, execution-store.ts, variable-resolver.ts, agent-node.tsx, execution-panel.tsx, and all component files
- Identified 5 root causes of the crash:
  1. **Unstable Zustand selectors** — `executionSteps` selector in page.tsx created a new object on every render, causing `flowEdges` useMemo to recalculate infinitely, triggering cascading re-renders that eventually crashed React
  2. **Same issue in agent-node.tsx** — The `nodeStatus` selector used `.find()` which created new references every render
  3. **Missing Error Boundary** — No error boundary to catch rendering errors gracefully, so any component error crashed the entire app
  4. **Unsafe `getCategoryForType`** — Used `!` non-null assertion which would throw if called with an unexpected type
  5. **Null config in engine** — `resolveVariables` could be called with undefined/null node config

Fixes applied:
1. **execution-store.ts** — Added pre-computed `nodeStatusMap: Record<string, NodeExecutionStatus>` field that's updated alongside results. This provides a stable reference for selectors instead of computing on every render.
2. **page.tsx** — Replaced unstable `executionSteps` selector with `nodeStatusMap` selector. Added `isRunning` selector for button state. Added ErrorBoundary wrapper. Added double-click prevention on Run button.
3. **agent-node.tsx** — Replaced `.find()`-based selector with simple `state.nodeStatusMap[id] ?? null` lookup.
4. **types.ts** — Changed `getCategoryForType` from `find()!` to `find() ?? NODE_CATEGORIES[0]` for safe fallback.
5. **engine.ts** — Added `node.config ?? {}` safety for resolveVariables calls.
6. **execution-panel.tsx** — Wrapped `getCategoryForType` in try/catch with NODE_CATEGORIES fallback.
7. **error-boundary.tsx** — New React error boundary component with user-friendly error UI and retry button.
8. **global-error.tsx** — New Next.js global error handler for uncaught client errors.
9. **engine.ts (additional)** — Replaced stale store references with fresh `.getState()` calls each time. Added `await setTimeout(16)` yield after `startRun` to let React process the isRunning state change before flooding with updateStep calls. Added small yields between state updates to prevent render cascading.
10. **page.tsx handleRun** — Simplified to fire-and-forget with node/edge snapshots. Removed try/catch wrapper that could mask errors.

Stage Summary:
- Build compiles successfully: `npx next build` — ✓ Compiled successfully
- All unstable selectors replaced with pre-computed stable references
- Error boundary prevents total app crash on rendering errors
- Run button has double-click prevention and disabled state during execution
- Safe fallbacks for all type lookups and config access
- Production server verified: page loads 200, API endpoints working

# OpenWorkflow — Product Pivot: AI Employee Wedge

---
Task ID: 12
Agent: Main
Task: Build "Generate Workflow" feature + AI Support Employee template + Execution Replay

Work Log:
- Strategic pivot: Stop building infrastructure, start building product with ONE concrete use case (AI Support Employee)
- Created `/src/app/api/workflows/generate/route.ts` — AI-powered workflow generator API
  - Uses z-ai-web-dev-sdk GPT-4o to convert natural language → workflow JSON
  - Validates and normalizes generated workflows (fills missing fields, infers categories)
  - Handles markdown fences in AI output, graceful error responses
- Created `/src/components/workflow/workflow-generator.tsx` — "Generate Workflow" dialog
  - Textarea for natural language description
  - 4 example prompts for common workflows
  - Loading state with spinner, error display
  - Generates and loads workflow into canvas automatically
- Created `/src/components/execution/execution-replay.tsx` — Visual execution timeline
  - Timeline-style step display with dot indicators (running=blue pulse, success=green, error=red)
  - Category icons per step type (Zap=trigger, Brain=AI, UserCheck=human, etc.)
  - Duration, token count, and cost per step
  - Expandable output preview with JSON formatting
  - Status badges for overall execution state
- Added AI Support Employee template to templates.ts
  - Email → Classifier → Condition → (high confidence) RAG → LLM → Approval → Email
  - Low confidence path: Escalation → Slack notification
  - Production-ready with real configs (IMAP server, model selection, system prompts)
- Added SDR Employee template to templates.ts
  - Webhook → Classifier → Condition → (hot) CRM + Email + Slack | (cold) LLM nurture → Email
- Updated page.tsx:
  - Added Wand2 (AI Generate) button to toolbar — prominent violet color
  - Added WorkflowGenerator dialog
  - Replaced ExecutionPanel with ExecutionReplay
  - Updated empty state: "AI Generate" as primary CTA, "Templates" as secondary
  - Both CTAs side by side

Stage Summary:
- Build compiles successfully with new `/api/workflows/generate` route
- "That's cool" feature: Type "Build a support workflow" → AI creates the full workflow
- AI Support Employee is the #1 template, positioned as the wedge product
- Execution Replay shows real-time timeline of AI work — users can see AI thinking
- Empty canvas now promotes AI Generate as the primary action
---
Task ID: 1
Agent: Main Agent
Task: Fix Run button crash - diagnose and fix client-side crash when clicking Run

Work Log:
- Read all critical source files (page.tsx, engine.ts, workflow-store.ts, execution-store.ts, variable-resolver.ts, agent-node.tsx, flow-edge.tsx, error-boundary.tsx, etc.)
- Identified root cause #1: ReactFlow controlled/uncontrolled mode conflict — `useNodesState(flowNodes)`/`useEdgesState(flowEdges)` created internal state that conflicted with the controlled `nodes={flowNodes}`/`edges={flowEdges}` props, causing stale state and crashes when `nodeStatusMap` updated during execution
- Identified root cause #2: Rapid Zustand state updates during execution overwhelming React's rendering pipeline
- Identified root cause #3: No defensive guards in components for missing data during rapid re-renders
- Identified root cause #4: AI completions API route lacked timeout and could hang/crash the server
- Fixed page.tsx: Removed useNodesState/useEdgesState, replaced with direct store-based handleNodesChange
- Fixed page.tsx: Added deep clone of nodes in handleRun to prevent stale closures
- Fixed page.tsx: Added fallback isRunning reset in handleRun's catch block
- Fixed execution-store.ts: Added try/catch in updateStep and completeRun, force reset isRunning on error
- Fixed engine.ts: Increased yield time between state updates from 4ms to 50ms
- Fixed agent-node.tsx: Added defensive guards for missing data and try/catch in nodeStatus selector
- Fixed flow-edge.tsx: Added guard against missing coordinates during rapid re-renders
- Fixed error-boundary.tsx: Added auto-reset for recoverable hydration/chunk errors
- Fixed api/ai/completions/route.ts: Added input validation, AI SDK error isolation, 25s timeout with Promise.race

Stage Summary:
- All fixes compile and build successfully (next build passes)
- The core crash was the ReactFlow controlled mode conflict — useNodesState/useEdgesState created conflicting internal state
- AI API route now has proper error isolation and timeout
- Execution engine now yields properly between state updates
- All components have defensive guards against missing data during rapid state changes

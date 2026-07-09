# Task p6-4: Workflow Chaining (Subflow Node)

## Work Record

### Changes Made

1. **types.ts** — Added `subflow` to TRIGGER_TYPES, `trigger-workflow` to ACTION_TYPES, updated `getSourceHandles()`:
   - `subflow` trigger: represents "this workflow was triggered by another workflow"
   - `trigger-workflow` action: triggers another workflow from within the current workflow
   - `trigger-workflow` has `['default', 'error']` source handles for success/failure routing

2. **node-config-panel.tsx** — Added config schemas and icons:
   - `subflow` trigger: description field
   - `trigger-workflow` action: targetWorkflowId (workflow-select), waitForCompletion (switch), passInput (switch), timeoutMs (number)
   - New `workflow-select` field type with `WorkflowSelectField` component that fetches workflows from `/api/workflows/list`
   - Added icons: `subflow: Layers`, `trigger-workflow: PlayCircle`

3. **API Route `/api/workflows/list/route.ts`** — Lightweight GET endpoint:
   - Returns only `{ id, name }` for each workflow
   - Scoped to authenticated user if available
   - Used by the trigger-workflow config panel dropdown

4. **engine.ts** — Core subflow execution:
   - Added `executeWorkflowInternal()` — exported pure BFS executor that returns `ExecutionResult` without touching Zustand stores. Used for subflow nesting.
   - Added `trigger-workflow` node runner in `runNode()`:
     - Fetches target workflow from `/api/workflows/[id]`
     - Checks depth to prevent infinite recursion (`context.depth >= context.maxDepth`)
     - **Wait mode**: Executes sub-workflow using `executeWorkflowInternal()` with `Promise.race` timeout
     - **Fire-and-forget mode**: Triggers workflow via `/api/workflows/[id]/execute` API
     - Proper error handling with `error` output field for error handle routing
   - Added `subflow` trigger handler in `runNode()`: includes `parentRunId` in output
   - Added `trigger-workflow` edge routing in both `executeWorkflow()` and `executeWorkflowInternal()`: routes to `default` on success, `error` on failure
   - Added `'trigger-workflow'` to ACTION_RESPONSES

5. **agent-node.tsx** — Added icons for new node types:
   - `subflow: Layers`, `trigger-workflow: PlayCircle`

6. **node-palette.tsx** — Added icons for new node types:
   - `subflow: Layers`, `trigger-workflow: PlayCircle`

### Architecture Decisions

- `executeWorkflowInternal` is a separate pure function (no store updates) to enable subflow nesting without conflicting Zustand state
- The main `executeWorkflow` function remains unchanged for the top-level execution flow
- Subflow execution uses the API to fetch target workflow data (client-side engine pattern)
- Depth checking prevents infinite recursion (maxDepth defaults to 10)
- Both sync (wait for completion) and async (fire-and-forget) modes supported
- Error handle routing on `trigger-workflow` allows graceful error handling in the parent flow

### Build Verification
- `bun run lint` — passes clean
- `npx next build` — compiles successfully, all routes generated including new `/api/workflows/list`
- Dev server running on port 3000

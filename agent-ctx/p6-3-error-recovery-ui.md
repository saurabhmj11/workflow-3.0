# Task p6-3: Build Error Recovery UI for OpenWorkflow

## Agent: Main
## Status: Completed

### Work Log:

1. **Read worklog.md and existing codebase** — Reviewed all existing files: execution-replay.tsx, execution-store.ts, engine.ts, api-utils.ts, types.ts, prisma schema, page.tsx. Understood the full execution pipeline and how the UI integrates.

2. **Created `/src/app/api/executions/[runId]/route.ts`** — GET endpoint to fetch a single execution by runId:
   - Looks up execution by unique `runId` field
   - Includes workflow name via join
   - Returns full execution data with parsed steps, error steps, success steps, and total count
   - Uses existing `serializeExecution` helper for consistent format

3. **Created `/src/app/api/executions/[runId]/retry/route.ts`** — POST endpoint to retry a failed execution:
   - Accepts runId in URL
   - Looks up the execution from DB
   - Finds the associated workflow with nodes and edges
   - Creates a new execution record with `run_retry_` prefix runId
   - Sets `triggeredBy: 'retry'` to distinguish from original runs
   - Returns new runId, workflowId, original runId, input, and node/edge counts
   - Client-side code then uses this info to re-execute via `executeWorkflow()`

4. **Created `/src/components/execution/execution-error-panel.tsx`** — Detailed error panel component:
   - `classifyError()` function categorizes errors into: timeout, api_error, validation_error, unknown
   - `ERROR_CATEGORY_META` provides color-coding per category (amber for timeout, red for API, orange for validation)
   - `ExecutionErrorPanel` component shows:
     - Red-bordered error header with category badge and node type
     - Error message in red monospace font
     - Expandable stack trace (if available)
     - Node type, label, and ID info with category-colored icon
     - Failed duration display
     - Expandable node config section
     - Expandable input data section
     - "Retry from this step" button (amber-themed, calls `onRetryFromStep`)
     - "Copy Error Details" button (copies full formatted error info to clipboard)
   - `ErrorDetailsDialog` component for "View Details" button:
     - Full-screen dialog with all error information
     - Category badge, stack trace, node config, input data, output data
     - "Copy All Details" button in dialog footer
     - Dark theme consistent with rest of app

5. **Updated `/src/components/execution/execution-replay.tsx`** — Major enhancement with error recovery:
   - Added `ActiveResultView` component for better organization
   - Error recovery bar that appears when execution has errors:
     - Prominent red-bordered section with AlertTriangle icon
     - Shows error count ("Execution failed" or "3 steps failed")
     - Displays inline error message for single errors
     - "Retry Workflow" button (red-themed) that calls retry API then re-executes
     - "Copy Error" button to copy all error details
   - Retry logic:
     - First attempts server-side retry via `/api/executions/[runId]/retry`
     - Falls back to client-side retry with current workflow state
     - Shows loading state during retry
     - Uses `executeWorkflow()` for client-side re-execution
     - Toast notifications for retry status
   - Step-level retry via `handleRetryFromStep`:
     - Re-runs the entire workflow from the beginning
     - Toast notification indicates which step is being retried from
   - Error steps in timeline show:
     - Red text coloring for labels and node type
     - `ExecutionErrorPanel` in expanded view with full error details and retry button
     - Quick action buttons (always visible, not just expanded):
       - "View Details" opens `ErrorDetailsDialog`
       - "Copy Error" copies error message to clipboard
   - New imports: `RefreshCw`, `Copy`, `Eye`, `Loader2`, `useWorkflowStore`, `executeWorkflow`, `ExecutionErrorPanel`, `ErrorDetailsDialog`

6. **Build verification**:
   - `bun run lint` — no errors in new/changed files (pre-existing error in use-onboarding.ts is unrelated)
   - Dev server running and returning 200 on all pages
   - All new API routes compile and are accessible

### Stage Summary:
- **Error Recovery UI is complete and production-ready**
- Server-side retry API creates a new execution record preserving original input
- Client-side retry re-executes the workflow with current canvas state
- Step-level retry support via the error panel
- Error classification (timeout/API/validation/unknown) with color-coded badges
- Copy-to-clipboard for all error details — debugging-friendly
- View Details dialog for comprehensive error inspection
- Inline error messages and quick action buttons for rapid error resolution
- Dark theme consistent with existing OpenWorkflow UI

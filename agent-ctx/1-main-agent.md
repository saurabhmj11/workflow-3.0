# Task 1 - Engine Fixes and New Node Types

## Task Summary
Fix the execution engine in `/home/z/my-project/src/lib/engine.ts` to implement REAL (not simulated) execution for the Retry, Loop, and Switch nodes. Also add two new node types: "http-request" and "code".

## Changes Made

### 1. types.ts Updates
- Added `'http-request'` and `'code'` to `ACTION_TYPES` array
- Added source handles for `'code'` node: `['default', 'error']`
- Added source handles for `'http-request'` node: `['default', 'error']`

### 2. engine.ts - Import Update
- Added `getNestedValue` import from `@/lib/variable-resolver`

### 3. engine.ts - GraphContext Interface
- Added `GraphContext` interface with `nodes`, `edges`, and `outEdges` fields
- This allows `runNode` to access the workflow graph structure for loop body execution, retry predecessor lookup, etc.
- Added `_graph?: GraphContext` as optional 5th parameter to `runNode()`
- Updated both `executeWorkflowInternal()` and `executeWorkflow()` to construct and pass `GraphContext` to `runNode()`

### 4. Fixed Switch Node
- Removed hash-based fallback routing (`simpleHash` based case matching)
- Now properly evaluates each case's expression using `evaluateSimpleCondition`
- Resolves variables in expressions using `resolveVariables` before evaluation
- If no case matches, uses 'default' case (never random/hash-based)

### 5. Fixed Retry Node (Real Re-execution)
- Replaced the simulated retry that referenced undefined `storeEdges`, `nodes`, `runId`, `updateStep` variables
- Now uses `_graph` parameter to find predecessor node from edges
- Checks predecessor's previous output for error via `_nodeOutputs` (no longer relies on execution store)
- Actually calls `runNode()` on the predecessor for each retry attempt
- Implements exponential backoff: `waitTime = backoffMs * Math.pow(backoffMultiplier, attempt - 1)`
- Tracks all attempt results with success/failure details
- Returns the last successful output when retry succeeds

### 6. Fixed Loop Node (Real Iteration)
- Replaced the simulated loop that just returned `iterations: Math.min(maxIterations, 3)`
- Now uses `getNestedValue(input, collectionPath)` to extract the collection from input
- Validates that the collection is an array; returns error if not found
- Iterates over items (up to `maxIterations`)
- For each item, finds the body node (connected via 'default' source handle) and executes it with `runNode()`
- Passes `currentItem`, `currentIndex`, and `collection` to body node input
- Collects results and errors from each iteration
- Returns detailed output: `iterations`, `totalItems`, `results`, `errors`

### 7. Added HTTP Request Node (`http-request`)
- New node type in the 'action' category
- Supports: GET, POST, PUT, PATCH, DELETE, HEAD methods
- Config: `method`, `url`, `headers`, `body`, `timeoutMs`
- Resolves variables in URL, headers, and body using `resolveVariables`
- Uses native `fetch` with `AbortController` for timeout handling
- Automatically sets `Content-Type: application/json` for non-GET requests with body
- Parses JSON or text response based on content-type header
- Returns `{ statusCode, statusText, headers, body }` on success
- Returns `{ error, statusCode, body }` on HTTP error
- Returns `{ error }` on timeout or network failure
- Routes to 'error' handle on failure, 'default' handle on success

### 8. Added Custom Code Node (`code`)
- New node type in the 'action' category
- Executes user-provided JavaScript code in a sandboxed environment
- Config: `code`, `language` (only javascript/typescript supported), `timeoutMs`
- Provides sandbox with: `input`, `config`, `variables`, `nodeOutputs`, `console`, `JSON`, `Math`, `Date`, `Object`, `Array`, `String`, `Number`, `Boolean`, `parseInt`, `parseFloat`, `isNaN`, `isFinite`, `encodeURIComponent`, `decodeURIComponent`
- Wraps code in an async function for flexibility
- Auto-adds `return` statement if code doesn't contain one
- Returns `{ result, executionTimeMs, language }` on success
- Returns `{ error, errorType, language }` on failure
- Routes to 'error' handle on failure, 'default' handle on success

### 9. Edge Routing Updates
- Updated both `executeWorkflowInternal()` and `executeWorkflow()` to handle `http-request` and `code` nodes
- Both new node types route: 'default' handle for success, 'error' handle for failure (same as `trigger-workflow`)

## Build Verification
- `npx next build` — ✓ Compiled successfully
- `bun run lint` — No errors in engine.ts
- Dev server running on port 3000, main page returns 200

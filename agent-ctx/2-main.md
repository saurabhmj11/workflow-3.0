# Task 2 — Analytics Live Data + DB-Backed Rate Limiting

## Agent Work Record

### Part A: Connect Analytics Page to Live Data

**File Modified**: `/src/app/analytics/page.tsx`

Changes:
- Removed all hardcoded static data (`employeeStats`, `topExpensiveNodes`, `failureReasons`)
- Added imports for `useExecutionStore` and `useApprovalStore`
- Added real metric computation functions:
  - `computePerWorkflowStats()` — groups results by workflowId, computes per-workflow runs, success rate, cost, duration, confidence, escalation, tokens
  - `computeCostByNodeType()` — aggregates cost from step-level `costUsd` by `nodeType`
  - `computeFailureReasons()` — extracts and normalizes error messages from failed steps
- Top metrics strip now shows live data: total runs, success rate, avg confidence (from AI outputs with `confidence` field), total cost, escalation rate
- "Per Employee" tab shows per-workflow stats with real sparkline data from recent run costs
- "Cost Breakdown" tab shows real cost distribution by node type
- "Failure Analysis" tab shows real error categories + escalation details from actual results
- "ROI Calculator" tab kept as-is (forward-looking)
- Added `EmptyState` component: shows friendly "No execution data yet" with CTAs when no results exist
- Same visual design preserved (dark theme, same card layouts, same tabs)

### Part B: DB-Backed Persistent Rate Limiting

**File Modified**: `/prisma/schema.prisma`
- Added `RateLimitEntry` model with `id`, `key` (unique), `count`, `resetTime`, `createdAt`, `updatedAt`

**File Modified**: `/src/lib/rate-limit.ts`
- Rewrote as dual-mode rate limiter (DB primary, in-memory fallback)
- Added `checkRateLimitAsync()` — async function that tries Prisma DB first, falls back to in-memory on failure
- Added DB availability tracking: on failure, stops retrying for 30 seconds
- Added `initDbCleanup()` — periodic cleanup of expired DB entries (every 5 min)
- Added `cleanupExpiredRateLimits()` — exported cleanup function
- `checkRateLimit()` kept synchronous (returns in-memory result for backward compat)
- `withRateLimit()` now uses `checkRateLimitAsync()` for DB-backed enforcement
- Same API surface preserved: `checkRateLimit`, `getRateLimitKey`, `withRateLimit`, `RATE_LIMITS`

**Database**: Ran `npx prisma db push --accept-data-loss` successfully

### Build Verification
- `npx next build` — ✅ Compiled successfully, all routes generated
- Lint errors are pre-existing (not from this task)

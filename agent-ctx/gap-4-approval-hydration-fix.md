# Task: gap-4 — Fix Approval Store Hydration from DB

## Summary
Fixed broken hydration mapping in the approval store and multiple bugs in the approvals API route.

## Changes Made

### 1. `/src/stores/approval-store.ts` — Fixed `hydrateFromDB` mapping
- **Added** all required `ApprovalRequest` fields: `runId`, `workflowId`, `assignee`, `createdAt`, `notes`
- **Removed** `nodeLabel` and `type` from the mapping (not part of `ApprovalRequest` — they belong inside `context`)
- **Fixed** the POST body in `addRequest` to also include `workflowId` and `assignee`

### 2. `/src/app/api/approvals/route.ts` — Fixed GET handler
- **Added** `workflowId`, `assignee`, `resolvedAt` to the response mapping
- **Removed** `updatedAt` (does not exist on `ApprovalRecord` model — was causing runtime crash)
- **Removed** broken `{ workflow: { userId } }` Prisma filter (no `workflow` relation exists on `ApprovalRecord`)
- **Removed** unused `getCurrentUserId` import

### 3. `/src/app/api/approvals/route.ts` — Fixed POST handler
- **Added** `workflowId` and `assignee` to destructured body
- **Added** `workflowId` and `assignee` to `db.approvalRecord.create` data
- **Added** `workflowId` and `assignee` to success response

### 4. `/src/app/api/approvals/route.ts` — Fixed PUT handler
- **Added** `resolvedAt: new Date()` when approving/rejecting (was missing — records now get a resolution timestamp)
- **Changed** response to return `resolvedAt` instead of non-existent `updatedAt`

## Build Verification
- `bun run lint` — passes clean
- `npx next build` — compiles successfully, all routes generated

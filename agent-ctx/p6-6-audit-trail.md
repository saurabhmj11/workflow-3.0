# Task p6-6: Build Audit Trail for OpenWorkflow

## Summary
Successfully implemented a complete audit trail system for OpenWorkflow, including database model, utility library, API routes integration, query endpoint, and viewer page.

## Work Completed

### 1. AuditLog Prisma Model
- Added `AuditLog` model to `prisma/schema.prisma` with fields: id, userId, userEmail, action, resource, resourceId, resourceName, status, ipAddress, userAgent, details (JSON), createdAt
- Added indexes on `[userId, createdAt]`, `[action, createdAt]`, `[resource, resourceId]`
- Ran `prisma db push` successfully

### 2. Audit Logging Utility (`/src/lib/audit.ts`)
- Created `auditLog()` function that writes audit logs to the database
- Non-blocking: errors are caught and logged to console, never failing the main operation
- `getRequestMeta()` helper extracts IP address and user agent from Request headers
- `AUDIT_ACTIONS` constant with all 14 pre-defined action types

### 3. Wired Audit Logging into 10 API Routes
- `POST /api/workflows` → workflow.created
- `PUT /api/workflows/[id]` → workflow.updated
- `DELETE /api/workflows/[id]` → workflow.deleted
- `POST /api/workflows/[id]/execute` → workflow.executed
- `PUT /api/approvals` → approval.approved / approval.rejected
- `POST /api/triggers/webhook` → trigger.created
- `POST /api/triggers/schedule` → trigger.created
- `DELETE /api/triggers/schedule` → trigger.deleted
- `POST /api/triggers/email` → trigger.created
- `DELETE /api/triggers/email` → trigger.deleted
- `POST /api/integrations/connect` → integration.connected
- `DELETE /api/integrations/credentials` → integration.disconnected
- `POST /api/auth/register` → user.registered

All audit calls use fire-and-forget pattern (`.catch(() => {})`)

### 4. Audit Query API (`/src/app/api/audit/route.ts`)
- GET endpoint with query params: resource, action, userId, limit, offset
- Returns paginated results with total count and hasMore flag
- Most recent first ordering

### 5. Audit Log Viewer Page (`/src/app/audit/page.tsx`)
- Dark theme consistent with the rest of the app
- Table layout with columns: Time, User, Action, Resource, Status, Details
- Filter dropdowns for Resource type and Action type
- Color-coded action badges with icons per action type
- Color-coded status badges (success=green, failure=red)
- Click-to-expand rows showing full timestamp, IP address, user agent, and JSON details
- Pagination controls with Previous/Next buttons
- Empty and loading states
- Back button to return to main page

### 6. Audit Link in Toolbar
- Added History icon button to main page toolbar (emerald color)
- Links to `/audit` page
- Consistent with existing toolbar button styling

## Verification
- `bun run lint` — passes clean
- `npx next build` — compiles successfully, `/audit` page and `/api/audit` route generated
- API endpoint tested: `GET /api/audit` returns `{ ok: true, data: { logs: [...], total, limit, offset, hasMore } }`
- Audit logging verified: user registration created audit log entry with correct fields

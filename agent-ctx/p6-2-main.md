# Task p6-2: Notification Center for OpenWorkflow

## Summary
Built a complete Notification Center system for OpenWorkflow, enabling users to see real-time notifications from workflow executions, approvals, triggers, and integrations via a bell icon in the toolbar.

## Files Created/Modified

### New Files
1. `/src/stores/notification-store.ts` — Zustand store for notification state management
2. `/src/app/api/notifications/route.ts` — GET (list) + POST (create) notifications API
3. `/src/app/api/notifications/[id]/route.ts` — PUT (mark read) + DELETE (remove) single notification
4. `/src/app/api/notifications/read-all/route.ts` — PUT (mark all as read)
5. `/src/components/notifications/notification-center.tsx` — Notification list UI with category icons
6. `/src/components/notifications/notification-popover.tsx` — Bell icon popover with badge

### Modified Files
1. `prisma/schema.prisma` — Added Notification model + notifications relation on User
2. `/src/hooks/use-sse.ts` — Added notification creation from SSE events
3. `/src/app/page.tsx` — Added NotificationPopover to toolbar

## Key Design Decisions
- Notifications are persisted to SQLite via API (survive page refresh)
- SSE events automatically create notifications (no duplicate SSE connection needed)
- Optimistic local state updates with non-blocking API persistence
- Category-based color coding: execution=cyan, approval=amber, trigger=blue, integration=emerald, system=zinc, error=red
- Priority indicators: low/normal/high/critical with colored dots
- Time ago display for relative timestamps

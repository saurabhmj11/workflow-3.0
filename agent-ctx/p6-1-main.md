# Task p6-1: Build Settings Page for OpenWorkflow

## Summary
Built a complete Settings page with 5 tabs (Profile, Organization, Notifications, Security, API Keys), 5 API routes, Prisma schema updates, and UserNav integration.

## Files Created
- `/src/app/settings/page.tsx` — Full settings page with 5 tabs
- `/src/app/api/settings/profile/route.ts` — GET + PUT for user profile
- `/src/app/api/settings/organization/route.ts` — GET + PUT for org settings (stored in User.metadata)
- `/src/app/api/settings/notifications/route.ts` — GET + PUT for notification preferences (stored in User.metadata)
- `/src/app/api/settings/password/route.ts` — PUT for password changes (bcrypt)
- `/src/app/api/settings/api-keys/route.ts` — GET + POST + DELETE for API key management

## Files Modified
- `prisma/schema.prisma` — Added `metadata` and `apiKeys` fields to User model, added `ApiKey` model
- `src/components/auth/user-nav.tsx` — Added Settings link, Dashboard with BarChart3 icon

## Key Decisions
- Organization and notification settings stored in `User.metadata` as JSON (no separate model needed)
- API keys use `owf_` prefix + 32 random chars, SHA-256 hashed for storage
- Raw API key shown only once on creation, never stored
- Password changes use bcrypt with 12 salt rounds
- All API routes use `getCurrentUserId()`/`requireAuth()` and `successResponse()`/`errorResponse()`

## Build Verification
- `bun run lint` — passes clean
- `npx next build` — ✓ Compiled successfully
- `/settings` page returns 200

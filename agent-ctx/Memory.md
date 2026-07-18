# Memory.md — AI Agent Context Memory
## OpenWorkflow 3.0

This document tracks ongoing progress, recent fixes, and current focus areas for the AI coding assistant. Update this document as features are built and bugs are fixed to maintain continuity across sessions.

---

## Current Status: Production Readiness

**Recent Wins & Fixes (Last 48 Hours):**
1. **NextAuth v5 Middleware Fix**: Resolved the infinite redirect loop on `/login`. Deleted `auth-edge.ts` and refactored `middleware.ts` to use `getToken()` from `next-auth/jwt` directly, ensuring session cookies are validated correctly across Edge and Node environments.
2. **NextAuth v5 Error Handling**: Updated the login page to catch `AuthError` instances correctly, properly surfacing "Invalid email or password" instead of a generic fallback.
3. **Email Normalization**: Ensured emails are normalized (`.trim().toLowerCase()`) during both registration and login (`authorize` function) to prevent case-sensitivity login failures.
4. **Build Pipeline**: Explicitly forced `next build --webpack` in `package.json` to bypass Turbopack. This ensures the `@netlify/plugin-nextjs` correctly generates `.nft.json` manifest files required for deployment.
5. **CI/CD Cleanup**: Fixed `.github/workflows/` to use environment stub variables so that GitHub Actions CI passes without requiring real database credentials or production secrets. Removed the broken Docker push job.
6. **Login UI Polish**: Removed misleading hardcoded demo credentials and conditionally hid OAuth buttons (GitHub/Google) if their respective environment variables are not set.

## Current Open Issues & Focus Areas:

1. **Triggers & Integrations**:
   - The Webhook and Schedule triggers are partially implemented. Need to verify payload passing to the execution engine.
2. **Copilot Panel**:
   - Ensure the AI Copilot (`copilot-panel.tsx`) correctly reads the current canvas state and can stream back workflow modifications.
3. **Execution Engine**:
   - The execution replay feature (`execution-replay.tsx`) requires rigorous state testing to ensure it visually maps to the correct nodes without desync.

## Technical Reminders for AI:
- **Environment**: You are working on Windows with PowerShell.
- **Database**: We are using Prisma connected to a Neon PostgreSQL instance. DO NOT write raw SQL.
- **Styling**: Tailwind CSS v4. No CSS modules.
- **Auth**: NextAuth v5 (Beta). Read the `Rules.md` for specific NextAuth constraints.
- **Builds**: Never use `--turbopack`. Always ensure Netlify environment variables are respected.

*Last Updated: 2026-07-18*

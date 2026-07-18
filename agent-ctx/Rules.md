# Rules.md — AI Coding Rules & Constraints
## OpenWorkflow 3.0

These rules apply whenever an AI assistant (Antigravity, Copilot, Claude, etc.) is helping develop this project.

---

## 1. Framework & Library Rules

### ✅ USE These
| Tool | When |
|---|---|
| `shadcn/ui` | All UI components — button, input, card, dialog, table, etc. |
| `Tailwind CSS v4` | All styling — no inline styles, no CSS modules |
| `Zustand` | All global client state |
| `React Flow / XYFlow` | Workflow canvas only |
| `Prisma` | All database queries — never write raw SQL |
| `next-auth/react` → `signIn`, `signOut`, `useSession` | Client-side auth |
| `auth()` from `@/lib/auth` | Server-side session checks in Server Components |
| `getToken()` from `next-auth/jwt` | Middleware session validation only |
| `zod` | All API input validation |
| `lucide-react` | All icons — never use emoji as icons in UI |
| `vitest` | All tests |

### ❌ NEVER USE These
| Tool | Why |
|---|---|
| `--turbopack` flag in build | Breaks `@netlify/plugin-nextjs` NFT manifest generation |
| `styled-components` / `emotion` | We use Tailwind — no CSS-in-JS |
| `axios` | Use native `fetch` — it's available everywhere |
| `moment.js` | Use `date-fns` or `Intl.DateTimeFormat` |
| Raw SQL queries | Always use Prisma |
| `localStorage` for auth state | Auth state is in the JWT session cookie only |
| Separate `NextAuth()` instance in middleware | Creates JWT incompatibility — use `getToken()` |
| `process.env.NODE_ENV === "development"` guards in API routes | Breaks production |

---

## 2. Authentication Rules

- **Never** create a second `NextAuth()` instance (e.g., a separate `auth-edge.ts`). This breaks JWT validation in middleware.
- **Always** use `getToken({ req, secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET })` in `middleware.ts`.
- **Always** normalize email to `email.trim().toLowerCase()` before any DB lookup or `signIn()` call.
- **Always** handle `AuthError` from `next-auth` in catch blocks — NextAuth v5 throws instead of returning `{ error }` in some flows.
- **Never** commit real secrets to the repo — use `.env` (gitignored) locally and Netlify dashboard for production.
- `AUTH_SECRET` / `NEXTAUTH_SECRET` must be **at least 32 characters**. Use a random hex string.

---

## 3. Database Rules

- **Always** use `await import("@/lib/db")` (dynamic import) in API routes to avoid Prisma being loaded at module parse time in Edge contexts.
- **Never** call Prisma in `middleware.ts` — it runs on Edge runtime where Prisma binary is unavailable.
- **Always** use `@default(cuid())` for IDs, never auto-increment integers.
- **Always** add `@@index` for fields used in WHERE clauses of frequent queries.
- JSON blobs (metadata, config) are stored as `String` fields and parsed in application code — this is intentional for SQLite ↔ PostgreSQL portability.
- **Never** run `prisma migrate` in CI against the production database. Use `prisma db push` for schema sync during development.

---

## 4. API Route Rules

- **Always** validate session at the top of every protected API route:
  ```ts
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  ```
- **Always** validate request body with Zod before using data.
- **Always** return `{ ok: true, data: ... }` for success and `{ ok: false, error: "..." }` for failures.
- **Always** wrap DB calls in try/catch and return 500 with a generic message on unexpected errors — log the real error server-side.
- **Never** return stack traces or raw error messages to the client.
- **Always** add audit log calls for write operations (create, update, delete) using `auditLog()` from `@/lib/audit`.

---

## 5. Error Handling Rules

- **Client components**: Catch `AuthError` by type, show user-friendly messages per error type.
- **API routes**: Use `console.error("[ROUTE_PATH]", err)` format for server logs.
- **Never** swallow errors silently with empty catch blocks — at minimum, log them.
- Error messages shown to users must **never** reveal internal details (DB errors, stack traces, internal IDs).
- Use the `global-error.tsx` page for unhandled React errors.

---

## 6. Environment & Build Rules

- **Build command must always be**: `next build --webpack` (not `next build`, not `next build --turbopack`)
- **Netlify NODE_VERSION**: Must be `22`
- **Never** add `--turbopack` to any build script
- **Always** run `npx prisma generate` before `npm run build` in CI and Netlify
- Environment variables set in Netlify dashboard are the source of truth for production — `.env` is local-only
- GitHub Actions CI uses stub env vars (`postgresql://stub:stub@localhost/stub`) — never real production credentials

---

## 7. Component Rules

- **Always** use `"use client"` directive for components that use hooks or browser APIs.
- **Never** use `"use client"` on components that only render static HTML — keep them Server Components.
- **Always** wrap components that use `useSearchParams()` in `<Suspense>` to avoid build errors.
- **Always** use `autoComplete` attributes on form inputs for accessibility.
- **Never** show placeholder data or hardcoded demo credentials in the UI.
- OAuth provider buttons (GitHub, Google) must only render when `NEXT_PUBLIC_GITHUB_ENABLED="true"` / `NEXT_PUBLIC_GOOGLE_ENABLED="true"`.

---

## 8. What the AI Should NOT Do

- ❌ Create migration files — only the developer runs migrations manually
- ❌ Change `netlify.toml` build command away from webpack
- ❌ Add new `NextAuth()` instances for any reason
- ❌ Hardcode any API keys, secrets, or passwords in source files
- ❌ Add `console.log` with sensitive data (tokens, passwords, user PII)
- ❌ Modify `prisma/schema.prisma` without noting the migration required
- ❌ Install new heavy dependencies without noting the bundle size impact
- ❌ Use `any` type in TypeScript without a comment explaining why

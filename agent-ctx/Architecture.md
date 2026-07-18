# Architecture.md — Technical Architecture
## OpenWorkflow 3.0

---

## 1. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Framework** | Next.js (App Router) | 16.x |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS + shadcn/ui | v4 |
| **Database** | PostgreSQL via Neon (serverless) | — |
| **ORM** | Prisma | 6.x |
| **Auth** | NextAuth v5 (auth.js) | 5.0.0-beta |
| **State** | Zustand | — |
| **Canvas** | React Flow / XYFlow | — |
| **AI** | OpenAI SDK | — |
| **HTTP Client** | Native fetch | — |
| **Testing** | Vitest | — |
| **Deployment** | Netlify (serverless functions) | — |
| **Runtime** | Node.js 22 | — |
| **Package manager** | npm (bun for dev) | — |
| **Bundler** | Webpack (Turbopack disabled for Netlify) | — |

---

## 2. Project Structure

```
workflow-3.0/
├── agent-ctx/                  ← AI context documents (PRD, Architecture, etc.)
├── prisma/
│   └── schema.prisma           ← Database schema (PostgreSQL)
├── public/
│   └── embed.js                ← Embeddable widget script
├── src/
│   ├── app/                    ← Next.js App Router pages
│   │   ├── page.tsx            ← Landing page
│   │   ├── layout.tsx          ← Root layout
│   │   ├── login/              ← Auth: login
│   │   ├── register/           ← Auth: registration
│   │   ├── dashboard/          ← Main dashboard
│   │   ├── analytics/          ← Usage analytics
│   │   ├── audit/              ← Audit log viewer
│   │   ├── build/              ← Workflow builder (canvas)
│   │   ├── chat/               ← AI copilot chat
│   │   ├── deploy/             ← Deployment environments
│   │   ├── embed/              ← Embeddable form viewer
│   │   ├── integrations/       ← Third-party integrations
│   │   ├── memory/             ← Customer memory & profiles
│   │   ├── observability/      ← Traces & monitoring
│   │   ├── plugins/            ← Marketplace
│   │   ├── secrets/            ← Secret manager
│   │   ├── settings/           ← Org & user settings
│   │   └── api/                ← API routes
│   │       ├── auth/
│   │       │   ├── [...nextauth]/  ← NextAuth handler
│   │       │   └── register/       ← POST /api/auth/register
│   │       ├── workflows/          ← Workflow CRUD & execution
│   │       ├── triggers/           ← Webhook/schedule/email/form/voice/whatsapp
│   │       ├── executions/         ← Execution management
│   │       ├── approvals/          ← Human-in-loop approval queue
│   │       ├── memory/             ← Customer profiles & interactions
│   │       ├── integrations/       ← Integration credentials
│   │       ├── secrets/            ← Secret CRUD
│   │       ├── deploy/             ← Deployment promotions
│   │       ├── settings/           ← Org settings
│   │       ├── observability/      ← Traces & spans
│   │       ├── health/             ← GET /api/health
│   │       ├── notifications/      ← In-app notifications
│   │       └── mcp/                ← MCP server management
│   ├── components/
│   │   ├── ui/                 ← shadcn/ui primitives
│   │   ├── execution/          ← Execution panel components
│   │   ├── copilot/            ← AI copilot panel
│   │   └── ...                 ← Feature components
│   ├── lib/
│   │   ├── auth.ts             ← NextAuth v5 full config (Prisma + JWT)
│   │   ├── db.ts               ← Prisma client singleton
│   │   ├── audit.ts            ← Audit logging utilities
│   │   ├── scheduler.ts        ← Background job scheduler
│   │   ├── agent-orchestrator.ts ← AI agent orchestration
│   │   ├── notifications/      ← Notification delivery
│   │   └── testing/            ← Test seeds and fixtures
│   ├── stores/
│   │   └── workflow-store.ts   ← Zustand global state
│   └── __tests__/              ← Vitest test files
├── middleware.ts               ← Edge middleware (getToken-based auth)
├── next.config.ts              ← Next.js config
├── netlify.toml                ← Netlify build config
├── .github/workflows/
│   ├── ci.yml                  ← Lint + type check + test + build
│   └── deploy.yml              ← Build verify (Netlify deploys automatically)
└── package.json
```

---

## 3. Application Flow

```
Browser Request
      │
      ▼
middleware.ts (Edge runtime)
  │  getToken() validates JWT from session cookie
  │  Route guard: public / auth / protected
      │
      ▼
Next.js App Router
  ├── Server Components (fetch data server-side)
  └── Client Components (interactive UI, Zustand state)
      │
      ▼
API Routes (/api/*)
  │  NextAuth session validation
  │  Prisma DB operations (Neon PostgreSQL)
  │  Business logic
      │
      ▼
Neon PostgreSQL
```

---

## 4. Authentication Architecture

```
Registration:
POST /api/auth/register
  → SHA-256 hash password (Web Crypto API)
  → db.user.create()
  → signIn("credentials") auto-login

Login:
signIn("credentials") [next-auth/react]
  → POST /api/auth/callback/credentials
  → authorize() in auth.ts
    → db.user.findUnique(email.toLowerCase())
    → verify password hash
    → return user object
  → NextAuth creates JWT (signed with AUTH_SECRET)
  → Set __Secure-authjs.session-token cookie

Middleware check:
getToken({ req, secret: AUTH_SECRET })
  → Validates JWT signature
  → Returns token or null → route guard decision
```

---

## 5. Database Models (Summary)

| Model | Purpose |
|---|---|
| `User` | Auth users, roles, settings |
| `Account` / `Session` | NextAuth OAuth + session |
| `Workflow` | Workflow definitions |
| `XmlNode` | Workflow nodes (positioned) |
| `Edge` | Connections between nodes |
| `Execution` | Workflow run history |
| `WorkflowVersion` | Snapshots for versioning |
| `MCPServer` / `MCPTool` | MCP integrations |
| `CustomerProfile` | CRM-like customer data |
| `Interaction` | Customer interaction log |
| `SentimentLog` | AI sentiment analysis results |
| `MemoryNote` | AI-extracted customer facts |
| `CustomerSegment` | Customer groupings |
| `ApprovalRecord` | Human-in-loop approval state |
| `IntegrationCredential` | OAuth tokens for integrations |
| `WebhookTrigger` | Inbound webhook triggers |
| `ScheduleTrigger` | Cron-based triggers |
| `EmailTrigger` | IMAP email triggers |
| `FormTrigger` | Public form submissions |
| `VoiceCallTrigger` | Twilio/Vonage call triggers |
| `WhatsAppTrigger` | WhatsApp message triggers |
| `TriggerLog` | Trigger execution log |
| `AuditLog` | Full platform audit trail |
| `Notification` | In-app notification inbox |
| `ApiKey` | Programmatic API access |
| `Secret` | AES-256 encrypted secrets |
| `Deployment` | Environment promotions |
| `SSOConfiguration` | SAML/OIDC enterprise SSO |
| `SiteConfig` | Platform-wide KV settings |
| `WorkflowPermission` | Per-workflow RBAC |

---

## 6. Key Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | 32+ char random hex, signs JWTs |
| `NEXTAUTH_SECRET` | ✅ | Fallback for AUTH_SECRET |
| `AUTH_URL` | ✅ | Production URL: `https://workflow-sl.netlify.app` |
| `OPENAI_API_KEY` | ⚠️ | Required for AI copilot features |
| `ENCRYPTION_KEY` | ⚠️ | Required for email trigger credential encryption |
| `NEXT_PUBLIC_GITHUB_ENABLED` | Optional | Set `"true"` to show GitHub OAuth button |
| `NEXT_PUBLIC_GOOGLE_ENABLED` | Optional | Set `"true"` to show Google OAuth button |

---

## 7. Deployment Architecture

```
GitHub push to main
       │
       ├─→ GitHub Actions CI (lint + type check + test + build verify)
       │
       └─→ Netlify (automatic deploy)
              │  netlify.toml: build command = npx prisma generate && npm run build
              │  npm run build = next build --webpack  (Turbopack DISABLED)
              │
              ├── Static assets → Netlify CDN
              └── API routes → Netlify Functions (Node.js 22)
```

> ⚠️ **Critical**: Turbopack must stay disabled (`next build --webpack`).  
> The `@netlify/plugin-nextjs` requires webpack-generated `middleware.js.nft.json`.  
> Turbopack does not generate this file.

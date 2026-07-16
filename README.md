<div align="center">

# ⚡ Workflow 3.0

**The Open-Source AI Workflow Automation Platform**

Build, deploy, and monitor intelligent multi-agent workflows — visually.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

[Live Demo](#) · [Documentation](#) · [Report Bug](https://github.com/saurabhmj11/workflow-3.0/issues) · [Request Feature](https://github.com/saurabhmj11/workflow-3.0/issues)

</div>

---

## 📸 Overview

Workflow 3.0 is a full-stack, production-ready AI workflow automation platform. Design complex multi-agent pipelines on a visual canvas, integrate with any tool or API, and deploy with a single click — all from one unified dashboard.

---

## ✨ Features

| Category | Features |
|---|---|
| 🎨 **Visual Builder** | Drag-and-drop node editor powered by `@xyflow/react`, auto-layout with Dagre |
| 🤖 **AI Agents** | Multi-agent orchestration, agent memory, AI co-pilot, AI SDK integration |
| 🔁 **Workflow Engine** | Triggers (Webhook, Cron, WhatsApp, Email), real-time execution, replay |
| 🔌 **Integrations** | Plugin registry, MCP (Model Context Protocol) support, SSO |
| 📊 **Observability** | Execution logs, tracing, analytics dashboard, audit trail |
| 💬 **Chat** | Built-in AI chat interface with streaming responses |
| 🔐 **Security** | Rate limiting, secrets manager, role-based access, NextAuth v5 |
| 🚀 **Deployment** | One-click deploy, embed support, whitelabel mode |
| 👥 **Collaboration** | Real-time collaboration, notifications, approvals |
| 📦 **Marketplace** | Template gallery, plugin marketplace |

---

## 🛠️ Tech Stack

- **Framework** — [Next.js 15](https://nextjs.org) (App Router)
- **Language** — [TypeScript 5](https://www.typescriptlang.org)
- **Database** — [Prisma ORM](https://www.prisma.io) (PostgreSQL / SQLite)
- **Auth** — [NextAuth v5](https://authjs.dev)
- **UI** — [shadcn/ui](https://ui.shadcn.com) + [Radix UI](https://www.radix-ui.com) + [Tailwind CSS](https://tailwindcss.com)
- **Flow Canvas** — [@xyflow/react](https://reactflow.dev) + [Dagre](https://github.com/dagrejs/dagre)
- **AI SDK** — [Vercel AI SDK](https://sdk.vercel.ai) (OpenAI-compatible)
- **State** — [Zustand](https://zustand-demo.pmnd.rs) + [TanStack Query](https://tanstack.com/query)
- **Animations** — [Framer Motion](https://www.framer.com/motion)
- **Logging** — [Pino](https://getpino.io)
- **Scheduling** — [node-cron](https://github.com/node-cron/node-cron)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) `>= 18.x`
- [npm](https://www.npmjs.com) `>= 9.x`
- PostgreSQL database (or use SQLite for local dev)

### 1. Clone the repository

```bash
git clone https://github.com/saurabhmj11/workflow-3.0.git
cd workflow-3.0
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in the required values in `.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/workflow"

# Auth (NextAuth v5)
AUTH_SECRET="your-secret-key-here"
AUTH_URL="http://localhost:3000"

# AI Provider
OPENAI_API_KEY="sk-..."

# Optional: Google OAuth
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
```

> 🔒 **Security:** Run `powershell -ExecutionPolicy Bypass -File scripts\lock-env.ps1` after creating your `.env` to restrict file system access to your user only.

### 4. Set up the database

```bash
npx prisma migrate dev
npx prisma db seed
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
workflow-3.0/
├── prisma/                  # Database schema & migrations
│   ├── schema.prisma
│   └── migrations/
├── public/                  # Static assets
├── scripts/                 # Utility scripts
│   └── lock-env.ps1         # Env file permission locker
├── src/
│   ├── app/                 # Next.js App Router pages & API routes
│   │   ├── api/             # REST API endpoints
│   │   ├── dashboard/       # Main dashboard
│   │   ├── build/           # Visual workflow builder
│   │   ├── chat/            # AI chat interface
│   │   ├── deploy/          # Deployment management
│   │   ├── analytics/       # Analytics & reporting
│   │   ├── observability/   # Logs & tracing
│   │   ├── memory/          # Agent memory management
│   │   ├── integrations/    # Third-party integrations
│   │   ├── secrets/         # Secrets manager
│   │   ├── settings/        # App settings & whitelabel
│   │   └── audit/           # Audit trail
│   ├── components/          # Reusable UI components
│   │   ├── workflow/        # Workflow builder nodes & edges
│   │   ├── copilot/         # AI copilot components
│   │   ├── mcp/             # MCP integration components
│   │   └── layout/          # App shell & navigation
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Core business logic & utilities
│   │   ├── auth.ts          # Authentication setup
│   │   ├── engine.ts        # Workflow execution engine
│   │   ├── agent-orchestrator.ts
│   │   ├── scheduler.ts     # Cron job scheduler
│   │   └── observability/   # Logging & tracing
│   └── stores/              # Zustand state stores
├── .gitignore
├── netlify.toml             # Netlify deployment config
├── next.config.ts           # Next.js configuration
├── tailwind.config.ts       # Tailwind CSS configuration
└── tsconfig.json
```

---

## 🔧 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx prisma studio` | Open Prisma database GUI |
| `npx prisma migrate dev` | Run database migrations |

---

## 🌐 Deployment

### Netlify (Recommended)

The project includes a `netlify.toml` configuration. Simply connect your GitHub repo to Netlify and set the environment variables in the Netlify dashboard.

### Environment Variables for Production

All variables from your `.env` file must be configured in your hosting provider's dashboard. **Never commit your `.env` file.**

---

## 🔐 Security

- All `.env*` files are excluded via `.gitignore`
- Secrets are managed through the built-in **Secrets Manager** module
- Rate limiting is applied to all API routes via `rate-limiter-flexible`
- Authentication is handled by **NextAuth v5** with session encryption
- Google OAuth credentials must **never** be committed — use environment variables

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to your branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

## 👤 Author

**Saurabh MJ**
- GitHub: [@saurabhmj11](https://github.com/saurabhmj11)

---

<div align="center">

Made with ❤️ · Workflow 3.0

</div>

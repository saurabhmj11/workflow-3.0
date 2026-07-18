# PRD.md — Product Requirements Document
## OpenWorkflow 3.0 — AI Workflow Operating System

---

## 1. Product Overview

**OpenWorkflow** is a no-code/low-code AI Workflow Operating System that allows businesses to build, deploy, and manage intelligent automation workflows powered by AI agents. It acts as an operating layer connecting AI employees (agents) to real-world business tools, data sources, and human approval processes.

**Live URL:** https://workflow-sl.netlify.app  
**Version:** 0.2.0  
**Status:** Production

---

## 2. Target Users

| Persona | Description | Primary Use Case |
|---|---|---|
| **Operations Manager** | Non-technical business leader | Build customer support automations without code |
| **AI Engineer** | Technical builder | Configure complex multi-step AI pipelines |
| **Enterprise Admin** | IT/Security lead | Manage SSO, RBAC, secrets, audit trails |
| **Customer Success** | Support team | Monitor execution status, approve human-in-loop tasks |

---

## 3. Core Problem Statement

Businesses want to deploy AI agents to automate tasks (customer support, data processing, notifications) but face:
- High engineering cost to build custom pipelines
- No visibility into what AI is doing at each step
- No way to insert human approval checkpoints
- No audit trail for compliance
- Fragmented tool integrations

**OpenWorkflow solves this** by providing a visual workflow builder with AI nodes, human approval gates, multi-channel triggers, full audit logging, and an AI copilot assistant.

---

## 4. Feature Requirements

### 4.1 Authentication & Access Control
- [x] Email/password registration and login
- [x] JWT session management (NextAuth v5)
- [x] Role-based access: ADMIN, USER, VIEWER
- [x] OAuth SSO (GitHub, Google) — configurable via env vars
- [x] SAML / OIDC enterprise SSO
- [x] Per-workflow RBAC permissions (owner, editor, viewer)
- [x] API key management for programmatic access

### 4.2 Workflow Builder
- [x] Visual drag-and-drop node canvas (React Flow / XYFlow)
- [x] Node types: trigger, logic, AI, human, action
- [x] Node categories: API call, webhook, LLM, condition, human approval, email, form
- [x] Edge connections with source/target handles
- [x] Workflow versioning and snapshots
- [x] Workflow activation/deactivation toggle
- [x] Import/export workflows as JSON

### 4.3 Triggers
- [x] Webhook trigger (HMAC secret verification)
- [x] Schedule trigger (cron expressions, timezone support)
- [x] Email trigger (IMAP polling)
- [x] Form trigger (public embeddable forms)
- [x] Voice call trigger (Twilio/Vonage)
- [x] WhatsApp trigger (Meta/Twilio/360dialog)

### 4.4 Execution Engine
- [x] Real-time execution tracking
- [x] Per-node execution steps with status
- [x] Cost tracking (USD per execution)
- [x] Duration tracking (ms)
- [x] Error capture and display
- [x] Execution history and replay
- [x] Pause/resume at human approval nodes

### 4.5 Human-in-the-Loop Approvals
- [x] Approval queue for pending requests
- [x] Context display (node input/output at approval point)
- [x] Approve / Reject with notes
- [x] SLA deadlines per approval
- [x] Assignee routing

### 4.6 AI Copilot
- [x] In-app AI assistant (OpenAI-powered)
- [x] Workflow-aware context (knows your current workflow)
- [x] Streaming responses
- [x] Memory extraction from conversations

### 4.7 Agent Memory & Customer Intelligence
- [x] Customer profile management
- [x] Interaction history (email, chat, ticket, call, webhook)
- [x] AI sentiment analysis per interaction
- [x] Memory notes (AI-extracted facts about customers)
- [x] Customer segmentation (auto and manual)

### 4.8 Integrations
- [x] MCP (Model Context Protocol) server management
- [x] Integration credential store (OAuth tokens, API keys)
- [x] Supported integrations: Gmail, Slack, Zendesk, HubSpot, Outlook

### 4.9 Secret Manager
- [x] AES-256 encrypted secrets storage
- [x] Reference secrets in workflows as `{{secret.MY_KEY}}`
- [x] Global vs. user-specific secrets
- [x] Usage tracking and expiry

### 4.10 Deployment & Environments
- [x] Multi-environment promotion (dev → staging → production)
- [x] Deployment approval gates
- [x] Version rollback support
- [x] Deployment history

### 4.11 Observability
- [x] Distributed trace viewer
- [x] Execution analytics and charts
- [x] Audit log with full action trail
- [x] Notification center (in-app alerts)

### 4.12 Embeddable Widget
- [x] Embeddable public workflow form (`/embed` route)
- [x] Public embed.js script for external sites
- [x] White-label configuration

### 4.13 Marketplace
- [x] Plugin/template marketplace
- [x] Community-shared workflow templates

---

## 5. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Page load time | < 2s (LCP) |
| API response time | < 500ms p95 |
| Authentication | JWT, 30-day session |
| Data encryption | AES-256 for secrets, TLS in transit |
| Availability | 99.9% (Netlify serverless SLA) |
| Compliance | Audit trail for all write operations |

---

## 6. Out of Scope (v0.2.0)

- Mobile native apps
- Self-hosted on-premise installer
- Custom LLM fine-tuning UI
- Billing / subscription management UI

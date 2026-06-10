const { Document, Packer, Paragraph, TextRun, Header, Footer, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, PageNumber, WidthType, BorderStyle, ShadingType, PageBreak,
  TableOfContents, NumberFormat } = require("docx");
const fs = require("fs");

// ── Palette: Dawn Mist Tech (AI/Tech report) ──
const P = { primary: "#0A1628", body: "#1A2B40", secondary: "#6878A0", accent: "#5B8DB8", surface: "#F4F8FC" };
const c = (hex) => hex.replace("#", "");

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };
const accentLine = { style: BorderStyle.SINGLE, size: 2, color: c(P.accent) };
const thinLine = { style: BorderStyle.SINGLE, size: 1, color: "D0D8E0" };

// ── Helpers ──
function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 360 : 240, after: 120 },
    children: [new TextRun({ text, bold: true, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" }, size: level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 28 : 26 })],
  });
}

function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
  });
}

function bodyNoIndent(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
  });
}

function bulletItem(text, level = 0) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { left: 480 + level * 360 },
    spacing: { line: 312, after: 60 },
    children: [
      new TextRun({ text: "\u2022 ", size: 24, color: c(P.accent), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
      new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
    ],
  });
}

function boldBullet(boldText, normalText, level = 0) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { left: 480 + level * 360 },
    spacing: { line: 312, after: 60 },
    children: [
      new TextRun({ text: "\u2022 ", size: 24, color: c(P.accent), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
      new TextRun({ text: boldText, bold: true, size: 24, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
      new TextRun({ text: normalText, size: 24, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
    ],
  });
}

function emptyLine() {
  return new Paragraph({ spacing: { after: 120 }, children: [] });
}

// Horizontal-Only Table
function hTable(headers, rows) {
  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map(h => new TableCell({
      shading: { type: ShadingType.CLEAR, fill: c(P.accent) },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 21, color: "FFFFFF", font: { ascii: "Calibri", eastAsia: "SimHei" } })] })],
    })),
  });
  const dataRows = rows.map((row, i) => new TableRow({
    cantSplit: true,
    children: row.map(cell => new TableCell({
      shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? c(P.surface) : "FFFFFF" },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: String(cell), size: 21, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })] })],
    })),
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: accentLine, bottom: accentLine, left: NB, right: NB, insideHorizontal: thinLine, insideVertical: NB },
    rows: [headerRow, ...dataRows],
  });
}

// ── Cover (R1 Pure Paragraph Left, DM-1 Deep Cyan palette) ──
function buildCover() {
  const coverP = { bg: "162235", titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", accent: "37DCF2" };
  return [
    new Table({
      borders: allNoBorders,
      rows: [new TableRow({
        height: { value: 16838, rule: "exact" },
        children: [new TableCell({
          verticalAlign: "top",
          borders: allNoBorders,
          children: [
            new Paragraph({ spacing: { before: 4800 }, children: [] }),
            new Paragraph({
              indent: { left: 800 },
              spacing: { after: 200 },
              border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: coverP.accent, space: 16 } },
              children: [],
            }),
            new Paragraph({
              indent: { left: 800 },
              spacing: { before: 300, after: 100 },
              children: [new TextRun({ text: "OpenWorkflow", size: 72, bold: true, color: coverP.titleColor, font: { ascii: "Calibri", eastAsia: "SimHei" } })],
            }),
            new Paragraph({
              indent: { left: 800 },
              spacing: { after: 100 },
              children: [new TextRun({ text: "Competitive Gap Analysis", size: 44, color: coverP.titleColor, font: { ascii: "Calibri", eastAsia: "SimHei" } })],
            }),
            new Paragraph({
              indent: { left: 800 },
              spacing: { after: 200 },
              children: [new TextRun({ text: "Feature Comparison & Missing Capabilities Assessment", size: 26, color: coverP.subtitleColor, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
            }),
            new Paragraph({
              indent: { left: 800 },
              spacing: { before: 600 },
              border: { top: { style: BorderStyle.SINGLE, size: 6, color: coverP.accent, space: 16 } },
              children: [],
            }),
            new Paragraph({
              indent: { left: 800 },
              spacing: { before: 200 },
              children: [new TextRun({ text: "June 2026", size: 22, color: coverP.metaColor, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
            }),
            new Paragraph({
              indent: { left: 800 },
              spacing: { before: 80 },
              children: [new TextRun({ text: "Product Strategy & Engineering", size: 22, color: coverP.metaColor, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
            }),
          ],
        })],
      })],
    }),
  ];
}

// ── Content ──
function buildContent() {
  const children = [];

  // === Section 1: Executive Summary ===
  children.push(heading("1. Executive Summary"));
  children.push(body("This report presents a comprehensive competitive gap analysis of the OpenWorkflow platform against twelve leading competitors in the AI workflow automation space. The analysis covers five categories of competitors: general automation platforms (Zapier, Make), AI-native workflow builders (n8n, Dify, LangFlow, Flowise), agent orchestration platforms (CrewAI, AutoGen, Relevance AI), developer-first tools (Windmill, Trigger.dev), and consumer bot builders (Coze). The goal is to identify critical feature gaps that must be addressed for OpenWorkflow to establish a strong competitive position in the rapidly growing AI workflow automation market, which is projected to reach $37.45 billion by 2030."));
  children.push(body("OpenWorkflow demonstrates several significant strengths: a sophisticated AI employee paradigm with customer memory and context injection, a visual workflow builder with 24 node types across 5 categories, a confidence-based routing system for AI decisions, and real-time execution tracking with error recovery. However, the analysis reveals critical gaps in integration breadth, real-time collaboration, production deployment infrastructure, and several execution engine capabilities that are currently simulated rather than fully implemented. Addressing these gaps in priority order will be essential for market competitiveness."));
  children.push(body("The most urgent gaps fall into three tiers: Tier 1 (showstoppers that prevent production use) includes the simulated execution engine, missing OAuth flows, and no persistent rate limiting. Tier 2 (competitive disadvantages) includes the limited integration count, lack of real-time collaboration, and incomplete analytics. Tier 3 (differentiation opportunities) includes custom code nodes, an API marketplace, and advanced multi-agent orchestration. This report details each gap with specific recommendations and implementation priority."));

  // === Section 2: Current Feature Inventory ===
  children.push(heading("2. OpenWorkflow Current Feature Inventory"));
  children.push(body("Before examining the competitive landscape, it is essential to establish a clear picture of what OpenWorkflow currently implements. The following inventory reflects the state of the codebase as of June 2026, categorized by functional area with implementation maturity assessment."));

  children.push(heading("2.1 Workflow Builder & Canvas", 2));
  children.push(body("The visual workflow builder is built on ReactFlow v12 and provides a drag-and-drop canvas with 24 node types across 5 categories (Trigger, Logic, AI, Human, Action). The canvas supports undo/redo with keyboard shortcuts, auto-layout via Dagre, import/export of workflows as JSON, snap-to-grid alignment, and a searchable node palette. Workflow version history with snapshot creation and restore is fully implemented. The builder also includes an AI workflow generator that can create workflows from natural language descriptions, and a template gallery with 6 pre-built workflow templates for common use cases like AI support employees and SDR automation."));

  children.push(heading("2.2 Execution Engine", 2));
  children.push(body("The execution engine uses a BFS (breadth-first search) traversal pattern starting from trigger nodes, with a maximum depth of 50 to prevent infinite loops. It supports real AI execution via an API endpoint for LLM, Classifier, Agent, RAG, and Summarizer nodes, with deterministic simulated fallbacks when the AI API is unavailable. The engine tracks token usage and cost per execution, implements confidence scoring (0.65-0.99 range), and supports confidence-based routing with configurable thresholds. A 60-second safety timer prevents stuck executions, and approval nodes pause execution for human review. However, several critical nodes have incomplete implementations: the Retry node simulates rather than truly re-executing predecessors, the Loop node returns simulated results without actual iteration, and subflow execution via the trigger-workflow action is partially simulated."));

  children.push(heading("2.3 AI & Memory Capabilities", 2));
  children.push(body("OpenWorkflow's AI capabilities span five node types (LLM, Agent, RAG, Classifier, Summarizer), each with real API integration and simulated fallback. The standout feature is the Agent Memory Layer, which maintains customer context including profile data, interaction history, sentiment trends, and extracted knowledge notes. Before any AI node execution, the engine automatically injects relevant customer memory into the system prompt, enabling personalized responses. After execution, interactions are recorded back to memory with sentiment and confidence metadata. The memory store supports customer segmentation, knowledge extraction from interactions, and analytics including sentiment time series and interaction distributions. This memory-augmented AI approach is a genuine differentiator that few competitors match at this depth."));

  children.push(heading("2.4 Integration & Trigger System", 2));
  children.push(body("The integration registry defines 5 integrations (Gmail, Slack, Zendesk, HubSpot, Outlook) with real API execution when credentials are provided and simulated responses otherwise. MCP (Model Context Protocol) support includes 8 built-in tools (web search, calculator, HTTP request, file read, code execute, database query, email send, Slack message) and DB-backed MCP server persistence. The trigger system supports schedule triggers (via node-cron), email triggers (via IMAP with imapflow), and webhook triggers (with DB-backed models). However, form triggers, voice call triggers, and WhatsApp triggers are defined as types but have no implementation. OAuth flows for integrations are simulated with a 2-second timer rather than implementing real OAuth redirect flows."));

  children.push(heading("2.5 Security, Auth & Operations", 2));
  children.push(body("Authentication uses NextAuth.js v5 with credentials, GitHub, and Google OAuth providers, JWT sessions, and a role system (ADMIN, USER, VIEWER). Rate limiting is implemented with an in-memory sliding window algorithm supporting 6 preset configurations, though it does not persist across server restarts. The audit trail system logs 14 predefined action types with user, IP, and user agent tracking, presented in a paginated UI with filtering. A notification system with DB-backed models exists but lacks actual delivery mechanisms (no email or push notification sending). The settings page includes profile management, organization settings, notification preferences, password changes, and API key generation."));

  // === Section 3: Feature Comparison Matrix ===
  children.push(heading("3. Feature Comparison Matrix"));
  children.push(body("The following matrix compares OpenWorkflow against the twelve key competitors across critical capability dimensions. Each feature is rated on a three-point scale: fully implemented and production-ready, partially implemented or with significant limitations, or not available. This comparison focuses on features that matter most to enterprise buyers and technical teams evaluating workflow automation platforms."));

  children.push(hTable(
    ["Feature", "OpenWorkflow", "n8n", "Dify", "LangFlow", "CrewAI", "Zapier", "Make", "Relevance AI", "Windmill"],
    [
      ["Visual Workflow Builder", "\u2705 Full", "\u2705 Full", "\u2705 Full", "\u2705 Full", "\u2705 Studio", "\u2705 Full", "\u2705 Full", "\u2705 Full", "\u274c None"],
      ["AI Agent Nodes", "\u2705 Full", "\u2705 Full", "\u2705 Full", "\u2705 Full", "\u2705 Core", "\u26a0\ufe0f Basic", "\u26a0\ufe0f Basic", "\u2705 Core", "\u26a0\ufe0f New"],
      ["Multi-Agent Orchestration", "\u274c None", "\u26a0\ufe0f Basic", "\u26a0\ufe0f Basic", "\u26a0\ufe0f Basic", "\u2705 Best", "\u274c None", "\u274c None", "\u2705 Full", "\u274c None"],
      ["RAG / Knowledge Base", "\u26a0\ufe0f Memory", "\u26a0\ufe0f Weak", "\u2705 Best", "\u2705 Full", "\u2705 Full", "\u274c None", "\u274c None", "\u2705 Full", "\u274c None"],
      ["Customer Memory Layer", "\u2705 Unique", "\u274c None", "\u26a0\ufe0f Basic", "\u26a0\ufe0f Basic", "\u26a0\ufe0f Basic", "\u274c None", "\u274c None", "\u2705 Full", "\u274c None"],
      ["Confidence Routing", "\u2705 Unique", "\u274c None", "\u26a0\ufe0f Basic", "\u274c None", "\u274c None", "\u274c None", "\u274c None", "\u26a0\ufe0f Basic", "\u274c None"],
      ["Self-Hostable", "\u2705 Full", "\u2705 Full", "\u2705 Full", "\u2705 Full", "\u26a0\ufe0f Partial", "\u274c None", "\u274c None", "\u274c None", "\u2705 Full"],
      ["Custom Code in Nodes", "\u274c None", "\u2705 JS/Py", "\u26a0\ufe0f Limited", "\u2705 Python", "\u2705 Python", "\u274c None", "\u274c None", "\u274c None", "\u2705 Multi"],
      ["MCP Support", "\u2705 Full", "\u2705 Full", "\u26a0\ufe0f Partial", "\u2705 Full", "\u2705 Full", "\u274c None", "\u274c None", "\u274c None", "\u274c None"],
      ["Human-in-the-Loop", "\u2705 Full", "\u2705 Full", "\u26a0\ufe0f Basic", "\u26a0\ufe0f Basic", "\u2705 Full", "\u26a0\ufe0f Basic", "\u26a0\ufe0f Basic", "\u2705 Full", "\u2705 Full"],
      ["Integration Count", "5", "400+", "100+", "100+", "50+", "8,000+", "1,800+", "50+", "50+"],
      ["Real OAuth Flows", "\u274c Simulated", "\u2705 Full", "\u2705 Full", "\u2705 Full", "\u2705 Full", "\u2705 Full", "\u2705 Full", "\u2705 Full", "\u2705 Full"],
      ["Execution Replay", "\u2705 Full", "\u2705 Full", "\u26a0\ufe0f Logs", "\u26a0\ufe0f Logs", "\u26a0\ufe0f Logs", "\u26a0\ufe0f Logs", "\u2705 Visual", "\u26a0\ufe0f Logs", "\u2705 Full"],
      ["Version Control", "\u2705 Full", "\u26a0\ufe0f Basic", "\u26a0\ufe0f Basic", "\u274c None", "\u274c None", "\u26a0\ufe0f Basic", "\u26a0\ufe0f Basic", "\u274c None", "\u2705 Git-based"],
      ["Observability / Monitoring", "\u26a0\ufe0f Partial", "\u2705 Full", "\u2705 Full", "\u26a0\ufe0f Basic", "\u2705 Enterprise", "\u26a0\ufe0f Basic", "\u2705 Full", "\u2705 Full", "\u2705 Full"],
      ["Real-time Collaboration", "\u274c None", "\u274c None", "\u274c None", "\u274c None", "\u274c None", "\u26a0\ufe0f Basic", "\u26a0\ufe0f Basic", "\u274c None", "\u2705 Full"],
      ["Template Marketplace", "\u26a0\ufe0f 6 items", "\u2705 900+", "\u2705 Plugins", "\u26a0\ufe0f Basic", "\u274c None", "\u2705 Large", "\u2705 Large", "\u26a0\ufe0f Basic", "\u26a0\ufe0f Basic"],
      ["Scheduling / Cron", "\u2705 Full", "\u2705 Full", "\u2705 Full", "\u26a0\ufe0f Basic", "\u2705 Full", "\u2705 Full", "\u2705 Full", "\u2705 Full", "\u2705 Full"],
      ["Error Recovery / Retry", "\u26a0\ufe0f Simulated", "\u2705 Full", "\u26a0\ufe0f Basic", "\u26a0\ufe0f Basic", "\u26a0\ufe0f Basic", "\u2705 Full", "\u2705 Full", "\u2705 Full", "\u2705 Full"],
      ["SSO / Enterprise Auth", "\u26a0\ufe0f Basic", "\u2705 Full", "\u2705 Full", "\u274c None", "\u2705 Enterprise", "\u2705 Full", "\u2705 Full", "\u2705 Full", "\u2705 Full"],
    ]
  ));

  children.push(emptyLine());
  children.push(bodyNoIndent("Legend: \u2705 = Fully implemented and production-ready | \u26a0\ufe0f = Partial or with significant limitations | \u274c = Not available"));
  children.push(emptyLine());

  // === Section 4: Critical Gaps ===
  children.push(heading("4. Critical Feature Gaps"));
  children.push(body("This section details the most significant gaps between OpenWorkflow and the competitive landscape, organized by priority tier. Each gap includes a description of what competitors offer, the current state in OpenWorkflow, and a concrete recommendation for closing the gap."));

  // Tier 1
  children.push(heading("4.1 Tier 1: Showstoppers (Prevents Production Use)", 2));

  children.push(heading("4.1.1 Simulated Execution Engine Nodes", 3));
  children.push(body("The most critical gap in OpenWorkflow is that several core execution engine features are simulated rather than fully implemented. The Retry node does not actually re-execute its predecessor node; it merely simulates a retry and marks it as successful. The Loop node returns simulated iteration results with a hardcoded maximum of 3 iterations instead of actually iterating over collections. The Switch node falls back to hash-based routing when conditions cannot be evaluated, which produces non-deterministic results. These simulations work for demos but will cause silent failures in production when users expect actual retry, loop, and branching behavior."));
  children.push(body("By comparison, n8n provides full loop iteration with item-by-item processing, real retry logic with exponential backoff at both the node and workflow level, and deterministic switch/case evaluation. Make offers visual debugging of each loop iteration and granular error handling with rollback capabilities. Dify supports iterative processing with variable binding and conditional branching with full expression evaluation. The gap here is not merely one of polish but of fundamental correctness: a workflow engine that does not reliably execute its defined logic cannot be trusted for production workloads."));
  children.push(boldBullet("Recommendation: ", "Implement true iterative execution for the Loop node with collection variable binding, real re-execution for the Retry node using recursive BFS, and deterministic Switch evaluation with a proper expression engine. These should be treated as P0 bugs, not feature requests."));

  children.push(heading("4.1.2 No Real OAuth Integration Flows", 3));
  children.push(body("The integration system currently simulates OAuth connections with a 2-second timer rather than implementing actual OAuth 2.0 redirect flows. Users cannot connect their real Gmail, Slack, HubSpot, or other third-party accounts. The credentials model exists in the database, but there is no mechanism to populate it with real tokens. This means the entire integration layer is effectively a demo, not a production feature."));
  children.push(body("Every major competitor implements real OAuth flows. n8n supports OAuth 2.0 with automatic token refresh for 400+ integrations. Dify provides a plugin system where each plugin handles its own authentication. Zapier and Make have built their entire value proposition on authenticated integrations with 8,000+ and 1,800+ apps respectively. Without real OAuth, OpenWorkflow cannot connect to any external service, which severely limits its utility for automating real business processes."));
  children.push(boldBullet("Recommendation: ", "Implement a generic OAuth 2.0 flow with PKCE support, automatic token refresh, and secure credential storage. Start with the 5 existing integrations (Gmail, Slack, Zendesk, HubSpot, Outlook) and validate the flow end-to-end before expanding the integration catalog."));

  children.push(heading("4.1.3 No Persistent Rate Limiting", 3));
  children.push(body("The current rate limiting system uses an in-memory sliding window algorithm, which means all rate limit state is lost on server restart and cannot be shared across multiple server instances. For a platform that aims to serve production workloads, this is insufficient. A burst of requests after a restart could overwhelm downstream APIs, and horizontal scaling is impossible without shared rate limit state."));
  children.push(body("Competitors like n8n use Redis-backed rate limiting that persists across restarts and works in multi-instance deployments. Trigger.dev implements distributed rate limiting as a core infrastructure feature. Windmill uses a database-backed approach that integrates with its governance layer. The solution is to move from in-memory state to a persistent store, ideally Redis for performance or the existing database for simplicity."));
  children.push(boldBullet("Recommendation: ", "Implement Redis-backed rate limiting with the existing sliding window algorithm. If Redis is not available, fall back to database-backed rate limiting using the existing Prisma schema. Ensure the rate limit key is consistent across instances by using the same IP extraction logic."));

  children.push(heading("4.1.4 Incomplete Trigger Implementations", 3));
  children.push(body("Three trigger types (Form, Voice Call, WhatsApp) are defined in the type system but have no implementation. Form triggers are particularly important because they enable self-service workflow initiation by non-technical users, which is a key adoption driver. Voice call and WhatsApp triggers are increasingly important for customer-facing AI employee workflows. Currently, only Schedule, Email, and Webhook triggers are functional."));
  children.push(body("n8n supports form triggers with a built-in form builder that generates public URLs. Dify offers conversational triggers via chat widgets. Coze deploys bots to WhatsApp, Telegram, and Discord natively. Make and Zapier support form triggers through integrations with Typeform, Google Forms, and similar services. The absence of form triggers specifically limits OpenWorkflow's applicability in lead capture, customer intake, and internal request scenarios."));
  children.push(boldBullet("Recommendation: ", "Implement Form triggers first with a built-in form builder and public URL generation. Add WhatsApp triggers via the Twilio API or WhatsApp Business API. Voice call triggers can be deferred to a later phase as they require telephony infrastructure (Twilio, Vonage)."));

  // Tier 2
  children.push(heading("4.2 Tier 2: Competitive Disadvantages", 2));

  children.push(heading("4.2.1 Extremely Limited Integration Catalog (5 vs 400+)", 3));
  children.push(body("OpenWorkflow currently supports only 5 integrations (Gmail, Slack, Zendesk, HubSpot, Outlook), while n8n offers 400+, Zapier exceeds 8,000, and Make provides 1,800+. Even AI-native competitors like Dify and LangFlow support 100+ integrations through their plugin ecosystems. The integration catalog is one of the primary decision factors for enterprise buyers evaluating automation platforms, and the current gap makes OpenWorkflow non-competitive for most multi-app automation scenarios."));
  children.push(body("Building integrations one by one is not scalable. The most effective approach is to implement a universal HTTP Request node (similar to n8n) that can connect to any REST API, combined with a community-driven integration template system where users can share API configurations. Additionally, MCP support should be expanded to allow connecting to any MCP-compatible server, which provides access to a growing ecosystem of tools and data sources without building individual integrations."));
  children.push(boldBullet("Recommendation: ", "Short-term: Add a universal HTTP Request node with header, body, and auth configuration. Medium-term: Implement a community integration template system where users can publish and share API configurations. Long-term: Build an MCP gateway that provides access to any MCP-compatible tool or data source."));

  children.push(heading("4.2.2 No Real-Time Collaboration", 3));
  children.push(body("OpenWorkflow currently operates as a single-user application with no real-time collaboration features. Multiple users cannot simultaneously edit the same workflow, see each other's cursors, or leave comments on nodes. Windmill is the only competitor that currently offers full real-time collaboration with shared editing, but this is rapidly becoming a table-stakes feature for team-oriented tools. Even n8n has added basic sharing and execution permissions in recent versions."));
  children.push(body("The absence of collaboration features creates friction for teams: workflows must be exported and re-imported to share them, there is no way to review or approve workflow changes before they go live, and there is no way for multiple team members to work on different parts of a complex workflow simultaneously. For enterprise adoption, collaboration is not a nice-to-have but a requirement, as automation workflows are typically owned by cross-functional teams spanning operations, engineering, and business units."));
  children.push(boldBullet("Recommendation: ", "Implement real-time collaboration using WebSocket-based operational transformation or CRDTs (Conflict-free Replicated Data Types). Start with presence indicators (who is viewing/editing), then add cursor sharing, and finally implement concurrent editing with conflict resolution. Consider using Yjs or Automerge as the CRDT layer."));

  children.push(heading("4.2.3 Analytics Not Connected to Live Data", 3));
  children.push(body("The Analytics page currently displays hardcoded static data rather than computing metrics from actual execution results. Per-employee sparklines, cost breakdowns, and failure analysis are all pre-generated mock values. This undermines the value of the analytics feature entirely, as users cannot make data-driven decisions about their AI workforce based on real performance data."));
  children.push(body("By contrast, n8n provides execution-based analytics with filtering by workflow, time range, and status. Dify offers conversation analytics with token usage tracking. Relevance AI provides AI workforce KPIs aligned with business metrics. Make's visual analytics show data flow through modules in real time. A functional analytics layer is essential for demonstrating ROI and justifying continued investment in the platform."));
  children.push(boldBullet("Recommendation: ", "Connect the Analytics page to the existing Execution and Memory data models. Compute real metrics from the Prisma database: execution success rates, average duration, token costs per workflow, confidence distributions, and customer sentiment trends. The data models already exist; only the UI aggregation queries need to be implemented."));

  children.push(heading("4.2.4 No Custom Code Nodes", 3));
  children.push(body("OpenWorkflow does not support custom code execution within workflows. Users cannot write JavaScript, Python, or any other language to implement custom logic, data transformations, or API calls that are not covered by the built-in node types. This is a significant limitation compared to n8n (which supports JS and Python code nodes), LangFlow (Python components), Windmill (Python, TypeScript, Go, Bash, SQL), and Trigger.dev (TypeScript-native)."));
  children.push(body("Custom code nodes serve as an escape hatch when built-in nodes cannot express the required logic. They are especially important for data transformation, custom API integration, and implementing business rules that do not fit the condition/switch paradigm. Without them, users hit a hard wall when their needs exceed the predefined node types, forcing them to abandon the platform or build external microservices. MCP tools partially address this gap with the code_execute tool, but that runs outside the workflow context and cannot access workflow variables or node outputs."));
  children.push(boldBullet("Recommendation: ", "Implement sandboxed JavaScript and Python code nodes that have access to the workflow's input data, node outputs, and variables. Use a secure sandbox (VM2 for JS, RestrictedPython for Python) to prevent security issues. Provide a code editor with syntax highlighting, auto-completion, and test execution within the node configuration panel."));

  children.push(heading("4.2.5 No Deployment/Publishing Workflow", 3));
  children.push(body("There is no mechanism to deploy or publish a workflow from the builder to a production environment. Workflows exist in a single environment with no distinction between development, staging, and production. Once saved, a workflow is immediately active, which means any edit could break a running production process. Competitors like n8n offer environment separation, Dify provides a publishing workflow, and Windmill supports deployment through git-based versioning."));
  children.push(body("The current version history feature provides snapshots but no deployment concept. A proper deployment workflow would include: environment separation (dev/staging/prod), promotion of workflow versions between environments, rollback capabilities, and canary deployment for testing changes with a subset of traffic. Without this, teams cannot safely iterate on production workflows, which creates risk aversion and slows innovation."));
  children.push(boldBullet("Recommendation: ", "Implement a multi-environment deployment system. Start with a simple dev/prod split where edits happen in dev and are promoted to prod via a deploy action. Add staging as an intermediate step. Leverage the existing version history feature to enable rollback. Consider environment-specific variable sets for API keys and configuration."));

  // Tier 3
  children.push(heading("4.3 Tier 3: Differentiation Opportunities", 2));

  children.push(heading("4.3.1 Multi-Agent Orchestration", 3));
  children.push(body("While OpenWorkflow has an Agent node type, it lacks true multi-agent orchestration where multiple AI agents collaborate on complex tasks. CrewAI is the market leader here with its role-based agent paradigm (researcher, writer, editor), task delegation, and sequential or parallel execution patterns. AutoGen provides sophisticated multi-agent conversation patterns. Relevance AI positions AI agents as workforce members with organizational hierarchies. The current Agent node in OpenWorkflow operates in isolation and cannot delegate subtasks to other agents or participate in agent teams."));
  children.push(body("Multi-agent orchestration is the fastest-growing segment of the AI workflow market. Implementing it would position OpenWorkflow uniquely as the only platform combining visual workflow building, customer memory, confidence routing, and multi-agent collaboration in a single tool. The existing workflow canvas naturally maps to multi-agent orchestration: each Agent node can represent a team member, edges define communication and delegation paths, and the memory layer provides shared context."));

  children.push(heading("4.3.2 API Marketplace / Plugin Ecosystem", 3));
  children.push(body("Dify has launched a plugin marketplace where developers can publish and sell AI models, tools, and integrations. n8n has a community template library with 900+ workflow templates. Zapier's app marketplace with 8,000+ integrations is its primary competitive moat. OpenWorkflow has a marketplace panel with 6 AI employee listings, but it is entirely UI-only with no plugin system, no community contributions, and no developer SDK. Building a plugin ecosystem would dramatically expand the platform's capabilities without requiring the core team to build every integration."));

  children.push(heading("4.3.3 Advanced Observability & Monitoring", 3));
  children.push(body("Enterprise buyers need production-grade observability: distributed tracing across workflow steps, alerting on failure thresholds, SLA monitoring with dashboards, and integration with tools like Datadog, PagerDuty, and Slack. The current audit trail and execution logs provide basic visibility but lack real-time alerting, metric aggregation, and external monitoring integration. Windmill and Trigger.dev lead in this area with built-in observability dashboards and alerting systems."));

  children.push(heading("4.3.4 Workflow Testing & Debugging", 3));
  children.push(body("There is no way to unit test a workflow, mock node outputs for testing, or step through a workflow in debug mode. n8n provides a built-in test execution mode with mock data. Make offers visual debugging where you can see data packets flowing through each module. Dify supports conversation preview and testing. A proper testing framework would include: mock data injection at any node, step-through debugging, breakpoint support, and automated regression testing for workflow changes."));

  children.push(heading("4.3.5 White-Label / Embedded Workflow Engine", 3));
  children.push(body("Several competitors (n8n, Dify, Windmill) offer embedded or white-label versions of their workflow engines that can be integrated into other SaaS products. This opens a B2B revenue channel where OpenWorkflow becomes the workflow engine powering other applications. The current architecture is tightly coupled to the Next.js frontend, but extracting the execution engine as a standalone library or API service would enable embedding scenarios."));

  // === Section 5: Priority Roadmap ===
  children.push(heading("5. Recommended Implementation Roadmap"));
  children.push(body("Based on the gap analysis, the following roadmap prioritizes fixes by impact and dependency. Each phase builds on the previous one, ensuring that foundational capabilities are solid before adding advanced features. The timeline assumes a team of 3-5 engineers working full-time on the platform."));

  children.push(hTable(
    ["Phase", "Timeline", "Focus Area", "Key Deliverables"],
    [
      ["Phase 1", "Weeks 1-4", "Execution Engine Fixes", "True Loop iteration, real Retry re-execution, deterministic Switch evaluation, persistent rate limiting"],
      ["Phase 2", "Weeks 5-8", "Integration Infrastructure", "Generic OAuth 2.0 flow, universal HTTP Request node, real credential management for 5 existing integrations"],
      ["Phase 3", "Weeks 9-12", "Triggers & Analytics", "Form trigger with form builder, connect Analytics to live data, WhatsApp trigger via Twilio"],
      ["Phase 4", "Weeks 13-18", "Custom Code & Collaboration", "Sandboxed JS/Python code nodes, real-time presence, cursor sharing, concurrent editing"],
      ["Phase 5", "Weeks 19-24", "Deployment & Marketplace", "Dev/staging/prod environments, deploy/rollback, plugin SDK, community template sharing"],
      ["Phase 6", "Weeks 25-32", "Multi-Agent & Advanced", "Agent-to-agent delegation, team workflows, advanced observability, alerting, white-label API"],
    ]
  ));

  children.push(emptyLine());

  // === Section 6: Competitive Positioning ===
  children.push(heading("6. Competitive Positioning Strategy"));
  children.push(body("OpenWorkflow's unique value proposition lies at the intersection of three capabilities that no single competitor currently combines: customer memory-augmented AI execution, confidence-based routing with human-in-the-loop fallback, and the AI employee paradigm that maps automation to organizational roles. This positioning should be the foundation of all product messaging and feature prioritization decisions."));

  children.push(heading("6.1 What OpenWorkflow Does That Others Don't", 2));
  children.push(boldBullet("Customer Memory Layer: ", "No competitor automatically injects customer context (history, sentiment, tier, preferences) into AI node system prompts and records interaction outcomes back to memory. This creates workflows that truly personalize responses rather than treating every interaction as stateless."));
  children.push(boldBullet("Confidence-Based Routing: ", "The high_confidence/low_confidence source handles on AI nodes, combined with configurable thresholds, enable automatic routing between auto-send and human review. This is a safety-critical feature for production AI deployments that competitors lack."));
  children.push(boldBullet("AI Employee Paradigm: ", "While Relevance AI uses similar language, OpenWorkflow's implementation is more concrete: each workflow IS an AI employee with defined inputs (triggers), reasoning (AI nodes), guardrails (confidence routing + approvals), and actions (integrations). This mental model resonates with business buyers."));

  children.push(heading("6.2 Where to Differentiate vs. Compete Head-On", 2));
  children.push(body("OpenWorkflow should not attempt to match Zapier's 8,000+ integration count or Make's visual debugging granularity. Instead, the strategy should be to differentiate on AI intelligence depth while maintaining competitive parity on integration breadth through the universal HTTP Request node and MCP gateway. The key insight is that in an AI-native workflow platform, the integration count matters less than the intelligence with which integrations are orchestrated. A platform with 50 integrations but deep AI reasoning, memory, and confidence routing delivers more value than one with 8,000 integrations but no AI layer."));
  children.push(body("The competitive moat should be built on three pillars: (1) The Memory Layer, which becomes more valuable as more interactions are processed, creating switching costs; (2) The Confidence Engine, which provides auditable safety guarantees that enterprises require; and (3) The AI Employee abstraction, which maps directly to business outcomes rather than technical workflow concepts. Each pillar should be deepened rather than broadened."));

  // === Section 7: Summary ===
  children.push(heading("7. Summary of Missing Capabilities"));
  children.push(body("The following table provides a consolidated view of all identified gaps, their severity, current status, and recommended action. This serves as the definitive reference for product planning and engineering prioritization."));

  children.push(hTable(
    ["Gap", "Severity", "Current State", "Competitor Benchmark", "Recommended Action"],
    [
      ["Simulated execution nodes", "P0 Critical", "Retry/Loop/Switch simulated", "n8n: Full implementation", "Implement real iterative execution"],
      ["No real OAuth flows", "P0 Critical", "2-second timer simulation", "All competitors: Real OAuth", "Build generic OAuth 2.0 flow"],
      ["Persistent rate limiting", "P0 Critical", "In-memory only", "n8n: Redis-backed", "Migrate to Redis or DB-backed"],
      ["Missing triggers (Form/Voice/WA)", "P0 Critical", "Type defined, no impl", "n8n: Full form builder", "Implement Form trigger first"],
      ["Only 5 integrations", "P1 High", "5 with simulated OAuth", "n8n: 400+, Zapier: 8,000+", "HTTP Request node + MCP gateway"],
      ["No real-time collaboration", "P1 High", "Single-user only", "Windmill: Full collab", "WebSocket + CRDT (Yjs)"],
      ["Analytics uses hardcoded data", "P1 High", "Static mock values", "n8n/Dify: Live analytics", "Connect to Prisma data models"],
      ["No custom code nodes", "P1 High", "Not available", "n8n: JS/Python, Windmill: Multi", "Sandboxed JS + Python nodes"],
      ["No deployment workflow", "P1 High", "Save = immediate active", "Dify: Publish flow, Windmill: Git", "Dev/staging/prod separation"],
      ["No multi-agent orchestration", "P2 Medium", "Agent node isolated", "CrewAI: Role-based teams", "Agent delegation + team patterns"],
      ["No plugin ecosystem", "P2 Medium", "6 UI-only marketplace items", "Dify: Plugin marketplace", "Plugin SDK + community hub"],
      ["No advanced observability", "P2 Medium", "Basic audit trail", "Windmill/Trigger.dev: Full", "Alerting + external integrations"],
      ["No workflow testing", "P2 Medium", "Execute and pray", "n8n: Test mode, Make: Visual", "Mock data + step-through debug"],
      ["No white-label/embed option", "P3 Low", "Coupled Next.js app", "n8n/Windmill: Embedded", "Extract engine as standalone API"],
      ["No notification delivery", "P2 Medium", "DB model, no sending", "All competitors: Email/push", "Email via SMTP + in-app push"],
      ["No SSO/SAML", "P2 Medium", "NextAuth basic", "n8n/Dify: Full SSO", "SAML + OIDC provider support"],
    ]
  ));

  children.push(emptyLine());
  children.push(body("OpenWorkflow has a strong foundation with unique differentiators in customer memory, confidence routing, and the AI employee paradigm. Closing the Tier 1 gaps will make the platform production-viable. Addressing Tier 2 gaps will make it competitive. Pursuing Tier 3 opportunities will make it a market leader. The recommended 32-week roadmap provides a structured path from current state to market leadership, with each phase delivering measurable value."));

  return children;
}

// ── Document Assembly ──
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }, size: 24, color: c(P.body) },
        paragraph: { spacing: { line: 312 } },
      },
    },
  },
  sections: [
    // Cover
    {
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } },
      },
      children: buildCover(),
    },
    // TOC
    {
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 }, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: c(P.secondary) })] })] }),
      },
      children: [
        new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" } })] }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({ children: [new TextRun({ text: "Right-click the Table of Contents and select \u201cUpdate Field\u201d to refresh page numbers.", italics: true, size: 20, color: c(P.secondary) })] }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },
    // Body
    {
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 }, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } },
      },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: c(P.secondary) })] })] }),
      },
      headers: {
        default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "OpenWorkflow Competitive Gap Analysis", size: 18, color: c(P.secondary), italics: true })] })] }),
      },
      children: buildContent(),
    },
  ],
});

// ── Generate ──
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("/home/z/my-project/download/OpenWorkflow_Competitive_Gap_Analysis.docx", buf);
  console.log("Document generated: /home/z/my-project/download/OpenWorkflow_Competitive_Gap_Analysis.docx");
});

import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const maxDuration = 30;

interface CopilotMessage {
  role: string;
  content: string;
}

interface WorkflowContext {
  nodes: any[];
  edges: any[];
  workflowName: string;
}

interface CopilotRequestBody {
  messages: CopilotMessage[];
  workflowContext?: WorkflowContext;
}

const COPILOT_SYSTEM_PROMPT = `You are the OpenWorkflow AI Copilot — an intelligent assistant embedded inside the OpenWorkflow platform. You help users build, deploy, manage, and analyze AI Employees by providing expert guidance, workflow suggestions, and direct workflow manipulation.

## About OpenWorkflow

OpenWorkflow is an AI Employee platform that lets users build, deploy, and manage AI workers that automate business processes. Users create visual workflows using a drag-and-drop canvas, connecting nodes that represent triggers, AI processing, logic, human touchpoints, and actions.

## Available AI Employee Types

- **Support Employee**: Handles customer support tickets, triage, and resolution
- **SDR Employee**: Sales Development Representative — qualifies leads, handles outbound/inbound outreach
- **Recruiter**: Screens candidates, schedules interviews, manages hiring pipelines
- **Appointment Setter**: Books meetings, manages calendars, sends reminders
- **Onboarding Agent**: Guides new customers/employees through onboarding flows
- **Incident Responder**: Monitors alerts, triages incidents, coordinates response

## Available Node Types by Category

### Triggers (Start a workflow)
- **email**: Trigger when an email is received
- **webhook**: Trigger on incoming webhook request
- **schedule**: Trigger on a cron schedule
- **form**: Trigger when a form is submitted

### AI (Intelligent processing)
- **llm**: Large Language Model — generate text, answer questions, extract data
- **classifier**: Classify input into categories with confidence scores
- **agent**: Autonomous AI agent that can use tools and reason through tasks
- **rag**: Retrieval-Augmented Generation — query a knowledge base for grounded answers
- **summarizer**: Summarize long text, threads, or documents

### Logic (Control flow)
- **condition**: If/else branching based on data
- **switch**: Multi-way branching (like switch/case)
- **delay**: Wait for a specified duration
- **retry**: Retry a branch on failure with backoff
- **loop**: Iterate over a list of items

### Human (Human-in-the-loop)
- **approval**: Pause for human approval before continuing
- **review**: Send to a human for review and feedback
- **notify**: Send a notification to a human (no response needed)

### Action (Perform operations)
- **crm**: Create/update/query CRM records (HubSpot, Salesforce)
- **email**: Send an email
- **slack**: Send a Slack message
- **whatsapp**: Send a WhatsApp message
- **database**: Read/write from a database

## Key Features

### Confidence Routing
AI nodes (classifier, llm) return confidence scores (0-1). Use condition nodes to route high-confidence results to automation and low-confidence results to human review. This is critical for production AI Employees — you should almost always recommend confidence-based routing.

### Memory Layer
OpenWorkflow has a Memory Layer that stores and retrieves customer context. This context can be injected into AI node prompts so that the AI has full history and context about the customer. Always suggest using the Memory Layer when workflows involve customer interactions spanning multiple touchpoints.

### MCP Tools
Model Context Protocol (MCP) tools allow AI agents to interact with external systems in a standardized way. Suggest MCP tools when users need their AI Employees to perform actions across multiple platforms.

### Integrations
- **Gmail**: Send and read emails
- **Slack**: Send messages, read channels
- **Zendesk**: Create/update tickets, search knowledge base
- **HubSpot**: Manage contacts, deals, companies
- **Outlook**: Send and read emails, manage calendar

### Version History
Every workflow has full version history. Users can view changes, compare versions, and roll back to any previous version.

## Your Behavior

1. **Be concise but thorough** — Give actionable advice, not vague suggestions
2. **Suggest specific node types** — When recommending workflow patterns, name the exact nodes (e.g., "Add a classifier node followed by a condition node for confidence routing")
3. **Recommend best practices** — Always suggest confidence routing for AI nodes, memory layer for customer workflows, and human-in-the-loop for critical decisions
4. **Provide workflow templates** — When users ask to build a workflow, describe the full node sequence
5. **Explain features when asked** — Give clear explanations of OpenWorkflow features with practical examples
6. **Be proactive** — If you spot potential issues in a workflow (e.g., no error handling, no confidence routing), suggest improvements

## Response Format

You MUST respond with valid JSON in the following format:

\`\`\`json
{
  "content": "Your main response text in markdown format. This is what the user sees as your reply.",
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"],
  "workflowAction": {
    "type": "generate",
    "label": "Generate Support Workflow",
    "data": {}
  }
}
\`\`\`

Rules for the response format:
- **content** (required): Your main response, written in clear markdown. This is the primary answer to the user's question.
- **suggestions** (required): An array of 2-4 follow-up suggestions the user might want to ask next. These appear as clickable chips.
- **workflowAction** (optional): Include this when the user wants to create, modify, or analyze a workflow. 
  - type "generate": Generate a full workflow from a description. data should be empty or a string description.
  - type "template": Apply a pre-built template. data should be the template ID string (e.g., "ai-support-employee", "sdr-employee").
  - type "add_node": Add a specific node to the canvas. data should be { type: "node_type", label: "Node Label", category: "trigger|logic|ai|human|action" }.
  - type "analyze": Re-analyze the current workflow for issues and improvements.
  - type "run": Trigger a test execution of the current workflow.
  - type "navigate": Navigate the user to a specific section/feature. data should be the URL path string.
  - Only include this when it makes sense — not every response needs a workflow action.

When the user asks to add a node, use "add_node" type with the node type, label, and category.
When the user asks to analyze/improve the workflow, use "analyze" type.
When the user asks to run/test the workflow, use "run" type.

If you are unsure about any field, omit the workflowAction. Always include content and suggestions.

IMPORTANT: Return ONLY the JSON object, no other text before or after it.`;

function buildWorkflowContextPrompt(context: WorkflowContext): string {
  const nodeSummary = context.nodes.map((n: any) => {
    const label = n.data?.label || n.type || 'Unnamed';
    return `  - ${label} (type: ${n.type}, id: ${n.id})`;
  }).join('\n');

  const edgeSummary = context.edges.map((e: any) => {
    return `  - ${e.source} → ${e.target}${e.data?.label ? ` (${e.data.label})` : ''}`;
  }).join('\n');

  return `

## Current Workflow Context

The user currently has a workflow open named "${context.workflowName}" with the following structure:

### Nodes (${context.nodes.length} total):
${nodeSummary || '  (empty workflow)'}

### Connections (${context.edges.length} total):
${edgeSummary || '  (no connections)'}

Use this context to give specific, tailored advice about their current workflow. Reference specific nodes by name when making suggestions. If you notice issues (missing error handling, no confidence routing, disconnected nodes), proactively suggest fixes.`;
}

async function handlePost(request: Request) {
  try {
    const body = await request.json() as CopilotRequestBody;
    const { messages = [], workflowContext } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Messages are required' },
        { status: 400 }
      );
    }

    // Build the full system prompt
    let systemPrompt = COPILOT_SYSTEM_PROMPT;
    if (workflowContext) {
      systemPrompt += buildWorkflowContextPrompt(workflowContext);
    }

    // Prepare messages for the AI
    const aiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: CopilotMessage) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Call z-ai-web-dev-sdk with timeout
    const zai = await ZAI.create();
    const timeoutMs = 25000;
    const aiPromise = zai.chat.completions.create({
      messages: aiMessages,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI request timed out')), timeoutMs);
    });

    const response = await Promise.race([aiPromise, timeoutPromise]);

    // Extract the response content
    const rawContent = response.choices?.[0]?.message?.content || '';

    if (!rawContent.trim()) {
      return NextResponse.json({
        ok: true,
        data: {
          content: "I'm here to help! Could you tell me more about what you'd like to build or learn about?",
          suggestions: [
            'Help me build a support workflow',
            'Explain confidence routing',
            'What AI Employee types are available?',
          ],
        },
      });
    }

    // Try to parse the AI response as JSON
    try {
      // Strip markdown code fences if present
      let cleanedContent = rawContent.trim();
      const jsonFenceMatch = cleanedContent.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
      if (jsonFenceMatch) {
        cleanedContent = jsonFenceMatch[1].trim();
      }

      const parsed = JSON.parse(cleanedContent);

      // Validate required fields
      const content = typeof parsed.content === 'string' ? parsed.content : rawContent;
      const suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((s: any) => typeof s === 'string').slice(0, 4)
        : [];
      const workflowAction = parsed.workflowAction &&
        typeof parsed.workflowAction === 'object' &&
        ['generate', 'template', 'navigate', 'add_node', 'edit_node', 'delete_node', 'analyze', 'run'].includes(parsed.workflowAction.type)
        ? {
            type: parsed.workflowAction.type,
            label: typeof parsed.workflowAction.label === 'string' ? parsed.workflowAction.label : '',
            ...(parsed.workflowAction.data !== undefined ? { data: parsed.workflowAction.data } : {}),
          }
        : undefined;

      return NextResponse.json({
        ok: true,
        data: {
          content,
          suggestions,
          ...(workflowAction ? { workflowAction } : {}),
        },
      });
    } catch {
      // JSON parsing failed — return raw content with empty suggestions
      return NextResponse.json({
        ok: true,
        data: {
          content: rawContent,
          suggestions: [],
        },
      });
    }
  } catch (error: any) {
    console.error('[Copilot API] Error:', error);

    if (error?.message?.includes('timed out')) {
      return NextResponse.json(
        { ok: false, error: 'Request timed out. Please try again.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { ok: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(RATE_LIMITS.copilot, handlePost)

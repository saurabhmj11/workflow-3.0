import type { NodeType, NodeCategory, SourceHandle, TargetHandle } from '@/lib/types'

// ─── Template Types ───────────────────────────────

export interface TemplateEdge {
  sourceIndex: number
  targetIndex: number
  sourceHandle: SourceHandle
  targetHandle: TargetHandle
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  icon: string // lucide icon name
  category: 'support' | 'sales' | 'devops' | 'general'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  nodes: {
    type: NodeType
    label: string
    category: NodeCategory
    config: Record<string, unknown>
    position: { x: number; y: number }
  }[]
  edges: TemplateEdge[]
}

// ─── 1. Customer Support Triage ───────────────────
// API Trigger → Classifier → Condition
//   true (urgent)  → Approval → Slack
//   false (normal) → LLM → Email

const customerSupportTriage: WorkflowTemplate = {
  id: 'customer-support-triage',
  name: 'Customer Support Triage',
  description:
    'Automatically classify incoming support requests by urgency. Urgent tickets get human review and Slack alerts; normal tickets get AI-generated responses via email.',
  icon: 'Headset',
  category: 'support',
  difficulty: 'beginner',
  nodes: [
    {
      type: 'api',
      label: 'API Trigger',
      category: 'trigger',
      config: { method: 'POST', path: '/support/incoming' },
      position: { x: 0, y: 200 },
    },
    {
      type: 'classifier',
      label: 'Classify Urgency',
      category: 'ai',
      config: {
        categories: ['urgent', 'normal', 'faq'],
        model: 'gpt-4o-mini',
        prompt: 'Classify the support ticket into urgent, normal, or faq based on the content.',
      },
      position: { x: 300, y: 200 },
    },
    {
      type: 'condition',
      label: 'Is Urgent?',
      category: 'logic',
      config: { expression: '{{classification}} === "urgent"' },
      position: { x: 600, y: 200 },
    },
    {
      type: 'approval',
      label: 'Human Review',
      category: 'human',
      config: { assignee: 'support-lead', slaMinutes: 30 },
      position: { x: 900, y: 50 },
    },
    {
      type: 'slack',
      label: 'Notify Channel',
      category: 'action',
      config: { channel: '#urgent-support', message: '🚨 Urgent ticket requires review: {{ticket_id}}' },
      position: { x: 1200, y: 50 },
    },
    {
      type: 'llm',
      label: 'Auto-Respond',
      category: 'ai',
      config: {
        model: 'gpt-4o-mini',
        prompt: 'Generate a helpful and empathetic response to this support ticket. Be concise and professional.',
      },
      position: { x: 900, y: 350 },
    },
    {
      type: 'email',
      label: 'Send Response',
      category: 'action',
      config: { to: '{{sender_email}}', subject: 'Re: Your support request', body: '{{llm_response}}' },
      position: { x: 1200, y: 350 },
    },
  ],
  edges: [
    { sourceIndex: 0, targetIndex: 1, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 1, targetIndex: 2, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 2, targetIndex: 3, sourceHandle: 'true', targetHandle: 'input' },
    { sourceIndex: 2, targetIndex: 5, sourceHandle: 'false', targetHandle: 'input' },
    { sourceIndex: 3, targetIndex: 4, sourceHandle: 'approved', targetHandle: 'input' },
    { sourceIndex: 5, targetIndex: 6, sourceHandle: 'default', targetHandle: 'input' },
  ],
}

// ─── 2. Lead Qualification Pipeline ───────────────
// Webhook → LLM → Condition
//   true  → CRM → Email (welcome)
//   false → LLM (re-engage) → Email (nurture)

const leadQualificationPipeline: WorkflowTemplate = {
  id: 'lead-qualification-pipeline',
  name: 'Lead Qualification Pipeline',
  description:
    'Analyze incoming leads with AI to determine if they qualify. Qualified leads get a CRM deal and welcome email; unqualified leads receive a nurture sequence.',
  icon: 'UserSearch',
  category: 'sales',
  difficulty: 'intermediate',
  nodes: [
    {
      type: 'webhook',
      label: 'Form Submission',
      category: 'trigger',
      config: { path: '/leads/incoming', method: 'POST' },
      position: { x: 0, y: 200 },
    },
    {
      type: 'llm',
      label: 'Analyze Lead',
      category: 'ai',
      config: {
        model: 'gpt-4o',
        prompt:
          'Analyze this lead data. Score from 1-10 based on: company size, budget indicated, timeline, and decision-maker status. Return JSON: { score, qualified: boolean, reasoning }',
      },
      position: { x: 300, y: 200 },
    },
    {
      type: 'condition',
      label: 'Qualified?',
      category: 'logic',
      config: { expression: '{{analysis.qualified}} === true' },
      position: { x: 600, y: 200 },
    },
    {
      type: 'crm',
      label: 'Create Deal',
      category: 'action',
      config: { action: 'create_deal', pipeline: 'sales', stage: 'qualified' },
      position: { x: 900, y: 50 },
    },
    {
      type: 'email',
      label: 'Welcome Email',
      category: 'action',
      config: {
        to: '{{lead.email}}',
        subject: 'Welcome! Let\'s get started',
        body: 'Thanks for your interest! A sales representative will be in touch shortly.',
      },
      position: { x: 1200, y: 50 },
    },
    {
      type: 'llm',
      label: 'Re-Engage Copy',
      category: 'ai',
      config: {
        model: 'gpt-4o-mini',
        prompt:
          'Write a personalized nurture email for this lead. Be warm but not pushy. Highlight value propositions relevant to their industry.',
      },
      position: { x: 900, y: 350 },
    },
    {
      type: 'email',
      label: 'Nurture Email',
      category: 'action',
      config: {
        to: '{{lead.email}}',
        subject: 'Thought you might find this useful',
        body: '{{nurture_copy}}',
      },
      position: { x: 1200, y: 350 },
    },
  ],
  edges: [
    { sourceIndex: 0, targetIndex: 1, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 1, targetIndex: 2, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 2, targetIndex: 3, sourceHandle: 'true', targetHandle: 'input' },
    { sourceIndex: 2, targetIndex: 5, sourceHandle: 'false', targetHandle: 'input' },
    { sourceIndex: 3, targetIndex: 4, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 5, targetIndex: 6, sourceHandle: 'default', targetHandle: 'input' },
  ],
}

// ─── 3. Incident Response Workflow ────────────────
// Schedule → Agent → Condition
//   true  → Escalation → Slack → Delay → Condition (resolved?)
//     true  → Email (report)
//     false → Approval (escalate)
//   false → (end)

const incidentResponseWorkflow: WorkflowTemplate = {
  id: 'incident-response-workflow',
  name: 'Incident Response Workflow',
  description:
    'Monitor systems on a schedule, detect incidents, and escalate. If not resolved after notification, automatically escalate to management for intervention.',
  icon: 'ShieldAlert',
  category: 'devops',
  difficulty: 'intermediate',
  nodes: [
    {
      type: 'schedule',
      label: 'Every 5 min',
      category: 'trigger',
      config: { cron: '*/5 * * * *', timezone: 'UTC' },
      position: { x: 0, y: 200 },
    },
    {
      type: 'agent',
      label: 'Monitor Systems',
      category: 'ai',
      config: {
        model: 'gpt-4o',
        instructions:
          'Check system health endpoints and logs. Look for error rate spikes, latency increases, or service degradation. Report any anomalies.',
        tools: ['health_check', 'log_search', 'metrics_query'],
      },
      position: { x: 300, y: 200 },
    },
    {
      type: 'condition',
      label: 'Incident Detected?',
      category: 'logic',
      config: { expression: '{{monitor_result.incident}} === true' },
      position: { x: 600, y: 200 },
    },
    {
      type: 'escalation',
      label: 'Notify On-Call',
      category: 'human',
      config: { team: 'on-call-engineers', priority: 'high', channel: 'pagerduty' },
      position: { x: 900, y: 100 },
    },
    {
      type: 'slack',
      label: 'Post to #incidents',
      category: 'action',
      config: {
        channel: '#incidents',
        message: '⚠️ Incident detected: {{monitor_result.summary}}\nSeverity: {{monitor_result.severity}}',
      },
      position: { x: 1200, y: 100 },
    },
    {
      type: 'delay',
      label: 'Wait 15 min',
      category: 'logic',
      config: { duration: 900, unit: 'seconds' },
      position: { x: 1500, y: 100 },
    },
    {
      type: 'condition',
      label: 'Resolved?',
      category: 'logic',
      config: { expression: '{{incident_status}} === "resolved"' },
      position: { x: 1800, y: 100 },
    },
    {
      type: 'email',
      label: 'Resolution Report',
      category: 'action',
      config: {
        to: 'engineering-team@company.com',
        subject: 'Incident Resolved: {{monitor_result.summary}}',
        body: 'The incident has been resolved. Details: {{resolution_details}}',
      },
      position: { x: 2100, y: 0 },
    },
    {
      type: 'approval',
      label: 'Manager Escalation',
      category: 'human',
      config: { assignee: 'engineering-manager', slaMinutes: 15, message: 'Incident not resolved after 15 min. Requires management attention.' },
      position: { x: 2100, y: 250 },
    },
  ],
  edges: [
    { sourceIndex: 0, targetIndex: 1, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 1, targetIndex: 2, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 2, targetIndex: 3, sourceHandle: 'true', targetHandle: 'input' },
    { sourceIndex: 3, targetIndex: 4, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 4, targetIndex: 5, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 5, targetIndex: 6, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 6, targetIndex: 7, sourceHandle: 'true', targetHandle: 'input' },
    { sourceIndex: 6, targetIndex: 8, sourceHandle: 'false', targetHandle: 'input' },
  ],
}

// ─── 4. Content Review Pipeline ───────────────────
// Webhook → RAG → Classifier → Condition
//   true  → Review → Email (published)
//   false → Email (auto-approved)

const contentReviewPipeline: WorkflowTemplate = {
  id: 'content-review-pipeline',
  name: 'Content Review Pipeline',
  description:
    'Automatically check submitted content against policy documents. Unsafe content is flagged for human review; safe content is auto-approved and published.',
  icon: 'FileCheck',
  category: 'general',
  difficulty: 'beginner',
  nodes: [
    {
      type: 'webhook',
      label: 'Content Submitted',
      category: 'trigger',
      config: { path: '/content/submit', method: 'POST' },
      position: { x: 0, y: 200 },
    },
    {
      type: 'rag',
      label: 'Check Policies',
      category: 'ai',
      config: {
        datasource: 'company-policies',
        query: 'Find policy violations in: {{content}}',
        topK: 5,
      },
      position: { x: 300, y: 200 },
    },
    {
      type: 'classifier',
      label: 'Safety Classifier',
      category: 'ai',
      config: {
        categories: ['safe', 'unsafe', 'needs-review'],
        model: 'gpt-4o-mini',
        prompt: 'Classify the content based on policy check results. Consider: offensive language, misinformation, brand safety, legal compliance.',
      },
      position: { x: 600, y: 200 },
    },
    {
      type: 'condition',
      label: 'Needs Review?',
      category: 'logic',
      config: { expression: '{{classification}} === "needs-review" || {{classification}} === "unsafe"' },
      position: { x: 900, y: 200 },
    },
    {
      type: 'review',
      label: 'Human Review',
      category: 'human',
      config: { assignee: 'content-moderator', slaHours: 4 },
      position: { x: 1200, y: 50 },
    },
    {
      type: 'email',
      label: 'Published Notification',
      category: 'action',
      config: {
        to: '{{submitter_email}}',
        subject: 'Your content has been published',
        body: 'Your content has been reviewed and published successfully.',
      },
      position: { x: 1500, y: 50 },
    },
    {
      type: 'email',
      label: 'Auto-Approved',
      category: 'action',
      config: {
        to: '{{submitter_email}}',
        subject: 'Content auto-approved',
        body: 'Your submission passed automated checks and has been published.',
      },
      position: { x: 1200, y: 350 },
    },
  ],
  edges: [
    { sourceIndex: 0, targetIndex: 1, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 1, targetIndex: 2, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 2, targetIndex: 3, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 3, targetIndex: 4, sourceHandle: 'true', targetHandle: 'input' },
    { sourceIndex: 3, targetIndex: 6, sourceHandle: 'false', targetHandle: 'input' },
    { sourceIndex: 4, targetIndex: 5, sourceHandle: 'approved', targetHandle: 'input' },
  ],
}

// ─── 5. AI Support Employee (Wedge Product) ────────
// The production-ready support workflow that solves a real business problem.
// Email Trigger → Classifier → RAG → LLM → Approval → Email
// With escalation path for low-confidence cases.

const aiSupportEmployee: WorkflowTemplate = {
  id: 'ai-support-employee',
  name: 'AI Support Employee',
  description:
    'Your AI support agent that classifies tickets, searches your knowledge base, drafts responses, and routes difficult cases to humans. Start here — this is the workflow that replaces your first-line support.',
  icon: 'Headset',
  category: 'support',
  difficulty: 'beginner',
  nodes: [
    {
      type: 'email',
      label: 'Customer Email',
      category: 'trigger',
      config: {
        imapServer: 'imap.gmail.com',
        folder: 'INBOX',
      },
      position: { x: 250, y: 0 },
    },
    {
      type: 'classifier',
      label: 'Classify Issue',
      category: 'ai',
      config: {
        categories: 'billing,technical,account,general,urgent',
        model: 'gpt-4o',
      },
      position: { x: 250, y: 150 },
    },
    {
      type: 'condition',
      label: 'Confidence > 80%?',
      category: 'logic',
      config: {
        expression: 'confidence >= 80',
      },
      position: { x: 250, y: 300 },
    },
    {
      type: 'rag',
      label: 'Search Knowledge Base',
      category: 'ai',
      config: {
        vectorStore: 'pinecone',
        topK: 5,
        similarityThreshold: 0.7,
      },
      position: { x: 50, y: 450 },
    },
    {
      type: 'llm',
      label: 'Draft Response',
      category: 'ai',
      config: {
        model: 'gpt-4o',
        systemPrompt: 'You are a helpful support agent. Draft a professional, empathetic response to the customer based on the knowledge base articles found. Be specific and actionable. If the knowledge base doesn\'t have enough information, say so honestly.',
        temperature: 0.5,
        maxTokens: 1024,
      },
      position: { x: 50, y: 600 },
    },
    {
      type: 'approval',
      label: 'Human Review',
      category: 'human',
      config: {
        assignee: 'support-lead@company.com',
        slaMinutes: 30,
        message: 'AI has drafted a response. Please review and approve or edit before sending.',
      },
      position: { x: 50, y: 750 },
    },
    {
      type: 'email',
      label: 'Send Response',
      category: 'action',
      config: {
        to: '{{input.sender}}',
        subject: 'Re: {{input.subject}}',
        body: '{{nodes.node-5.output.response}}',
      },
      position: { x: 50, y: 900 },
    },
    {
      type: 'escalation',
      label: 'Escalate to Human',
      category: 'human',
      config: {
        escalationPath: ['senior-support@company.com', 'support-manager@company.com'],
        priority: 'high',
      },
      position: { x: 450, y: 450 },
    },
    {
      type: 'slack',
      label: 'Notify Team',
      category: 'action',
      config: {
        channel: '#support-escalations',
        message: '🔄 Low-confidence ticket escalated. Classification: {{classification}}. Confidence: {{confidence}}%. Needs human attention.',
      },
      position: { x: 450, y: 600 },
    },
  ],
  edges: [
    { sourceIndex: 0, targetIndex: 1, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 1, targetIndex: 2, sourceHandle: 'default', targetHandle: 'input' },
    // High confidence path: RAG → LLM → Approval → Email
    { sourceIndex: 2, targetIndex: 3, sourceHandle: 'true', targetHandle: 'input' },
    { sourceIndex: 3, targetIndex: 4, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 4, targetIndex: 5, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 5, targetIndex: 6, sourceHandle: 'approved', targetHandle: 'input' },
    // Low confidence path: Escalation → Slack
    { sourceIndex: 2, targetIndex: 7, sourceHandle: 'false', targetHandle: 'input' },
    { sourceIndex: 7, targetIndex: 8, sourceHandle: 'default', targetHandle: 'input' },
  ],
}

// ─── 6. SDR Employee ────────────────────────────────
// Webhook → Classifier → Condition → (qualified) CRM + Email | (unqualified) Nurture

const sdrEmployee: WorkflowTemplate = {
  id: 'sdr-employee',
  name: 'SDR Employee',
  description:
    'AI sales development rep that qualifies inbound leads, enriches them in your CRM, and routes hot leads to your sales team. nurture the rest.',
  icon: 'UserSearch',
  category: 'sales',
  difficulty: 'beginner',
  nodes: [
    {
      type: 'webhook',
      label: 'Lead Form Submit',
      category: 'trigger',
      config: { url: 'https://hooks.company.com/leads', secret: '' },
      position: { x: 250, y: 0 },
    },
    {
      type: 'classifier',
      label: 'Score Lead',
      category: 'ai',
      config: {
        categories: 'hot,warm,cold',
        model: 'gpt-4o',
      },
      position: { x: 250, y: 150 },
    },
    {
      type: 'condition',
      label: 'Hot Lead?',
      category: 'logic',
      config: {
        expression: 'classification === "hot"',
      },
      position: { x: 250, y: 300 },
    },
    {
      type: 'crm',
      label: 'Create Deal',
      category: 'action',
      config: {
        action: 'create',
        objectType: 'deal',
        fields: '{"stage": "qualified", "source": "inbound"}',
      },
      position: { x: 50, y: 450 },
    },
    {
      type: 'email',
      label: 'Welcome Email',
      category: 'action',
      config: {
        to: '{{input.email}}',
        subject: 'Thanks for reaching out!',
        body: 'Hi {{input.name}}, thanks for your interest! A member of our team will be in touch within the hour.',
      },
      position: { x: 50, y: 600 },
    },
    {
      type: 'slack',
      label: 'Alert Sales Team',
      category: 'action',
      config: {
        channel: '#hot-leads',
        message: '🔥 Hot lead just came in! {{input.name}} from {{input.company}}. Check CRM for details.',
      },
      position: { x: 50, y: 750 },
    },
    {
      type: 'llm',
      label: 'Write Nurture Email',
      category: 'ai',
      config: {
        model: 'gpt-4o-mini',
        systemPrompt: 'Write a warm, personalized nurture email for this lead. Be helpful, not salesy. Share a relevant resource.',
        temperature: 0.7,
      },
      position: { x: 450, y: 450 },
    },
    {
      type: 'email',
      label: 'Send Nurture',
      category: 'action',
      config: {
        to: '{{input.email}}',
        subject: 'Thought you might find this useful',
        body: '{{nodes.node-7.output.response}}',
      },
      position: { x: 450, y: 600 },
    },
  ],
  edges: [
    { sourceIndex: 0, targetIndex: 1, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 1, targetIndex: 2, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 2, targetIndex: 3, sourceHandle: 'true', targetHandle: 'input' },
    { sourceIndex: 3, targetIndex: 4, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 4, targetIndex: 5, sourceHandle: 'default', targetHandle: 'input' },
    { sourceIndex: 2, targetIndex: 6, sourceHandle: 'false', targetHandle: 'input' },
    { sourceIndex: 6, targetIndex: 7, sourceHandle: 'default', targetHandle: 'input' },
  ],
}

// ─── Export all templates ─────────────────────────

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  aiSupportEmployee,
  sdrEmployee,
  customerSupportTriage,
  leadQualificationPipeline,
  incidentResponseWorkflow,
  contentReviewPipeline,
]

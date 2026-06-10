// ─── Notification Templates ────────────────────────
// Pre-built notification templates for common workflow events.
// Supports {{variable}} interpolation for dynamic content.

import type { NotificationChannel } from './delivery'

// ─── Types ────────────────────────────────────────

export interface NotificationTemplate {
  id: string
  name: string
  category: string
  titleTemplate: string // Supports {{variable}} interpolation
  messageTemplate: string
  defaultPriority: 'low' | 'normal' | 'high' | 'critical'
  channels: NotificationChannel[]
}

// ─── Built-in Templates ───────────────────────────

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  'workflow.completed': {
    id: 'workflow.completed',
    name: 'Workflow Completed',
    category: 'execution',
    titleTemplate: 'Workflow "{{workflowName}}" completed successfully',
    messageTemplate: 'Your workflow "{{workflowName}}" finished in {{duration}}. Run ID: {{runId}}.',
    defaultPriority: 'normal',
    channels: ['in_app', 'email'],
  },
  'workflow.failed': {
    id: 'workflow.failed',
    name: 'Workflow Failed',
    category: 'execution',
    titleTemplate: 'Workflow "{{workflowName}}" failed',
    messageTemplate: 'Your workflow "{{workflowName}}" encountered an error during execution. Error: {{errorMessage}}. Run ID: {{runId}}.',
    defaultPriority: 'high',
    channels: ['in_app', 'email', 'webhook'],
  },
  'approval.needed': {
    id: 'approval.needed',
    name: 'Approval Needed',
    category: 'approval',
    titleTemplate: 'Approval needed: {{nodeLabel}}',
    messageTemplate: 'The node "{{nodeLabel}}" in workflow "{{workflowName}}" requires your approval before proceeding.',
    defaultPriority: 'high',
    channels: ['in_app', 'email', 'push'],
  },
  'approval.approved': {
    id: 'approval.approved',
    name: 'Approval Approved',
    category: 'approval',
    titleTemplate: 'Approved: {{nodeLabel}}',
    messageTemplate: 'The approval request for "{{nodeLabel}}" in workflow "{{workflowName}}" has been approved by {{approver}}.',
    defaultPriority: 'normal',
    channels: ['in_app'],
  },
  'approval.rejected': {
    id: 'approval.rejected',
    name: 'Approval Rejected',
    category: 'approval',
    titleTemplate: 'Rejected: {{nodeLabel}}',
    messageTemplate: 'The approval request for "{{nodeLabel}}" in workflow "{{workflowName}}" has been rejected by {{approver}}. Reason: {{reason}}.',
    defaultPriority: 'high',
    channels: ['in_app', 'email'],
  },
  'integration.connected': {
    id: 'integration.connected',
    name: 'Integration Connected',
    category: 'integration',
    titleTemplate: '{{integrationName}} connected successfully',
    messageTemplate: 'Your {{integrationName}} integration has been connected and is ready to use in workflows.',
    defaultPriority: 'low',
    channels: ['in_app'],
  },
  'integration.error': {
    id: 'integration.error',
    name: 'Integration Error',
    category: 'integration',
    titleTemplate: '{{integrationName}} integration error',
    messageTemplate: 'The {{integrationName}} integration encountered an error: {{errorMessage}}. Please check your configuration.',
    defaultPriority: 'high',
    channels: ['in_app', 'email'],
  },
  'trigger.fired': {
    id: 'trigger.fired',
    name: 'Trigger Fired',
    category: 'trigger',
    titleTemplate: 'Trigger fired: {{triggerName}}',
    messageTemplate: 'Your {{triggerType}} trigger "{{triggerName}}" was just activated for workflow "{{workflowName}}".',
    defaultPriority: 'low',
    channels: ['in_app'],
  },
  'execution.error': {
    id: 'execution.error',
    name: 'Execution Error',
    category: 'execution',
    titleTemplate: 'Execution error in {{workflowName}}',
    messageTemplate: 'An error occurred while executing workflow "{{workflowName}}" at node "{{nodeName}}". Error: {{errorMessage}}.',
    defaultPriority: 'high',
    channels: ['in_app', 'email', 'webhook'],
  },
  'rate_limit.warning': {
    id: 'rate_limit.warning',
    name: 'Rate Limit Warning',
    category: 'system',
    titleTemplate: 'Rate limit warning: {{resource}}',
    messageTemplate: 'You are approaching the rate limit for {{resource}}. Current usage: {{currentUsage}}/{{limit}}. Consider upgrading your plan or optimizing your usage.',
    defaultPriority: 'normal',
    channels: ['in_app', 'email'],
  },
}

// ─── Template Rendering ───────────────────────────

/**
 * Interpolate {{variable}} placeholders in a template string.
 * Supports nested paths like {{user.name}}.
 */
function interpolate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key: string) => {
    const parts = key.split('.')
    let value: unknown = variables

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part]
      } else {
        value = undefined
        break
      }
    }

    if (value === undefined || value === null) {
      return match // Keep the placeholder if variable is missing
    }

    return String(value)
  })
}

/**
 * Render a notification template by ID with the given variables.
 * Returns the interpolated title and message, or null if the template doesn't exist.
 */
export function renderTemplate(
  templateId: string,
  variables: Record<string, unknown>
): { title: string; message: string } | null {
  const template = NOTIFICATION_TEMPLATES[templateId]

  if (!template) {
    return null
  }

  return {
    title: interpolate(template.titleTemplate, variables),
    message: interpolate(template.messageTemplate, variables),
  }
}

/**
 * Get a template by ID.
 */
export function getTemplate(templateId: string): NotificationTemplate | undefined {
  return NOTIFICATION_TEMPLATES[templateId]
}

/**
 * Get all template IDs grouped by category.
 */
export function getTemplatesByCategory(): Record<string, NotificationTemplate[]> {
  const grouped: Record<string, NotificationTemplate[]> = {}

  for (const template of Object.values(NOTIFICATION_TEMPLATES)) {
    if (!grouped[template.category]) {
      grouped[template.category] = []
    }
    grouped[template.category].push(template)
  }

  return grouped
}

/**
 * Get all available template IDs.
 */
export function getTemplateIds(): string[] {
  return Object.keys(NOTIFICATION_TEMPLATES)
}

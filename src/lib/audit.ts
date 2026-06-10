// ─── Audit Trail Utility ──────────────────────────
// Non-blocking audit logging for all significant actions
// Never fails the main operation — errors are silently caught

import { db } from '@/lib/db'

export interface AuditLogInput {
  userId?: string
  userEmail?: string
  action: string
  resource: string
  resourceId?: string
  resourceName?: string
  status?: 'success' | 'failure'
  ipAddress?: string
  userAgent?: string
  details?: Record<string, unknown>
}

export async function auditLog(input: AuditLogInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: input.userId,
        userEmail: input.userEmail,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        resourceName: input.resourceName,
        status: input.status || 'success',
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        details: input.details ? JSON.stringify(input.details) : null,
      },
    })
  } catch (err) {
    // Audit logging should never fail the main operation
    console.error('[AuditLog] Failed to write audit log:', err)
  }
}

// Helper to extract request info
export function getRequestMeta(request: Request) {
  return {
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  }
}

// Pre-defined audit actions
export const AUDIT_ACTIONS = {
  WORKFLOW_CREATED: 'workflow.created',
  WORKFLOW_UPDATED: 'workflow.updated',
  WORKFLOW_DELETED: 'workflow.deleted',
  WORKFLOW_EXECUTED: 'workflow.executed',
  APPROVAL_APPROVED: 'approval.approved',
  APPROVAL_REJECTED: 'approval.rejected',
  INTEGRATION_CONNECTED: 'integration.connected',
  INTEGRATION_DISCONNECTED: 'integration.disconnected',
  TRIGGER_CREATED: 'trigger.created',
  TRIGGER_DELETED: 'trigger.deleted',
  USER_LOGIN: 'user.login',
  USER_REGISTERED: 'user.registered',
  API_KEY_CREATED: 'api_key.created',
  API_KEY_REVOKED: 'api_key.revoked',
} as const

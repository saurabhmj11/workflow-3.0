// ─── Notification Delivery Utility ───────────────
// Handles creating, storing, and delivering notifications.
// Supports:
//   1. In-app notifications (stored in the Notification DB model)
//   2. Email notifications via SMTP (when configured)
//   3. Different notification types and priorities

import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'

const log = createLogger('NotificationDelivery')

// ─── Types ────────────────────────────────────────

export type NotificationType =
  | 'execution_complete'
  | 'execution_failed'
  | 'approval_needed'
  | 'approval_resolved'
  | 'trigger_fired'
  | 'integration_connected'
  | 'integration_disconnected'
  | 'error_alert'
  | 'info'
  | 'warning'

export type NotificationCategory = 'execution' | 'approval' | 'trigger' | 'integration' | 'system'
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical'

export interface SendNotificationParams {
  userId?: string
  type: NotificationType
  title: string
  message: string
  category?: NotificationCategory
  priority?: NotificationPriority
  actionUrl?: string
  metadata?: Record<string, unknown>
  /** If true, skip email delivery even if user has email notifications enabled */
  skipEmail?: boolean
}

export interface DeliveryResult {
  notificationId: string
  delivered: ('in_app' | 'email')[]
  emailSent: boolean
  emailError?: string
}

// ─── Notification Type → Category Mapping ──────

const TYPE_CATEGORY_MAP: Record<NotificationType, NotificationCategory> = {
  execution_complete: 'execution',
  execution_failed: 'execution',
  approval_needed: 'approval',
  approval_resolved: 'approval',
  trigger_fired: 'trigger',
  integration_connected: 'integration',
  integration_disconnected: 'integration',
  error_alert: 'system',
  info: 'system',
  warning: 'system',
}

// ─── Notification Type → Priority Defaults ──────

const TYPE_PRIORITY_MAP: Record<NotificationType, NotificationPriority> = {
  execution_complete: 'normal',
  execution_failed: 'high',
  approval_needed: 'high',
  approval_resolved: 'normal',
  trigger_fired: 'low',
  integration_connected: 'normal',
  integration_disconnected: 'normal',
  error_alert: 'critical',
  info: 'low',
  warning: 'normal',
}

// ─── SMTP Configuration ─────────────────────────

interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  fromEmail: string
  fromName: string
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) return null

  return {
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user,
    pass,
    fromEmail: process.env.SMTP_FROM_EMAIL || 'notifications@openworkflow.ai',
    fromName: process.env.SMTP_FROM_NAME || 'OpenWorkflow',
  }
}

// ─── User Notification Preferences ──────────────

interface NotificationPreferences {
  emailNotifications: boolean
  inAppNotifications: boolean
  executionAlerts: boolean
  approvalAlerts: boolean
  triggerFailureAlerts: boolean
  weeklyDigest: boolean
}

async function getUserNotificationPrefs(userId: string): Promise<NotificationPreferences> {
  const defaults: NotificationPreferences = {
    emailNotifications: true,
    inAppNotifications: true,
    executionAlerts: true,
    approvalAlerts: true,
    triggerFailureAlerts: true,
    weeklyDigest: false,
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    })

    if (!user?.metadata) return defaults

    const metadata = JSON.parse(user.metadata)
    return { ...defaults, ...(metadata.notifications as Partial<NotificationPreferences> | undefined) }
  } catch {
    return defaults
  }
}

// ─── Email Delivery ─────────────────────────────

async function sendEmailNotification(
  toEmail: string,
  toName: string | null,
  title: string,
  message: string,
  actionUrl?: string,
  priority?: NotificationPriority
): Promise<{ sent: boolean; error?: string }> {
  const smtpConfig = getSmtpConfig()

  if (!smtpConfig) {
    log.info({ toEmail }, 'SMTP not configured, skipping email delivery')
    return { sent: false, error: 'SMTP not configured' }
  }

  try {
    // Dynamic import of nodemailer to avoid bundling for client
    const nodemailer = await import('nodemailer')

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
    })

    const priorityLabel = priority === 'critical' ? '🔴 CRITICAL' :
                          priority === 'high' ? '🟡 HIGH' :
                          priority === 'low' ? '⚪ LOW' : ''

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="background:#1e293b;border-radius:12px;border:1px solid #334155;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:20px 24px;">
        <h1 style="margin:0;font-size:18px;color:#fff;font-weight:600;">${title}</h1>
        ${priorityLabel ? `<span style="display:inline-block;margin-top:8px;padding:2px 8px;border-radius:4px;background:rgba(255,255,255,0.2);color:#fff;font-size:11px;">${priorityLabel}</span>` : ''}
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;color:#e2e8f0;font-size:14px;line-height:1.6;">${message}</p>
        ${actionUrl ? `<a href="${actionUrl}" style="display:inline-block;padding:10px 20px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">View Details</a>` : ''}
      </div>
      <div style="padding:12px 24px;border-top:1px solid #334155;text-align:center;">
        <p style="margin:0;color:#475569;font-size:11px;">Powered by <span style="color:#7c3aed;">Open</span><span style="color:#06b6d4;">Workflow</span></p>
      </div>
    </div>
  </div>
</body>
</html>`

    const textBody = `${priorityLabel ? `[${priorityLabel}] ` : ''}${title}\n\n${message}${actionUrl ? `\n\nView: ${actionUrl}` : ''}`

    await transporter.sendMail({
      from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
      to: toName ? `"${toName}" <${toEmail}>` : toEmail,
      subject: `${priorityLabel ? `[${priorityLabel}] ` : ''}${title}`,
      text: textBody,
      html: htmlBody,
    })

    log.info({ toEmail, title }, 'Email notification sent')
    return { sent: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Email send failed'
    log.error({ err, toEmail, title }, 'Failed to send email notification')
    return { sent: false, error }
  }
}

// ─── Main Delivery Function ─────────────────────

export async function deliverNotification(params: SendNotificationParams): Promise<DeliveryResult> {
  const {
    userId,
    type,
    title,
    message,
    category: explicitCategory,
    priority: explicitPriority,
    actionUrl,
    metadata,
    skipEmail = false,
  } = params

  const category = explicitCategory || TYPE_CATEGORY_MAP[type] || 'system'
  const priority = explicitPriority || TYPE_PRIORITY_MAP[type] || 'normal'

  const delivered: ('in_app' | 'email')[] = []
  let emailSent = false
  let emailError: string | undefined

  // 1. Create in-app notification in DB
  try {
    await db.notification.create({
      data: {
        userId: userId ?? null,
        type,
        title,
        message,
        category,
        priority,
        isRead: false,
        actionUrl: actionUrl ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })
    delivered.push('in_app')
    log.info({ type, category, priority, userId }, 'In-app notification created')
  } catch (err) {
    log.error({ err, type, title }, 'Failed to create in-app notification')
    // Don't fail the whole delivery if DB write fails
  }

  // 2. Email delivery
  if (userId && !skipEmail) {
    try {
      // Check user's notification preferences
      const prefs = await getUserNotificationPrefs(userId)

      if (!prefs.emailNotifications) {
        log.info({ userId }, 'User has email notifications disabled')
      } else {
        // Check category-specific preferences
        const shouldSendEmail =
          (category === 'execution' && prefs.executionAlerts) ||
          (category === 'approval' && prefs.approvalAlerts) ||
          (category === 'trigger' && prefs.triggerFailureAlerts) ||
          (category === 'system') ||
          (category === 'integration')

        if (shouldSendEmail) {
          // Get user's email
          const user = await db.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
          })

          if (user) {
            const result = await sendEmailNotification(
              user.email,
              user.name,
              title,
              message,
              actionUrl,
              priority
            )
            emailSent = result.sent
            emailError = result.error
            if (result.sent) delivered.push('email')
          }
        }
      }
    } catch (err) {
      log.error({ err, userId }, 'Error during email delivery check')
    }
  }

  return {
    notificationId: '',  // We'd need to capture this from the create above
    delivered,
    emailSent,
    emailError,
  }
}

// ─── Convenience Functions ──────────────────────

export async function notifyExecutionComplete(
  userId: string,
  workflowId: string,
  workflowName: string,
  runId: string,
  status: 'success' | 'error',
  durationMs?: number
): Promise<DeliveryResult> {
  return deliverNotification({
    userId,
    type: status === 'success' ? 'execution_complete' : 'execution_failed',
    title: status === 'success'
      ? `Workflow "${workflowName}" completed successfully`
      : `Workflow "${workflowName}" failed`,
    message: status === 'success'
      ? `Your workflow "${workflowName}" finished in ${durationMs ? `${(durationMs / 1000).toFixed(1)}s` : 'unknown time'}.`
      : `Your workflow "${workflowName}" encountered an error during execution. Please check the execution log for details.`,
    category: 'execution',
    priority: status === 'error' ? 'high' : 'normal',
    actionUrl: `/executions/${runId}`,
    metadata: { workflowId, runId, status, durationMs },
  })
}

export async function notifyApprovalNeeded(
  userId: string,
  approvalId: string,
  nodeLabel: string,
  workflowName: string,
  runId: string
): Promise<DeliveryResult> {
  return deliverNotification({
    userId,
    type: 'approval_needed',
    title: `Approval needed: ${nodeLabel}`,
    message: `The node "${nodeLabel}" in workflow "${workflowName}" requires your approval before proceeding.`,
    category: 'approval',
    priority: 'high',
    actionUrl: `/approvals/${approvalId}`,
    metadata: { approvalId, nodeLabel, workflowName, runId },
  })
}

export async function notifyTriggerFired(
  userId: string,
  triggerType: string,
  triggerName: string,
  workflowId: string
): Promise<DeliveryResult> {
  return deliverNotification({
    userId,
    type: 'trigger_fired',
    title: `Trigger fired: ${triggerName}`,
    message: `Your ${triggerType} trigger "${triggerName}" was just activated.`,
    category: 'trigger',
    priority: 'low',
    metadata: { triggerType, triggerName, workflowId },
    skipEmail: true, // Don't email for every trigger fire
  })
}

export async function notifyError(
  userId: string | undefined,
  errorTitle: string,
  errorMessage: string,
  metadata?: Record<string, unknown>
): Promise<DeliveryResult> {
  return deliverNotification({
    userId,
    type: 'error_alert',
    title: errorTitle,
    message: errorMessage,
    category: 'system',
    priority: 'critical',
    metadata,
  })
}

// ─── Send Notification API ──────────────────────
// POST /api/notifications/send — Create and deliver a notification
//
// Body: {
//   userId?: string,
//   type: NotificationType,
//   title: string,
//   message: string,
//   category?: NotificationCategory,
//   priority?: NotificationPriority,
//   actionUrl?: string,
//   metadata?: Record<string, unknown>,
//   skipEmail?: boolean
// }

import { successResponse, errorResponse } from '@/lib/api-utils'
import { deliverNotification, type NotificationType, type NotificationCategory, type NotificationPriority } from '@/lib/notification-delivery'

const VALID_TYPES: NotificationType[] = [
  'execution_complete',
  'execution_failed',
  'approval_needed',
  'approval_resolved',
  'trigger_fired',
  'integration_connected',
  'integration_disconnected',
  'error_alert',
  'info',
  'warning',
]

const VALID_CATEGORIES: NotificationCategory[] = ['execution', 'approval', 'trigger', 'integration', 'system']
const VALID_PRIORITIES: NotificationPriority[] = ['low', 'normal', 'high', 'critical']

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      userId,
      type,
      title,
      message,
      category,
      priority,
      actionUrl,
      metadata,
      skipEmail,
    } = body as {
      userId?: string
      type: string
      title: string
      message: string
      category?: string
      priority?: string
      actionUrl?: string
      metadata?: Record<string, unknown>
      skipEmail?: boolean
    }

    // Validate required fields
    if (!title || !message) {
      return errorResponse('title and message are required', 400)
    }

    if (!type) {
      return errorResponse('type is required', 400)
    }

    // Validate type
    if (!VALID_TYPES.includes(type as NotificationType)) {
      return errorResponse(`Invalid notification type. Must be one of: ${VALID_TYPES.join(', ')}`, 400)
    }

    // Validate category if provided
    if (category && !VALID_CATEGORIES.includes(category as NotificationCategory)) {
      return errorResponse(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`, 400)
    }

    // Validate priority if provided
    if (priority && !VALID_PRIORITIES.includes(priority as NotificationPriority)) {
      return errorResponse(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`, 400)
    }

    // Deliver the notification
    const result = await deliverNotification({
      userId,
      type: type as NotificationType,
      title,
      message,
      category: category as NotificationCategory | undefined,
      priority: priority as NotificationPriority | undefined,
      actionUrl,
      metadata,
      skipEmail,
    })

    return successResponse({
      delivered: result.delivered,
      emailSent: result.emailSent,
      emailError: result.emailError,
      message: `Notification delivered via: ${result.delivered.join(', ') || 'none'}`,
    }, 201)
  } catch (err) {
    console.error('[POST /api/notifications/send]', err)
    return errorResponse('Failed to send notification', 500)
  }
}

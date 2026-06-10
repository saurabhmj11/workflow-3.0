// ─── Notification Deliver API ──────────────────────
// POST /api/notifications/deliver
// Send a notification through all configured channels

import { successResponse, errorResponse } from '@/lib/api-utils'
import { notificationDelivery, type NotificationPayload, type NotificationChannel } from '@/lib/notifications/delivery'
import { renderTemplate, getTemplate } from '@/lib/notifications/templates'

const VALID_CATEGORIES = ['execution', 'approval', 'trigger', 'integration', 'system'] as const
const VALID_PRIORITIES = ['low', 'normal', 'high', 'critical'] as const

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
      templateId,
      templateVariables,
      channels,
    } = body as {
      userId?: string
      type?: string
      title?: string
      message?: string
      category?: string
      priority?: string
      actionUrl?: string
      metadata?: Record<string, unknown>
      templateId?: string
      templateVariables?: Record<string, unknown>
      channels?: NotificationChannel[]
    }

    let payloadTitle = title
    let payloadMessage = message
    let payloadCategory = category
    let payloadPriority: 'low' | 'normal' | 'high' | 'critical' | undefined =
      priority as 'low' | 'normal' | 'high' | 'critical' | undefined

    // If templateId is provided, render the template
    if (templateId) {
      const rendered = renderTemplate(templateId, templateVariables ?? {})
      if (!rendered) {
        return errorResponse(`Template "${templateId}" not found`, 400)
      }
      payloadTitle = rendered.title
      payloadMessage = rendered.message

      // Use template defaults for category and priority if not explicitly provided
      const template = getTemplate(templateId)
      if (template) {
        payloadCategory = payloadCategory ?? template.category
        payloadPriority = payloadPriority ?? template.defaultPriority
      }
    }

    // Validate required fields
    if (!payloadTitle || !payloadMessage) {
      return errorResponse('title and message are required (or provide a valid templateId)', 400)
    }

    if (!payloadCategory || !VALID_CATEGORIES.includes(payloadCategory as typeof VALID_CATEGORIES[number])) {
      return errorResponse(`category must be one of: ${VALID_CATEGORIES.join(', ')}`, 400)
    }

    if (payloadPriority && !VALID_PRIORITIES.includes(payloadPriority)) {
      return errorResponse(`priority must be one of: ${VALID_PRIORITIES.join(', ')}`, 400)
    }

    // Build the notification payload
    const payload: NotificationPayload = {
      userId,
      type: type ?? 'info',
      title: payloadTitle,
      message: payloadMessage,
      category: payloadCategory,
      priority: payloadPriority ?? 'normal',
      actionUrl,
      metadata,
    }

    // Override channels if specified in the request
    if (channels && Array.isArray(channels) && channels.length > 0) {
      const currentConfig = notificationDelivery.getConfig()
      notificationDelivery.updateConfig({ channels })
      const results = await notificationDelivery.deliver(payload)
      // Restore original channels
      notificationDelivery.updateConfig({ channels: currentConfig.channels })
      return successResponse({ results }, 201)
    }

    // Deliver through default configured channels
    const results = await notificationDelivery.deliver(payload)

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    return successResponse({
      results,
      summary: {
        total: results.length,
        succeeded: successCount,
        failed: failCount,
        channels: results.map((r) => r.channel),
      },
    }, 201)
  } catch (err) {
    console.error('[POST /api/notifications/deliver]', err)
    return errorResponse('Failed to deliver notification', 500)
  }
}

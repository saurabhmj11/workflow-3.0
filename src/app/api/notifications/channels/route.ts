// ─── Notification Channels API ─────────────────────
// GET  — Get configured notification channels and delivery config
// PUT  — Update notification channel configuration

import { successResponse, errorResponse } from '@/lib/api-utils'
import { notificationDelivery, type DeliveryConfig, type NotificationChannel } from '@/lib/notifications/delivery'
import { requireAuth, isAdmin } from '@/lib/auth-utils'

const VALID_CHANNELS: NotificationChannel[] = ['in_app', 'email', 'webhook', 'push']
const VALID_EMAIL_PROVIDERS = ['sendgrid', 'smtp', 'resend']
const VALID_PUSH_PROVIDERS = ['firebase', 'web-push']

/**
 * GET /api/notifications/channels
 * Returns the current notification channel configuration.
 * Masks sensitive fields (API keys, secrets, passwords).
 */
export async function GET() {
  try {
    const config = notificationDelivery.getConfig()

    // Mask sensitive fields for display
    const maskedConfig: Record<string, unknown> = {
      channels: config.channels,
      email: config.email ? {
        provider: config.email.provider,
        fromAddress: config.email.fromAddress,
        fromName: config.email.fromName,
        // SMTP credentials come from env vars, not exposed via API
      } : null,
      webhook: config.webhook ? {
        url: config.webhook.url,
        hasSecret: !!config.webhook.secret,
        headers: config.webhook.headers,
      } : null,
      push: config.push ? {
        provider: config.push.provider,
        hasVapidKey: !!config.push.vapidPublicKey,
      } : null,
      // Environment-based SMTP availability
      smtpAvailable: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    }

    return successResponse(maskedConfig)
  } catch (err) {
    console.error('[GET /api/notifications/channels]', err)
    return errorResponse('Failed to fetch channel configuration', 500)
  }
}

/**
 * PUT /api/notifications/channels
 * Update notification channel configuration (admin only).
 */
export async function PUT(request: Request) {
  try {
    // Require admin for channel configuration
    const adminCheck = await isAdmin()
    if (!adminCheck) {
      try {
        await requireAuth()
        return errorResponse('Admin access required to configure notification channels', 403)
      } catch {
        return errorResponse('Authentication required', 401)
      }
    }

    const body = await request.json()
    const { channels, email, webhook, push } = body as {
      channels?: NotificationChannel[]
      email?: DeliveryConfig['email']
      webhook?: DeliveryConfig['webhook']
      push?: DeliveryConfig['push']
    }

    // Validate channels
    if (channels) {
      if (!Array.isArray(channels)) {
        return errorResponse('channels must be an array', 400)
      }
      for (const ch of channels) {
        if (!VALID_CHANNELS.includes(ch)) {
          return errorResponse(`Invalid channel "${ch}". Must be one of: ${VALID_CHANNELS.join(', ')}`, 400)
        }
      }
    }

    // Validate email config
    if (email) {
      if (email.provider && !VALID_EMAIL_PROVIDERS.includes(email.provider)) {
        return errorResponse(`Invalid email provider. Must be one of: ${VALID_EMAIL_PROVIDERS.join(', ')}`, 400)
      }
      if (!email.fromAddress) {
        return errorResponse('email.fromAddress is required when configuring email', 400)
      }
      if (!email.fromName) {
        return errorResponse('email.fromName is required when configuring email', 400)
      }
    }

    // Validate push config
    if (push) {
      if (push.provider && !VALID_PUSH_PROVIDERS.includes(push.provider)) {
        return errorResponse(`Invalid push provider. Must be one of: ${VALID_PUSH_PROVIDERS.join(', ')}`, 400)
      }
    }

    // Validate webhook config
    if (webhook) {
      if (!webhook.url) {
        return errorResponse('webhook.url is required when configuring webhook', 400)
      }
      try {
        new URL(webhook.url)
      } catch {
        return errorResponse('webhook.url must be a valid URL', 400)
      }
    }

    // Update configuration
    const update: Partial<DeliveryConfig> = {}
    if (channels) update.channels = channels
    if (email) update.email = email
    if (webhook) update.webhook = webhook
    if (push) update.push = push

    notificationDelivery.updateConfig(update)

    // Return the updated config (masked)
    const updatedConfig = notificationDelivery.getConfig()
    const maskedResponse: Record<string, unknown> = {
      channels: updatedConfig.channels,
      email: updatedConfig.email ? {
        provider: updatedConfig.email.provider,
        fromAddress: updatedConfig.email.fromAddress,
        fromName: updatedConfig.email.fromName,
      } : null,
      webhook: updatedConfig.webhook ? {
        url: updatedConfig.webhook.url,
        hasSecret: !!updatedConfig.webhook.secret,
        headers: updatedConfig.webhook.headers,
      } : null,
      push: updatedConfig.push ? {
        provider: updatedConfig.push.provider,
        hasVapidKey: !!updatedConfig.push.vapidPublicKey,
      } : null,
    }

    return successResponse(maskedResponse)
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthRequiredError') {
      return errorResponse('Authentication required', 401)
    }
    console.error('[PUT /api/notifications/channels]', err)
    return errorResponse('Failed to update channel configuration', 500)
  }
}

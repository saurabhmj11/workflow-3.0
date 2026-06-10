import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId, requireAuth } from '@/lib/auth-utils'
import { successResponse, errorResponse } from '@/lib/api-utils'

interface NotificationPreferences {
  emailNotifications: boolean
  inAppNotifications: boolean
  executionAlerts: boolean
  approvalAlerts: boolean
  triggerFailureAlerts: boolean
  weeklyDigest: boolean
}

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  emailNotifications: true,
  inAppNotifications: true,
  executionAlerts: true,
  approvalAlerts: true,
  triggerFailureAlerts: true,
  weeklyDigest: false,
}

// GET /api/settings/notifications — Get notification preferences
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return errorResponse('Authentication required', 401)

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, metadata: true },
    })

    if (!user) return errorResponse('User not found', 404)

    let metadata: Record<string, unknown> = {}
    if (user.metadata) {
      try {
        metadata = JSON.parse(user.metadata)
      } catch {
        metadata = {}
      }
    }

    const notifications: NotificationPreferences = {
      ...DEFAULT_NOTIFICATIONS,
      ...(metadata.notifications as NotificationPreferences | undefined),
    }

    return successResponse(notifications)
  } catch (err) {
    console.error('[Settings/Notifications] GET error:', err)
    return errorResponse('Failed to fetch notification preferences', 500)
  }
}

// PUT /api/settings/notifications — Update notification preferences
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body: Partial<NotificationPreferences> = await req.json()

    // Load existing metadata
    const existing = await db.user.findUnique({
      where: { id: user.id },
      select: { metadata: true },
    })

    let metadata: Record<string, unknown> = {}
    if (existing?.metadata) {
      try {
        metadata = JSON.parse(existing.metadata)
      } catch {
        metadata = {}
      }
    }

    // Merge notification preferences
    const currentNotifications: NotificationPreferences = {
      ...DEFAULT_NOTIFICATIONS,
      ...(metadata.notifications as NotificationPreferences | undefined),
    }

    const updatedNotifications: NotificationPreferences = {
      emailNotifications: body.emailNotifications ?? currentNotifications.emailNotifications,
      inAppNotifications: body.inAppNotifications ?? currentNotifications.inAppNotifications,
      executionAlerts: body.executionAlerts ?? currentNotifications.executionAlerts,
      approvalAlerts: body.approvalAlerts ?? currentNotifications.approvalAlerts,
      triggerFailureAlerts: body.triggerFailureAlerts ?? currentNotifications.triggerFailureAlerts,
      weeklyDigest: body.weeklyDigest ?? currentNotifications.weeklyDigest,
    }

    metadata.notifications = updatedNotifications

    await db.user.update({
      where: { id: user.id },
      data: { metadata: JSON.stringify(metadata) },
    })

    return successResponse(updatedNotifications)
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthRequiredError') {
      return errorResponse('Authentication required', 401)
    }
    console.error('[Settings/Notifications] PUT error:', err)
    return errorResponse('Failed to update notification preferences', 500)
  }
}

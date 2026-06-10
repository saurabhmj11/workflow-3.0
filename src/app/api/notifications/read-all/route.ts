// ─── Mark All Notifications as Read API ───────────
// PUT — Mark all unread notifications as read

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'

export async function PUT() {
  try {
    const result = await db.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true, readAt: new Date() },
    })

    return successResponse({
      updated: result.count,
      message: `${result.count} notification(s) marked as read`,
    })
  } catch (err) {
    console.error('[Notifications API] read-all PUT error:', err)
    return errorResponse('Failed to mark all as read', 500)
  }
}

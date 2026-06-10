// ─── Single Notification API ──────────────────────
// PUT  — Mark notification as read (or update)
// DELETE — Remove a notification

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { NextRequest } from 'next/server'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const existing = await db.notification.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('Notification not found', 404)
    }

    const updateData: any = {}

    if (body.isRead === true && !existing.isRead) {
      updateData.isRead = true
      updateData.readAt = new Date()
    }
    if (body.isRead === false) {
      updateData.isRead = false
      updateData.readAt = null
    }
    if (body.priority) {
      updateData.priority = body.priority
    }

    const notification = await db.notification.update({
      where: { id },
      data: updateData,
    })

    return successResponse({
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      category: notification.category,
      priority: notification.priority,
      isRead: notification.isRead,
      actionUrl: notification.actionUrl,
      metadata: notification.metadata,
      createdAt: notification.createdAt.toISOString(),
      readAt: notification.readAt?.toISOString() ?? null,
    })
  } catch (err) {
    console.error('[Notifications API] PUT error:', err)
    return errorResponse('Failed to update notification', 500)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.notification.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('Notification not found', 404)
    }

    await db.notification.delete({ where: { id } })

    return successResponse({ deleted: true })
  } catch (err) {
    console.error('[Notifications API] DELETE error:', err)
    return errorResponse('Failed to delete notification', 500)
  }
}

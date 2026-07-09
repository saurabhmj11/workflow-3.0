// ─── Notifications API ─────────────────────────────
// GET  — List notifications (most recent first)
// POST — Create a new notification

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100)
    const offset = parseInt(url.searchParams.get('offset') ?? '0')
    const unreadOnly = url.searchParams.get('unread') === 'true'

    const where: any = {}
    if (unreadOnly) {
      where.isRead = false
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await db.notification.count({ where })
    const unreadCount = await db.notification.count({ where: { isRead: false } })

    const data = notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      category: n.category,
      priority: n.priority,
      isRead: n.isRead,
      actionUrl: n.actionUrl,
      metadata: n.metadata,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt?.toISOString() ?? null,
    }))

    return successResponse({ notifications: data, total, unreadCount })
  } catch (err) {
    console.error('[Notifications API] GET error:', err)
    return errorResponse('Failed to fetch notifications', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, title, message, category, priority, actionUrl, metadata, userId } = body

    if (!title || !message || !category) {
      return errorResponse('title, message, and category are required')
    }

    const notification = await db.notification.create({
      data: {
        userId: userId ?? null,
        type: type ?? 'info',
        title,
        message,
        category,
        priority: priority ?? 'normal',
        isRead: false,
        actionUrl: actionUrl ?? null,
        metadata: metadata ?? null,
      },
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
    }, 201)
  } catch (err) {
    console.error('[Notifications API] POST error:', err)
    return errorResponse('Failed to create notification', 500)
  }
}

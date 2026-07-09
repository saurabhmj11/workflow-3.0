import { create } from 'zustand'

// ─── Notification Types ────────────────────────────

export interface AppNotification {
  id: string
  userId?: string
  type: string // execution_complete, approval_needed, trigger_fired, integration_connected, error_alert, info
  title: string
  message: string
  category: string // execution, approval, trigger, integration, system
  priority: string // low, normal, high, critical
  isRead: boolean
  actionUrl?: string
  metadata?: string // JSON string
  createdAt: string
  readAt?: string
}

interface NotificationState {
  notifications: AppNotification[]
  unreadCount: number
  isLoading: boolean
  addNotification: (n: Partial<AppNotification> & { title: string; message: string; category: string }) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  fetchNotifications: () => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  addNotification: (n) => {
    const notification: AppNotification = {
      id: n.id ?? `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: n.userId,
      type: n.type ?? 'info',
      title: n.title,
      message: n.message,
      category: n.category,
      priority: n.priority ?? 'normal',
      isRead: n.isRead ?? false,
      actionUrl: n.actionUrl,
      metadata: n.metadata,
      createdAt: n.createdAt ?? new Date().toISOString(),
      readAt: n.readAt,
    }

    set((s) => ({
      notifications: [notification, ...s.notifications],
      unreadCount: s.unreadCount + (notification.isRead ? 0 : 1),
    }))

    // Persist to DB (non-blocking)
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        category: notification.category,
        priority: notification.priority,
        actionUrl: notification.actionUrl,
        metadata: notification.metadata,
      }),
    }).catch(() => {
      // Silently fail — the store still works in-memory
    })
  },

  markAsRead: (id) => {
    set((s) => {
      const notif = s.notifications.find((n) => n.id === id)
      const wasUnread = notif && !notif.isRead
      return {
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        ),
        unreadCount: wasUnread ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
      }
    })

    // Persist to DB (non-blocking)
    fetch(`/api/notifications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true }),
    }).catch(() => {})
  },

  markAllAsRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.isRead ? n : { ...n, isRead: true, readAt: new Date().toISOString() }
      ),
      unreadCount: 0,
    }))

    // Persist to DB (non-blocking)
    fetch('/api/notifications/read-all', {
      method: 'PUT',
    }).catch(() => {})
  },

  deleteNotification: (id) => {
    set((s) => {
      const notif = s.notifications.find((n) => n.id === id)
      const wasUnread = notif && !notif.isRead
      return {
        notifications: s.notifications.filter((n) => n.id !== id),
        unreadCount: wasUnread ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
      }
    })

    // Persist to DB (non-blocking)
    fetch(`/api/notifications/${id}`, {
      method: 'DELETE',
    }).catch(() => {})
  },

  fetchNotifications: async () => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/notifications')
      const json = await res.json()

      if (json.ok && Array.isArray(json.data)) {
        const notifications: AppNotification[] = json.data.map((n: any) => ({
          id: n.id,
          userId: n.userId ?? undefined,
          type: n.type,
          title: n.title,
          message: n.message,
          category: n.category,
          priority: n.priority,
          isRead: n.isRead,
          actionUrl: n.actionUrl ?? undefined,
          metadata: n.metadata ?? undefined,
          createdAt: n.createdAt,
          readAt: n.readAt ?? undefined,
        }))

        const unreadCount = notifications.filter((n) => !n.isRead).length

        set({ notifications, unreadCount, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },
}))

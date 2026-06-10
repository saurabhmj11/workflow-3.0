'use client'

import { useNotificationStore, type AppNotification } from '@/stores/notification-store'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Play,
  AlertTriangle,
  Zap,
  Plug,
  Info,
  XCircle,
  CheckCheck,
  Trash2,
  Bell,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

// ─── Category icon/color mapping ──────────────────

const CATEGORY_CONFIG: Record<string, { icon: typeof Play; color: string; bgColor: string }> = {
  execution: { icon: Play, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  approval: { icon: AlertTriangle, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  trigger: { icon: Zap, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  integration: { icon: Plug, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  system: { icon: Info, color: 'text-zinc-400', bgColor: 'bg-zinc-500/10' },
  error: { icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-500/10' },
}

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.system
}

// ─── Priority indicator ────────────────────────────

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-zinc-500',
  normal: 'bg-blue-500',
  high: 'bg-amber-500',
  critical: 'bg-red-500',
}

// ─── Time ago helper ──────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then

  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

// ─── Single Notification Item ─────────────────────

function NotificationItem({
  notification,
  onRead,
  onDelete,
}: {
  notification: AppNotification
  onRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  const router = useRouter()
  const config = getCategoryConfig(notification.category)
  const Icon = config.icon

  const handleClick = () => {
    if (!notification.isRead) {
      onRead(notification.id)
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(notification.id)
  }

  return (
    <div
      className={`flex gap-3 p-3 cursor-pointer hover:bg-zinc-800/60 transition-colors relative group ${
        !notification.isRead ? 'bg-zinc-800/30' : ''
      }`}
      onClick={handleClick}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400" />
      )}

      {/* Category icon */}
      <div className={`shrink-0 h-8 w-8 rounded-md ${config.bgColor} flex items-center justify-center mt-0.5`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-tight ${!notification.isRead ? 'font-medium text-zinc-100' : 'text-zinc-300'}`}>
            {notification.title}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {(notification.priority === 'high' || notification.priority === 'critical') && (
              <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[notification.priority] ?? 'bg-zinc-500'}`} />
            )}
            <span className="text-[10px] text-zinc-500 whitespace-nowrap">
              {timeAgo(notification.createdAt)}
            </span>
          </div>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
      </div>

      {/* Delete button on hover */}
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5 hover:bg-zinc-700 rounded mt-0.5"
        onClick={handleDelete}
        aria-label="Delete notification"
      >
        <Trash2 className="h-3 w-3 text-zinc-500 hover:text-red-400" />
      </button>
    </div>
  )
}

// ─── Notification Center ──────────────────────────

export function NotificationCenter() {
  const notifications = useNotificationStore((s) => s.notifications)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)
  const deleteNotification = useNotificationStore((s) => s.deleteNotification)

  return (
    <div className="flex flex-col w-80 sm:w-96">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] font-medium bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 px-2"
            onClick={markAllAsRead}
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-3">
            <Bell className="h-6 w-6 text-zinc-600" />
          </div>
          <p className="text-sm text-zinc-500">No notifications yet</p>
          <p className="text-xs text-zinc-600 mt-1">
            We&apos;ll alert you when something happens
          </p>
        </div>
      ) : (
        <ScrollArea className="max-h-96">
          <div className="divide-y divide-zinc-800/50">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-zinc-800 px-4 py-2">
          <p className="text-[10px] text-zinc-600 text-center">
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''} · {unreadCount} unread
          </p>
        </div>
      )}
    </div>
  )
}

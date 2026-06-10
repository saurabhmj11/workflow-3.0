'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { NotificationCenter } from './notification-center'
import { useNotificationStore } from '@/stores/notification-store'

// ─── Notification Popover ─────────────────────────
// Bell icon button with unread count badge
// Opens popover with NotificationCenter inside
// Fetches notifications on mount and every 30 seconds

export function NotificationPopover() {
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasFetched = useRef(false)

  // Fetch notifications on mount
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true
      fetchNotifications()
    }
  }, [fetchNotifications])

  // Poll every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchNotifications()
    }, 30000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchNotifications])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-zinc-200 relative"
          title="Notifications"
        >
          <Bell className="h-3.5 w-3.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none animate-in zoom-in duration-200">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-zinc-900 border-zinc-800 shadow-xl shadow-black/40"
        align="end"
        sideOffset={8}
      >
        <NotificationCenter />
      </PopoverContent>
    </Popover>
  )
}

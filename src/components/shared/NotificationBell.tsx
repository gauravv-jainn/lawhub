'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import { formatDistanceToNow } from 'date-fns'
import type { AppNotification } from '@/types'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead, setNotifications } =
    useAppStore()

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Poll for notifications every 30 seconds
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch('/api/notifications')
        if (res.ok) {
          const data = await res.json()
          if (data.notifications) setNotifications(data.notifications as AppNotification[])
        }
      } catch {
        // silently fail
      }
    }

    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [setNotifications])

  async function handleMarkRead(id: string, link?: string | null) {
    markNotificationRead(id)
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
    setOpen(false)
    if (link) router.push(link)
  }

  async function handleMarkAll() {
    markAllNotificationsRead()
    await fetch('/api/notifications/read-all', { method: 'PATCH' })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-parchment/70 hover:text-parchment hover:bg-white/5 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-gold text-ink text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-semibold text-parchment">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-gold hover:text-gold-light transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-parchment/40 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleMarkRead(n.id, n.link)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                    !n.is_read ? 'bg-gold/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {!n.is_read && (
                      <span className="mt-1.5 w-2 h-2 bg-gold rounded-full flex-shrink-0" />
                    )}
                    <div className={!n.is_read ? '' : 'ml-5'}>
                      <p className="text-sm text-parchment font-medium leading-snug">{n.title}</p>
                      {n.body && (
                        <p className="text-xs text-parchment/50 mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[11px] text-parchment/30 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

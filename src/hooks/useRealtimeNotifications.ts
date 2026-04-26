'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { AppNotification } from '@/types'

export function useRealtimeNotifications(userId: string | undefined) {
  const { setNotifications, addNotification } = useAppStore()

  useEffect(() => {
    if (!userId) return

    // Initial fetch
    fetch('/api/notifications')
      .then((res) => res.json())
      .then(({ notifications }) => {
        if (notifications) setNotifications(notifications as AppNotification[])
      })
      .catch(() => {
        // silently fail
      })

    // Poll every 30 seconds for new notifications
    const interval = setInterval(() => {
      fetch('/api/notifications')
        .then((res) => res.json())
        .then(({ notifications }) => {
          if (notifications) setNotifications(notifications as AppNotification[])
        })
        .catch(() => {
          // silently fail
        })
    }, 30000)

    return () => clearInterval(interval)
  }, [userId, setNotifications, addNotification])
}

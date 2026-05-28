'use client'

import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { AppNotification } from '@/types'

export function useRealtimeNotifications(userId: string | undefined) {
  const { setNotifications, addNotification } = useAppStore()
  // Track the timestamp of the most recent notification we've fetched
  const lastFetchedAt = useRef<string | null>(null)

  useEffect(() => {
    if (!userId) return

    async function fetchNotifications(since?: string) {
      try {
        const url = since
          ? `/api/notifications?since=${encodeURIComponent(since)}`
          : '/api/notifications'
        const res = await fetch(url)
        if (!res.ok) return

        const { notifications } = await res.json() as { notifications?: AppNotification[] }
        if (!notifications?.length) return

        if (since) {
          // Incremental: add only new notifications — don't replace existing read state
          for (const n of notifications) {
            addNotification(n)
          }
        } else {
          // Initial load: set all
          setNotifications(notifications)
        }

        // Update the watermark to the most recent notification's timestamp
        const newest = notifications[0]
        if (newest) lastFetchedAt.current = newest.created_at
      } catch {
        // Silently fail — polling will retry on next interval
      }
    }

    // Initial load (full fetch, no since)
    void fetchNotifications()

    // Poll every 30 seconds — only fetch new notifications since last poll
    const interval = setInterval(() => {
      void fetchNotifications(lastFetchedAt.current ?? undefined)
    }, 30_000)

    return () => clearInterval(interval)
  }, [userId, setNotifications, addNotification])
}

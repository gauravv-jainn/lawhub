'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Profile, AppNotification } from '@/types'

interface AppState {
  // Auth
  profile: Profile | null
  setProfile: (profile: Profile | null) => void

  // Notifications
  notifications: AppNotification[]
  unreadCount: number
  setNotifications: (notifications: AppNotification[]) => void
  addNotification: (notification: AppNotification) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void

  // UI
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // AI loading states
  aiLoading: Record<string, boolean>
  setAILoading: (key: string, loading: boolean) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      // Auth
      profile: null,
      setProfile: (profile) => set({ profile }),

      // Notifications
      notifications: [],
      unreadCount: 0,
      setNotifications: (notifications) =>
        set({
          notifications,
          unreadCount: notifications.filter((n) => !n.is_read).length,
        }),
      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + (notification.is_read ? 0 : 1),
        })),
      markNotificationRead: (id) =>
        set((state) => {
          const notifications = state.notifications.map((n) =>
            n.id === id ? { ...n, is_read: true } : n
          )
          return {
            notifications,
            unreadCount: notifications.filter((n) => !n.is_read).length,
          }
        }),
      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
          unreadCount: 0,
        })),

      // UI
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // AI loading
      aiLoading: {},
      setAILoading: (key, loading) =>
        set((state) => ({
          aiLoading: { ...state.aiLoading, [key]: loading },
        })),
    }),
    { name: 'lawhub-store' }
  )
)

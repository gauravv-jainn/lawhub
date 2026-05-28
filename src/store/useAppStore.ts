'use client'

import { create, type StateCreator } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Profile, AppNotification } from '@/types'

interface AppState {
  profile: Profile | null
  setProfile: (profile: Profile | null) => void

  notifications: AppNotification[]
  unreadCount: number
  setNotifications: (notifications: AppNotification[]) => void
  addNotification: (notification: AppNotification) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void

  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  aiLoading: Record<string, boolean>
  setAILoading: (key: string, loading: boolean) => void
}

const storeImpl: StateCreator<AppState> = (set) => ({
  profile: null as Profile | null,
  setProfile: (profile: Profile | null) => set({ profile }),

  notifications: [] as AppNotification[],
  unreadCount: 0,
  setNotifications: (notifications: AppNotification[]) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.is_read).length,
    }),
  addNotification: (notification: AppNotification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.is_read ? 0 : 1),
    })),
  markNotificationRead: (id: string) =>
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

  sidebarOpen: false,
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  aiLoading: {} as Record<string, boolean>,
  setAILoading: (key: string, loading: boolean) =>
    set((state) => ({
      aiLoading: { ...state.aiLoading, [key]: loading },
    })),
})

// Devtools only in development — never expose state to Redux DevTools in production
export const useAppStore =
  process.env.NODE_ENV === 'development'
    ? create<AppState>()(devtools(storeImpl, { name: 'lawhub-store' }))
    : create<AppState>()(storeImpl)

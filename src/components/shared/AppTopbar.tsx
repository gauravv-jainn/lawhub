'use client'

import { Menu, Search } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import NotificationBell from './NotificationBell'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'

interface AppTopbarProps {
  userId?: string
  title?: string
}

export default function AppTopbar({ userId, title }: AppTopbarProps) {
  const { toggleSidebar } = useAppStore()

  // Boot realtime notifications globally from here
  useRealtimeNotifications(userId)

  return (
    <header className="sticky top-0 z-30 h-14 bg-[#0d0d1a]/95 backdrop-blur-sm border-b border-white/8 flex items-center gap-3 px-4">
      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-2 rounded-lg text-parchment/70 hover:text-parchment hover:bg-white/5 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      {title && (
        <h1 className="text-sm font-semibold text-parchment/80 hidden sm:block">{title}</h1>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search (decorative for now) */}
      <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-parchment/40 text-xs hover:border-white/20 transition-colors">
        <Search className="w-3.5 h-3.5" />
        <span>Search anything...</span>
        <kbd className="ml-4 text-[10px] bg-white/10 px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>

      {/* Notifications */}
      <NotificationBell />
    </header>
  )
}

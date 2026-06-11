'use client'

import { useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Zap, Menu, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AppSidebar, PAGE_META, EXCLUDED_ROUTES } from './app-sidebar'

// ─── AppLayout Component ────────────────────────────

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Check if this route should be excluded from the layout
  const isExcluded = EXCLUDED_ROUTES.some(route => {
    if (route === '/builder') return pathname === '/builder' || pathname.startsWith('/builder/')
    if (route === '/demo') return pathname === '/demo' || pathname.startsWith('/demo/')
    if (route === '/login') return pathname === '/login' || pathname.startsWith('/login/')
    if (route === '/register') return pathname === '/register' || pathname.startsWith('/register/')
    return pathname === route
  })

  const toggleCollapse = useCallback(() => {
    setSidebarCollapsed(prev => !prev)
  }, [])

  const openMobile = useCallback(() => {
    setMobileOpen(true)
  }, [])

  const closeMobile = useCallback(() => {
    setMobileOpen(false)
  }, [])

  // If excluded, just render children without layout
  if (isExcluded) {
    return <>{children}</>
  }

  // Get page metadata for the header
  const pageMeta = PAGE_META[pathname] ?? {
    title: 'OpenWorkflow',
    description: 'AI Workflow Platform',
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Sidebar */}
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobile}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header Bar */}
        <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={openMobile}
              className="md:hidden h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">{pageMeta.title}</h2>
              <p className="text-xs text-zinc-500">{pageMeta.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400">
              <Zap className="h-2.5 w-2.5 mr-1" />
              v3.0
            </Badge>
            <Link href="/builder">
              <Button size="sm" className="h-8 text-xs bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white">
                <Workflow className="h-3.5 w-3.5 mr-1.5" />
                New Workflow
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

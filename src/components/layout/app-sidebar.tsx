'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Zap, LayoutDashboard, Workflow, BarChart3, Activity,
  Plug, Brain, Rocket, FlaskConical, Eye, Layers,
  Shield, Settings, ChevronRight, KeyRound, Search,
  LogOut, User,
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ─── Navigation Items ───────────────────────────────

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-cyan-400' },
  { href: '/build', label: 'Build', icon: Workflow, color: 'text-violet-400' },
  { href: '/test', label: 'Test', icon: FlaskConical, color: 'text-amber-400' },
  { href: '/deploy', label: 'Deploy', icon: Rocket, color: 'text-emerald-400' },
  { href: '/embed', label: 'Embed', icon: Plug, color: 'text-orange-400' },
]

// ─── Page Title Map ─────────────────────────────────

export const PAGE_META: Record<string, { title: string; description: string }> = {
  '/': { title: 'OpenWorkflow Platform', description: 'Build, deploy, and monitor AI-powered workflows' },
  '/dashboard': { title: 'Dashboard', description: 'Real-time performance metrics' },
  '/build': { title: 'Build', description: 'Workflow Builder' },
  '/test': { title: 'Test', description: 'Workflow test runner and assertions' },
  '/deploy': { title: 'Deploy', description: 'Manage workflow deployments across environments' },
  '/embed': { title: 'Embed', description: 'Embed configurations' },
}

// ─── Routes that should NOT use AppLayout ───────────

export const EXCLUDED_ROUTES = ['/', '/build', '/demo', '/login', '/register', '/chat']

// ─── Sidebar Component ──────────────────────────────

interface AppSidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onMobileClose: () => void
  onOpenCommandPalette?: () => void
}

export function AppSidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose, onOpenCommandPalette }: AppSidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-zinc-800">
        <div className="h-8 w-8 rounded-lg bg-linear-to-br from-violet-600 to-cyan-500 flex items-center justify-center shrink-0">
          <Zap className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">OpenWorkflow</h1>
            <p className="text-[10px] text-zinc-500">AI Workflow Platform</p>
          </div>
        )}
      </div>

      {/* Command Palette Button */}
      {onOpenCommandPalette && (
        <div className="px-2 pt-2">
          <button
            onClick={onOpenCommandPalette}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-500 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Search...</span>
                <kbd className="text-[9px] bg-zinc-700 border border-zinc-600 rounded px-1 py-0.5">⌘K</kbd>
              </>
            )}
          </button>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-0.5">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = isActive(item.href)
            const itemWithBadge = item as typeof item & { badge?: string }
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-zinc-800/60 group ${
                  active ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? item.color : item.color}`} />
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {!collapsed && itemWithBadge.badge && (
                  <Badge variant="outline" className="text-[8px] border-amber-500/30 text-amber-400 px-1 py-0 h-4">{itemWithBadge.badge}</Badge>
                )}
                {collapsed && (
                  <span className="sr-only">{item.label}</span>
                )}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* User Profile & Logout */}
      <div className="p-2 border-t border-zinc-800">
        <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium ${collapsed ? 'justify-center' : ''}`}>
          <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700 overflow-hidden">
            {session?.user?.image ? (
              <img src={session.user.image} alt="User" className="h-full w-full object-cover" />
            ) : (
              <User className="h-3.5 w-3.5 text-zinc-400" />
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-zinc-200">{session?.user?.name || 'Developer'}</p>
              <p className="truncate text-[10px] text-zinc-500">{session?.user?.email || 'admin@openworkflow.ai'}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
              title="Log out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Log out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-zinc-800">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
        >
          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
          {!collapsed && <span className="text-[10px]">Collapse</span>}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex border-r border-zinc-800 bg-zinc-900/80 backdrop-blur-sm flex-col transition-all duration-200 shrink-0 ${
        collapsed ? 'w-16' : 'w-56'
      }`}>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          {/* Sidebar panel */}
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-zinc-900/95 backdrop-blur-sm flex flex-col border-r border-zinc-800 animate-in slide-in-from-left duration-200">
            {/* Close button */}
            <div className="p-4 flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-linear-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-white leading-tight">OpenWorkflow</h1>
                  <p className="text-[10px] text-zinc-500">AI Workflow Platform</p>
                </div>
              </div>
              <button
                onClick={onMobileClose}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1">
              <nav className="p-2 space-y-0.5">
                {NAV_ITEMS.map(item => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onMobileClose}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-zinc-800/60 group ${
                        active ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${item.color}`} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </ScrollArea>

            {/* Mobile User Profile & Logout */}
            <div className="p-4 border-t border-zinc-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700 overflow-hidden">
                  {session?.user?.image ? (
                    <img src={session.user.image} alt="User" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-zinc-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-zinc-200">{session?.user?.name || 'Developer'}</p>
                  <p className="truncate text-xs text-zinc-500">{session?.user?.email || 'admin@openworkflow.ai'}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </Button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

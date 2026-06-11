'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Zap, LayoutDashboard, Workflow, BarChart3, Activity,
  Plug, Brain, Rocket, FlaskConical, Eye, Layers,
  Shield, Settings, ChevronRight,
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ─── Navigation Items ───────────────────────────────

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: LayoutDashboard, color: 'text-zinc-400' },
  { href: '/builder', label: 'Builder', icon: Workflow, color: 'text-violet-400' },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3, color: 'text-cyan-400' },
  { href: '/analytics', label: 'Analytics', icon: Activity, color: 'text-emerald-400' },
  { href: '/integrations', label: 'Integrations', icon: Plug, color: 'text-orange-400' },
  { href: '/memory', label: 'Memory / CRM', icon: Brain, color: 'text-pink-400' },
  { href: '/deployments', label: 'Deployments', icon: Rocket, color: 'text-emerald-400' },
  { href: '/testing', label: 'Testing', icon: FlaskConical, color: 'text-amber-400' },
  { href: '/observability', label: 'Observability', icon: Eye, color: 'text-violet-400' },
  { href: '/plugins', label: 'Plugins', icon: Layers, color: 'text-cyan-400' },
  { href: '/audit', label: 'Audit Trail', icon: Shield, color: 'text-emerald-400' },
  { href: '/settings', label: 'Settings', icon: Settings, color: 'text-zinc-400' },
]

// ─── Page Title Map ─────────────────────────────────

export const PAGE_META: Record<string, { title: string; description: string }> = {
  '/': { title: 'OpenWorkflow Platform', description: 'Build, deploy, and monitor AI-powered workflows' },
  '/dashboard': { title: 'AI Employee Dashboard', description: 'Real-time performance metrics' },
  '/analytics': { title: 'Workflow Analytics', description: 'Cost, performance, and ROI across all AI employees' },
  '/integrations': { title: 'Integrations', description: 'Connect your tools to power your AI employees' },
  '/memory': { title: 'Agent Memory Layer', description: 'Customer context & knowledge management' },
  '/deployments': { title: 'Deployments', description: 'Manage workflow deployments across environments' },
  '/testing': { title: 'Testing', description: 'Workflow test runner and assertions' },
  '/observability': { title: 'Observability', description: 'Traces, logs, and platform metrics' },
  '/plugins': { title: 'Plugins', description: 'Extend OpenWorkflow with custom plugins' },
  '/audit': { title: 'Audit Trail', description: 'Complete history of all actions' },
  '/settings': { title: 'Settings', description: 'Manage your account and preferences' },
}

// ─── Routes that should NOT use AppLayout ───────────

export const EXCLUDED_ROUTES = ['/builder', '/demo', '/login', '/register']

// ─── Sidebar Component ──────────────────────────────

interface AppSidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function AppSidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }: AppSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-zinc-800">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shrink-0">
          <Zap className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">OpenWorkflow</h1>
            <p className="text-[10px] text-zinc-500">AI Workflow Platform</p>
          </div>
        )}
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
                <Icon className={`h-4 w-4 shrink-0 ${active ? item.color : item.color}`} />
                {!collapsed && <span>{item.label}</span>}
                {collapsed && (
                  <span className="sr-only">{item.label}</span>
                )}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

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
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
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
          </aside>
        </div>
      )}
    </>
  )
}

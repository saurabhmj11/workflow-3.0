import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<string, { status: string; latency?: number; error?: string; count?: number; heapUsedMb?: number; heapTotalMb?: number; rssMb?: number; seconds?: number }> = {}
  let overallStatus = 'healthy'
  const startTime = Date.now()

  // Database check
  try {
    const dbStart = Date.now()
    await db.$queryRaw`SELECT 1`
    checks.database = { status: 'healthy', latency: Date.now() - dbStart }
  } catch (err) {
    checks.database = { status: 'unhealthy', error: err instanceof Error ? err.message : 'Unknown' }
    overallStatus = 'degraded'
  }

  // Trigger system check — scheduler
  try {
    const { isSchedulerRunning } = await import('@/lib/scheduler')
    checks.scheduler = { status: isSchedulerRunning() ? 'running' : 'stopped' }
  } catch {
    checks.scheduler = { status: 'not_loaded' }
  }

  // Email listener check
  try {
    const { getActiveEmailListeners } = await import('@/lib/email-listener')
    const listeners = getActiveEmailListeners()
    checks.emailListeners = { status: listeners.length > 0 ? 'active' : 'none', count: listeners.length }
  } catch {
    checks.emailListeners = { status: 'not_loaded' }
  }

  // Memory usage
  const mem = process.memoryUsage()
  checks.memory = {
    status: mem.heapUsed < 500 * 1024 * 1024 ? 'healthy' : 'warning',
    heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
    rssMb: Math.round(mem.rss / 1024 / 1024),
  }

  // Uptime
  checks.uptime = {
    status: 'healthy',
    seconds: Math.round(process.uptime()),
  }

  const totalLatency = Date.now() - startTime

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    latency: totalLatency,
    version: process.env.npm_package_version || '0.2.0',
    checks,
  }, { status: overallStatus === 'healthy' ? 200 : 503 })
}

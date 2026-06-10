// ─── Schedule/Cron Engine ────────────────────────
// In-memory cron scheduler that runs in the Next.js server process.
// Uses node-cron for lightweight cron expression parsing.
// Controlled via TRIGGERS_ENABLED env var to avoid auto-start in dev.

import cron from 'node-cron'
import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'

const log = createLogger('Scheduler')

// ─── Types ──────────────────────────────────────

interface ScheduledJob {
  id: string // scheduleTrigger.id
  workflowId: string
  cronExpression: string
  timezone: string
  task: cron.ScheduledTask | null
}

// ─── State ──────────────────────────────────────

const jobs = new Map<string, ScheduledJob>()
let isRunning = false

// ─── Execute Workflow from Trigger ──────────────

async function executeTriggeredWorkflow(
  workflowId: string,
  scheduleId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const startTime = Date.now()
  let status = 'success'
  let error: string | undefined

  try {
    // Look up the workflow with its nodes and edges
    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
      include: { nodes: true, edges: true },
    })

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`)
    }

    if (workflow.nodes.length === 0) {
      throw new Error(`Workflow ${workflowId} has no nodes`)
    }

    // Create an execution record
    const runId = `run_sched_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

    await db.execution.create({
      data: {
        workflowId,
        runId,
        status: 'running',
        triggeredBy: 'schedule',
        input: JSON.stringify(payload),
        steps: '[]',
        totalDurationMs: 0,
        totalCostUsd: 0,
      },
    })

    // For schedule triggers, we create the execution record in DB.
    // The actual workflow execution happens client-side when the user views it.
    // Here we mark it as "triggered" and the UI can pick it up.
    log.info({ workflowId, scheduleId, runId }, 'Triggered workflow via schedule')

    // Update the schedule trigger stats
    await db.scheduleTrigger.update({
      where: { id: scheduleId },
      data: {
        lastTriggeredAt: new Date(),
        triggerCount: { increment: 1 },
      },
    })
  } catch (err) {
    status = 'error'
    error = err instanceof Error ? err.message : 'Unknown error'
    log.error({ err: error, workflowId }, 'Failed to trigger workflow')
  } finally {
    const duration = Date.now() - startTime

    // Log the trigger call
    try {
      await db.triggerLog.create({
        data: {
          triggerType: 'schedule',
          triggerId: scheduleId,
          workflowId,
          payload: JSON.stringify(payload),
          status,
          error,
          duration,
        },
      })
    } catch (logErr) {
      log.error({ err: logErr }, 'Failed to write trigger log')
    }
  }
}

// ─── Public API ─────────────────────────────────

/**
 * Start all active schedule triggers from the database.
 * Called on server boot (if TRIGGERS_ENABLED=true).
 */
export async function startScheduler(): Promise<void> {
  if (isRunning) {
    log.info('Already running, skipping start')
    return
  }

  log.info('Starting cron engine...')

  try {
    const activeSchedules = await db.scheduleTrigger.findMany({
      where: { isActive: true },
    })

    for (const schedule of activeSchedules) {
      addScheduleJob(schedule.id, schedule.workflowId, schedule.cronExpression, schedule.timezone)
    }

    isRunning = true
    log.info({ count: activeSchedules.length }, 'Started with active schedules')
  } catch (err) {
    log.error({ err }, 'Failed to start')
  }
}

/**
 * Gracefully stop all scheduled jobs.
 */
export function stopScheduler(): void {
  log.info('Stopping all jobs...')
  for (const [id, job] of jobs) {
    if (job.task) {
      job.task.stop()
    }
    jobs.delete(id)
  }
  isRunning = false
  log.info('All jobs stopped')
}

/**
 * Add a new cron job to the scheduler.
 * Validates the cron expression before adding.
 */
export function addScheduleJob(
  scheduleId: string,
  workflowId: string,
  cronExpression: string,
  timezone: string = 'UTC'
): boolean {
  // Remove existing job if it exists
  removeScheduleJob(scheduleId)

  // Validate cron expression
  if (!cron.validate(cronExpression)) {
    log.error({ cronExpression }, 'Invalid cron expression')
    return false
  }

  try {
    const task = cron.schedule(
      cronExpression,
      () => {
        const payload = {
          triggerType: 'schedule',
          scheduleId,
          workflowId,
          timestamp: new Date().toISOString(),
          cronExpression,
        }
        executeTriggeredWorkflow(workflowId, scheduleId, payload).catch((err) => {
          log.error({ err, workflowId }, 'Error executing scheduled workflow')
        })
      },
      {
        scheduled: true,
        timezone: timezone !== 'UTC' ? timezone : undefined,
      }
    )

    jobs.set(scheduleId, {
      id: scheduleId,
      workflowId,
      cronExpression,
      timezone,
      task,
    })

    log.info({ scheduleId, cronExpression, timezone, workflowId }, 'Added job')
    return true
  } catch (err) {
    log.error({ err, scheduleId }, 'Failed to add job')
    return false
  }
}

/**
 * Remove a cron job from the scheduler.
 */
export function removeScheduleJob(scheduleId: string): void {
  const job = jobs.get(scheduleId)
  if (job) {
    if (job.task) {
      job.task.stop()
    }
    jobs.delete(scheduleId)
    log.info({ scheduleId }, 'Removed job')
  }
}

/**
 * Get all currently scheduled jobs (for debugging/monitoring).
 */
export function getScheduledJobs(): Array<{
  id: string
  workflowId: string
  cronExpression: string
  timezone: string
}> {
  return Array.from(jobs.values()).map(({ id, workflowId, cronExpression, timezone }) => ({
    id,
    workflowId,
    cronExpression,
    timezone,
  }))
}

/**
 * Check if the scheduler is currently running.
 */
export function isSchedulerRunning(): boolean {
  return isRunning
}

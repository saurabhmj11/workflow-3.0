// ─── Cron Scheduler Tests ─────────────────────────
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Use vi.hoisted so the mocks are available when vi.mock factories are executed (they are hoisted)
const { mockValidate, mockSchedule, mockTaskStop } = vi.hoisted(() => ({
  mockValidate: vi.fn(),
  mockSchedule: vi.fn(),
  mockTaskStop: vi.fn(),
}))

vi.mock('node-cron', () => ({
  default: {
    validate: mockValidate,
    schedule: mockSchedule,
  },
}))

// Mock Prisma DB
vi.mock('@/lib/db', () => ({
  db: {
    scheduleTrigger: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    workflow: {
      findUnique: vi.fn(),
    },
    execution: {
      create: vi.fn(),
    },
    triggerLog: {
      create: vi.fn(),
    },
  },
}))

import {
  addScheduleJob,
  removeScheduleJob,
  getScheduledJobs,
  startScheduler,
  stopScheduler,
  isSchedulerRunning,
} from '@/lib/scheduler'

describe('Scheduler', () => {
  beforeEach(() => {
    // Stop any running scheduler and clear jobs
    stopScheduler()

    // Reset all mocks (including pending return value queues)
    vi.resetAllMocks()

    // Default: cron.validate returns true (valid expression)
    mockValidate.mockReturnValue(true)

    // Default: cron.schedule returns a mock task with a stop method
    mockSchedule.mockReturnValue({ stop: mockTaskStop })
  })

  afterEach(() => {
    stopScheduler()
  })

  // ─── addScheduleJob ────────────────────────────

  describe('addScheduleJob', () => {
    it('should add a cron job with a valid expression', () => {
      const result = addScheduleJob('sched-1', 'wf-1', '*/5 * * * *', 'UTC')
      expect(result).toBe(true)
      expect(mockValidate).toHaveBeenCalledWith('*/5 * * * *')
      expect(mockSchedule).toHaveBeenCalledWith(
        '*/5 * * * *',
        expect.any(Function),
        expect.objectContaining({ scheduled: true })
      )
    })

    it('should return false for an invalid cron expression', () => {
      mockValidate.mockReturnValue(false)
      const result = addScheduleJob('sched-2', 'wf-2', 'invalid-cron')
      expect(result).toBe(false)
      expect(mockSchedule).not.toHaveBeenCalled()
    })

    it('should use UTC as default timezone when not specified', () => {
      addScheduleJob('sched-3', 'wf-3', '0 * * * *')
      expect(mockSchedule).toHaveBeenCalledWith(
        '0 * * * *',
        expect.any(Function),
        expect.objectContaining({ scheduled: true, timezone: undefined })
      )
    })

    it('should pass timezone to cron.schedule when not UTC', () => {
      addScheduleJob('sched-4', 'wf-4', '0 * * * *', 'America/New_York')
      expect(mockSchedule).toHaveBeenCalledWith(
        '0 * * * *',
        expect.any(Function),
        expect.objectContaining({ scheduled: true, timezone: 'America/New_York' })
      )
    })

    it('should replace existing job with same scheduleId', () => {
      addScheduleJob('sched-5', 'wf-5', '*/5 * * * *')
      expect(getScheduledJobs()).toHaveLength(1)

      // Add same id again — should replace
      addScheduleJob('sched-5', 'wf-5-updated', '*/10 * * * *')
      expect(getScheduledJobs()).toHaveLength(1)
      expect(getScheduledJobs()[0].cronExpression).toBe('*/10 * * * *')
      expect(mockTaskStop).toHaveBeenCalled()
    })

    it('should return false when cron.schedule throws', () => {
      mockSchedule.mockImplementation(() => {
        throw new Error('Schedule failed')
      })
      const result = addScheduleJob('sched-6', 'wf-6', '*/5 * * * *')
      expect(result).toBe(false)
    })

    it('should track the job with correct metadata', () => {
      addScheduleJob('sched-7', 'wf-7', '0 9 * * 1-5', 'Europe/London')
      const jobs = getScheduledJobs()
      expect(jobs).toHaveLength(1)
      expect(jobs[0]).toEqual({
        id: 'sched-7',
        workflowId: 'wf-7',
        cronExpression: '0 9 * * 1-5',
        timezone: 'Europe/London',
      })
    })

    it('should add multiple different jobs', () => {
      addScheduleJob('sched-a', 'wf-a', '*/5 * * * *')
      addScheduleJob('sched-b', 'wf-b', '0 * * * *')
      addScheduleJob('sched-c', 'wf-c', '0 0 * * *')
      expect(getScheduledJobs()).toHaveLength(3)
    })
  })

  // ─── removeScheduleJob ─────────────────────────

  describe('removeScheduleJob', () => {
    it('should remove an existing job', () => {
      addScheduleJob('sched-r1', 'wf-r1', '*/5 * * * *')
      expect(getScheduledJobs()).toHaveLength(1)

      removeScheduleJob('sched-r1')
      expect(getScheduledJobs()).toHaveLength(0)
    })

    it('should stop the task when removing a job', () => {
      addScheduleJob('sched-r2', 'wf-r2', '*/5 * * * *')
      removeScheduleJob('sched-r2')
      expect(mockTaskStop).toHaveBeenCalled()
    })

    it('should not throw when removing a non-existent job', () => {
      expect(() => removeScheduleJob('non-existent')).not.toThrow()
    })
  })

  // ─── getScheduledJobs ──────────────────────────

  describe('getScheduledJobs', () => {
    it('should return empty array when no jobs are scheduled', () => {
      expect(getScheduledJobs()).toEqual([])
    })

    it('should return all scheduled jobs', () => {
      addScheduleJob('j1', 'w1', '*/5 * * * *')
      addScheduleJob('j2', 'w2', '0 * * * *')
      const jobs = getScheduledJobs()
      expect(jobs).toHaveLength(2)
      expect(jobs.map((j) => j.id)).toContain('j1')
      expect(jobs.map((j) => j.id)).toContain('j2')
    })

    it('should not include the task object in returned jobs', () => {
      addScheduleJob('j3', 'w3', '*/5 * * * *')
      const jobs = getScheduledJobs()
      // The returned object should have specific keys, no `task`
      expect(Object.keys(jobs[0])).toEqual(['id', 'workflowId', 'cronExpression', 'timezone'])
    })
  })

  // ─── startScheduler ────────────────────────────

  describe('startScheduler', () => {
    it('should load active schedules from DB and add them as jobs', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.scheduleTrigger.findMany).mockResolvedValueOnce([
        { id: 'db-1', workflowId: 'wf-db1', cronExpression: '*/10 * * * *', timezone: 'UTC', isActive: true },
        { id: 'db-2', workflowId: 'wf-db2', cronExpression: '0 * * * *', timezone: 'America/Chicago', isActive: true },
      ] as never)

      await startScheduler()

      expect(db.scheduleTrigger.findMany).toHaveBeenCalledWith({ where: { isActive: true } })
      expect(getScheduledJobs()).toHaveLength(2)
      expect(isSchedulerRunning()).toBe(true)
    })

    it('should not start again if already running', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.scheduleTrigger.findMany).mockResolvedValueOnce([] as never)

      await startScheduler()
      expect(isSchedulerRunning()).toBe(true)

      // Reset call count
      vi.mocked(db.scheduleTrigger.findMany).mockClear()
      vi.mocked(db.scheduleTrigger.findMany).mockResolvedValueOnce([
        { id: 'db-3', workflowId: 'wf-db3', cronExpression: '*/5 * * * *', timezone: 'UTC', isActive: true },
      ] as never)

      await startScheduler()
      // Should not have queried DB again
      expect(db.scheduleTrigger.findMany).not.toHaveBeenCalled()
    })

    it('should handle DB errors gracefully', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.scheduleTrigger.findMany).mockRejectedValueOnce(new Error('DB down'))

      await startScheduler()
      expect(isSchedulerRunning()).toBe(false)
    })

    it('should start with zero schedules if DB returns empty', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.scheduleTrigger.findMany).mockResolvedValueOnce([] as never)

      await startScheduler()
      expect(getScheduledJobs()).toHaveLength(0)
      expect(isSchedulerRunning()).toBe(true)
    })
  })

  // ─── stopScheduler ─────────────────────────────

  describe('stopScheduler', () => {
    it('should stop all jobs and clear the job list', () => {
      addScheduleJob('s1', 'w1', '*/5 * * * *')
      addScheduleJob('s2', 'w2', '0 * * * *')
      expect(getScheduledJobs()).toHaveLength(2)

      stopScheduler()
      expect(getScheduledJobs()).toHaveLength(0)
      expect(isSchedulerRunning()).toBe(false)
    })

    it('should stop each task individually', () => {
      addScheduleJob('s3', 'w3', '*/5 * * * *')
      addScheduleJob('s4', 'w4', '0 * * * *')

      stopScheduler()
      // Each addScheduleJob creates a mock task with stop, and stopScheduler calls stop on each
      expect(mockTaskStop).toHaveBeenCalled()
    })

    it('should not throw when called with no jobs', () => {
      expect(() => stopScheduler()).not.toThrow()
    })
  })

  // ─── isSchedulerRunning ────────────────────────

  describe('isSchedulerRunning', () => {
    it('should return false initially', () => {
      expect(isSchedulerRunning()).toBe(false)
    })

    it('should return true after starting', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.scheduleTrigger.findMany).mockResolvedValueOnce([] as never)
      await startScheduler()
      expect(isSchedulerRunning()).toBe(true)
    })

    it('should return false after stopping', async () => {
      const { db } = await import('@/lib/db')
      vi.mocked(db.scheduleTrigger.findMany).mockResolvedValueOnce([] as never)
      await startScheduler()
      stopScheduler()
      expect(isSchedulerRunning()).toBe(false)
    })
  })

  // ─── Cron expression validation ────────────────

  describe('cron expression validation', () => {
    it('should validate expressions via node-cron.validate', () => {
      addScheduleJob('v1', 'w1', '* * * * *')
      expect(mockValidate).toHaveBeenCalledWith('* * * * *')
    })

    it('should reject when validate returns false', () => {
      mockValidate.mockReturnValue(false)
      expect(addScheduleJob('v2', 'w2', 'bad expression')).toBe(false)
    })

    it('should accept when validate returns true', () => {
      mockValidate.mockReturnValue(true)
      expect(addScheduleJob('v3', 'w3', '0 0 * * *')).toBe(true)
    })
  })
})

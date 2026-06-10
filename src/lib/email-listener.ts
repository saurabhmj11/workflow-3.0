// ─── Email Trigger Listener ─────────────────────
// IMAP-based email listener that polls for new emails.
// When a new email arrives, triggers the associated workflow.
// Uses imapflow for real IMAP connectivity with graceful fallback.

import { db } from '@/lib/db'
import crypto from 'crypto'
import { createLogger } from '@/lib/logger'

const log = createLogger('EmailListener')

// ─── Types ──────────────────────────────────────

export interface EmailListenerConfig {
  id: string // emailTrigger.id
  host: string
  port: number
  username: string
  password: string
  mailbox: string
  pollInterval: number // seconds
  workflowId: string
}

interface ParsedEmail {
  from: string
  to: string
  subject: string
  body: string
  date: string
  messageId?: string
  headers?: Record<string, string>
}

interface ActiveListener {
  config: EmailListenerConfig
  interval: ReturnType<typeof setInterval> | null
  lastSeenIds: Set<string>
  isRunning: boolean
}

// ─── Simple encryption for passwords ────────────

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'openworkflow-default-key-change-in-production-32bytes'

export function encryptPassword(text: string): string {
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  } catch {
    // Fallback: store as base64 (not ideal but functional)
    return Buffer.from(text).toString('base64')
  }
}

export function decryptPassword(encrypted: string): string {
  try {
    const parts = encrypted.split(':')
    if (parts.length !== 2) {
      // Assume base64 fallback
      return Buffer.from(encrypted, 'base64').toString('utf8')
    }
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    const iv = Buffer.from(parts[0], 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(parts[1], 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    // Fallback: try base64
    try {
      return Buffer.from(encrypted, 'base64').toString('utf8')
    } catch {
      return encrypted
    }
  }
}

// ─── State ──────────────────────────────────────

const listeners = new Map<string, ActiveListener>()

// ─── IMAP Connection with imapflow ──────────────

// Track whether imapflow is available at runtime
let imapflowAvailable: boolean | null = null
let ImapFlowClass: typeof import('imapflow').ImapFlow | null = null

async function getImapFlow(): Promise<typeof import('imapflow').ImapFlow | null> {
  if (imapflowAvailable !== null) {
    return ImapFlowClass
  }
  try {
    const mod = await import('imapflow')
    ImapFlowClass = mod.ImapFlow
    imapflowAvailable = true
    log.info('imapflow library loaded successfully')
    return ImapFlowClass
  } catch (err) {
    imapflowAvailable = false
    ImapFlowClass = null
    log.warn({ err }, 'imapflow library not available, falling back to stub mode')
    return null
  }
}

// ─── MIME Body Extraction ───────────────────────

function extractPlainText(mimeSource: string): string {
  // Simple extraction of text/plain part from MIME source
  // For production, consider using a proper MIME parser like postal-mime

  // Try to find text/plain content
  const textMatch = mimeSource.match(/Content-Type:\s*text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?=\r?\n--|\r?\nContent-Type:|$)/i)
  if (textMatch) {
    let text = textMatch[1]
    // Remove quoted-printable encoding
    text = text.replace(/=\r?\n/g, '')
    text = text.replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    return text.trim()
  }

  // Fallback: try base64 content
  const base64Match = mimeSource.match(/Content-Transfer-Encoding:\s*base64[\s\S]*?\r?\n\r?\n([\s\S]*?)(?=\r?\n--|\r?\nContent-Type:|$)/i)
  if (base64Match) {
    try {
      return Buffer.from(base64Match[1].trim(), 'base64').toString('utf-8').trim()
    } catch {
      // Ignore decode errors
    }
  }

  // Last resort: return raw source (truncated)
  return mimeSource.slice(0, 2000)
}

// ─── Fetch New Emails ───────────────────────────

async function fetchNewEmails(config: EmailListenerConfig, lastSeenIds: Set<string>): Promise<ParsedEmail[]> {
  const ImapFlow = await getImapFlow()

  // If imapflow is not available, fall back to stub behavior
  if (!ImapFlow) {
    log.info({ username: config.username, host: config.host, port: config.port, mailbox: config.mailbox }, 'Polling (stub mode - imapflow unavailable)')
    return []
  }

  const emails: ParsedEmail[] = []

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.port === 993,
    auth: {
      user: config.username,
      pass: decryptPassword(config.password),
    },
    logger: false, // Don't log IMAP internals
    emitLogs: false,
  })

  try {
    log.info({ username: config.username, host: config.host, port: config.port }, 'Connecting to IMAP server...')

    // Connection with 10 second timeout
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout (10s)')), 10000)),
    ])

    log.info({ host: config.host, mailbox: config.mailbox }, 'Connected, locking mailbox')

    const lock = await client.getMailboxLock(config.mailbox)
    try {
      // Search for unread messages (last 50 max for safety)
      const messageCount = await client.messageSearch({ unseen: true })
      const messagesToFetch = messageCount.slice(0, 50)

      log.info({ unseen: messageCount.length, fetching: messagesToFetch.length }, 'Found unseen messages')

      if (messagesToFetch.length === 0) {
        return []
      }

      // Fetch messages
      for await (const message of client.fetch(messagesToFetch, {
        envelope: true,
        source: true,
      })) {
        const emailId = message.envelope?.messageId || `${message.uid}`

        // Skip already seen emails
        if (lastSeenIds.has(emailId)) continue

        const from = message.envelope?.from?.[0]
        const to = message.envelope?.to?.[0]

        // Parse source for body text
        const source = message.source?.toString('utf-8') || ''
        const body = extractPlainText(source)

        emails.push({
          from: from ? `${from.name || ''} <${from.address}>`.trim() : 'unknown',
          to: to?.address || config.username,
          subject: message.envelope?.subject || '(No Subject)',
          body: body.slice(0, 10000), // Limit body size
          date: message.envelope?.date?.toISOString() || new Date().toISOString(),
          messageId: emailId,
          headers: {
            messageId: message.envelope?.messageId || '',
            inReplyTo: message.envelope?.inReplyTo || '',
          },
        })
      }
    } finally {
      lock.release()
    }

    await client.logout()
    log.info({ count: emails.length, username: config.username, host: config.host }, 'Fetched new emails')
  } catch (err) {
    log.error({ err, username: config.username, host: config.host }, 'IMAP error')
    // Try to logout gracefully
    try {
      await client.logout()
    } catch {
      // Ignore logout errors
    }
  }

  return emails
}

// ─── Execute Workflow from Email Trigger ────────

async function executeEmailTriggeredWorkflow(
  workflowId: string,
  emailTriggerId: string,
  email: ParsedEmail
): Promise<void> {
  const startTime = Date.now()
  let status = 'success'
  let error: string | undefined

  try {
    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
      include: { nodes: true },
    })

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`)
    }

    const runId = `run_email_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

    const payload = {
      triggerType: 'email',
      emailTriggerId,
      workflowId,
      timestamp: new Date().toISOString(),
      email: {
        from: email.from,
        to: email.to,
        subject: email.subject,
        body: email.body,
        date: email.date,
      },
    }

    await db.execution.create({
      data: {
        workflowId,
        runId,
        status: 'running',
        triggeredBy: 'email',
        input: JSON.stringify(payload),
        steps: '[]',
        totalDurationMs: 0,
        totalCostUsd: 0,
      },
    })

    // Update the email trigger stats
    await db.emailTrigger.update({
      where: { id: emailTriggerId },
      data: {
        lastTriggeredAt: new Date(),
        triggerCount: { increment: 1 },
      },
    })

    log.info({ workflowId, emailFrom: email.from, runId }, 'Triggered workflow via email')
  } catch (err) {
    status = 'error'
    error = err instanceof Error ? err.message : 'Unknown error'
    log.error({ err: error, workflowId }, 'Failed to trigger workflow')
  } finally {
    const duration = Date.now() - startTime

    try {
      await db.triggerLog.create({
        data: {
          triggerType: 'email',
          triggerId: emailTriggerId,
          workflowId,
          payload: JSON.stringify({ from: email.from, subject: email.subject }),
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

// ─── Test IMAP Connection ───────────────────────

export async function testImapConnection(config: EmailListenerConfig): Promise<{ success: boolean; error?: string }> {
  const ImapFlow = await getImapFlow()

  if (!ImapFlow) {
    return { success: false, error: 'imapflow library is not available. Install it with: bun add imapflow' }
  }

  try {
    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.port === 993,
      auth: {
        user: config.username,
        pass: decryptPassword(config.password),
      },
      logger: false,
    })

    log.info({ username: config.username, host: config.host, port: config.port }, 'Testing IMAP connection...')

    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout (10s)')), 10000)),
    ])

    await client.logout()

    log.info({ host: config.host }, 'IMAP connection test succeeded')
    return { success: true }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    log.error({ err: errorMessage, host: config.host }, 'IMAP connection test failed')
    return { success: false, error: errorMessage }
  }
}

// ─── Public API ─────────────────────────────────

/**
 * Start an email listener for a specific trigger configuration.
 * Uses polling to check for new emails at the configured interval.
 */
export function startEmailListener(config: EmailListenerConfig): boolean {
  // Stop existing listener if it exists
  stopEmailListener(config.id)

  const listener: ActiveListener = {
    config,
    interval: null,
    lastSeenIds: new Set(),
    isRunning: true,
  }

  // Set up polling interval
  const intervalMs = config.pollInterval * 1000
  listener.interval = setInterval(async () => {
    if (!listener.isRunning) return

    try {
      const emails = await fetchNewEmails(config, listener.lastSeenIds)

      for (const email of emails) {
        const emailId = email.messageId || `${email.from}-${email.date}`
        if (!listener.lastSeenIds.has(emailId)) {
          listener.lastSeenIds.add(emailId)
          await executeEmailTriggeredWorkflow(config.workflowId, config.id, email)
        }
      }
    } catch (err) {
      log.error({ err, listenerId: config.id }, 'Error in polling loop')
    }
  }, intervalMs)

  listeners.set(config.id, listener)
  log.info({ username: config.username, host: config.host, pollInterval: config.pollInterval }, 'Started listener')

  return true
}

/**
 * Stop a specific email listener.
 */
export function stopEmailListener(triggerId: string): void {
  const listener = listeners.get(triggerId)
  if (listener) {
    listener.isRunning = false
    if (listener.interval) {
      clearInterval(listener.interval)
    }
    listeners.delete(triggerId)
    log.info({ triggerId }, 'Stopped listener')
  }
}

/**
 * Start all active email listeners from the database.
 * Called on server boot (if TRIGGERS_ENABLED=true).
 */
export async function startAllEmailListeners(): Promise<void> {
  try {
    const activeTriggers = await db.emailTrigger.findMany({
      where: { isActive: true },
    })

    for (const trigger of activeTriggers) {
      const config: EmailListenerConfig = {
        id: trigger.id,
        host: trigger.host,
        port: trigger.port,
        username: trigger.username,
        password: decryptPassword(trigger.password),
        mailbox: trigger.mailbox,
        pollInterval: trigger.pollInterval,
        workflowId: trigger.workflowId,
      }
      startEmailListener(config)
    }

    log.info({ count: activeTriggers.length }, 'Started active email listener(s)')
  } catch (err) {
    log.error({ err }, 'Failed to start email listeners')
  }
}

/**
 * Stop all email listeners.
 */
export function stopAllEmailListeners(): void {
  for (const [id] of listeners) {
    stopEmailListener(id)
  }
  log.info('All listeners stopped')
}

/**
 * Get all active email listeners (for debugging/monitoring).
 */
export function getActiveEmailListeners(): Array<{
  id: string
  host: string
  username: string
  mailbox: string
  pollInterval: number
  workflowId: string
}> {
  return Array.from(listeners.values()).map((l) => ({
    id: l.config.id,
    host: l.config.host,
    username: l.config.username,
    mailbox: l.config.mailbox,
    pollInterval: l.config.pollInterval,
    workflowId: l.config.workflowId,
  }))
}

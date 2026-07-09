// ─── Email Trigger API ─────────────────────────
// GET: List email trigger configurations
// POST: Configure an email trigger (IMAP settings + workflowId)
// PUT: Update email trigger settings
// DELETE: Remove email trigger

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'
import { encryptPassword, startEmailListener, stopEmailListener, testImapConnection } from '@/lib/email-listener'
import { auditLog, getRequestMeta, AUDIT_ACTIONS } from '@/lib/audit'
import type { EmailListenerConfig } from '@/lib/email-listener'

// ─── GET /api/triggers/email ────────────────────
// ?action=test — Test IMAP connection for a trigger
// (no action)   — List all email trigger configurations

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    // ── Test IMAP Connection ──
    if (action === 'test') {
      const triggerId = url.searchParams.get('id')
      const host = url.searchParams.get('host')
      const port = url.searchParams.get('port')
      const username = url.searchParams.get('username')
      const password = url.searchParams.get('password')
      const mailbox = url.searchParams.get('mailbox')

      let config: EmailListenerConfig

      // Option 1: Test by existing trigger ID — load config from DB
      if (triggerId) {
        const trigger = await db.emailTrigger.findUnique({ where: { id: triggerId } })
        if (!trigger) {
          return errorResponse('Email trigger not found', 404)
        }
        config = {
          id: trigger.id,
          host: trigger.host,
          port: trigger.port,
          username: trigger.username,
          password: trigger.password, // encrypted — testImapConnection will decrypt
          mailbox: trigger.mailbox,
          pollInterval: trigger.pollInterval,
          workflowId: trigger.workflowId,
        }
      } else if (host && username && password) {
        // Option 2: Test with provided credentials directly
        // Encrypt the plaintext password so testImapConnection can decrypt it correctly
        config = {
          id: 'test-connection',
          host,
          port: port ? parseInt(port, 10) : 993,
          username,
          password: encryptPassword(password),
          mailbox: mailbox || 'INBOX',
          pollInterval: 30,
          workflowId: 'test',
        }
      } else {
        return errorResponse('Provide either ?id=<triggerId> or ?host=...&username=...&password=... to test a connection', 400)
      }

      const result = await testImapConnection(config)
      return successResponse(result)
    }

    // ── List Triggers (default) ──
    const userId = await getCurrentUserId()

    const triggers = await db.emailTrigger.findMany({
      where: userId ? { workflow: { userId } } : undefined,
      include: {
        workflow: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = triggers.map((t) => ({
      id: t.id,
      workflowId: t.workflowId,
      workflowName: t.workflow.name,
      host: t.host,
      port: t.port,
      username: t.username,
      // Never return the password in the API response
      hasPassword: !!t.password,
      mailbox: t.mailbox,
      pollInterval: t.pollInterval,
      isActive: t.isActive,
      lastTriggeredAt: t.lastTriggeredAt?.toISOString() ?? null,
      triggerCount: t.triggerCount,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }))

    return successResponse(data)
  } catch (err) {
    console.error('[GET /api/triggers/email]', err)
    return errorResponse('Failed to list email triggers', 500)
  }
}

// ─── POST /api/triggers/email ───────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { workflowId, host, port, username, password, mailbox, pollInterval, isActive } = body

    if (!workflowId) {
      return errorResponse('workflowId is required', 400)
    }

    if (!host) {
      return errorResponse('host (IMAP server) is required', 400)
    }

    if (!username) {
      return errorResponse('username (email address) is required', 400)
    }

    if (!password) {
      return errorResponse('password is required', 400)
    }

    const userId = await getCurrentUserId()

    // Verify workflow exists
    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
    })

    if (!workflow) {
      return errorResponse('Workflow not found', 404)
    }

    if (userId && workflow.userId && workflow.userId !== userId) {
      return errorResponse('Workflow not found', 404)
    }

    // Encrypt the password before storing
    const encryptedPassword = encryptPassword(password)

    const trigger = await db.emailTrigger.create({
      data: {
        workflowId,
        host,
        port: port || 993,
        username,
        password: encryptedPassword,
        mailbox: mailbox || 'INBOX',
        pollInterval: pollInterval || 30,
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    // If active and triggers enabled, start the listener
    if (trigger.isActive && process.env.TRIGGERS_ENABLED === 'true') {
      startEmailListener({
        id: trigger.id,
        host: trigger.host,
        port: trigger.port,
        username: trigger.username,
        password, // Use the plaintext password for the listener
        mailbox: trigger.mailbox,
        pollInterval: trigger.pollInterval,
        workflowId: trigger.workflowId,
      })
    }

    // Audit log — fire-and-forget
    auditLog({
      userId: userId ?? undefined,
      action: AUDIT_ACTIONS.TRIGGER_CREATED,
      resource: 'trigger',
      resourceId: trigger.id,
      details: { triggerType: 'email', host, username, workflowId },
      ...getRequestMeta(request),
    }).catch(() => {})

    return successResponse({
      id: trigger.id,
      workflowId: trigger.workflowId,
      host: trigger.host,
      port: trigger.port,
      username: trigger.username,
      mailbox: trigger.mailbox,
      pollInterval: trigger.pollInterval,
      isActive: trigger.isActive,
      createdAt: trigger.createdAt.toISOString(),
    }, 201)
  } catch (err) {
    console.error('[POST /api/triggers/email]', err)
    return errorResponse('Failed to create email trigger', 500)
  }
}

// ─── PUT /api/triggers/email ────────────────────

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, host, port, username, password, mailbox, pollInterval, isActive } = body

    if (!id) {
      return errorResponse('id is required', 400)
    }

    const existing = await db.emailTrigger.findUnique({
      where: { id },
    })

    if (!existing) {
      return errorResponse('Email trigger not found', 404)
    }

    // Stop the existing listener
    stopEmailListener(id)

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (host !== undefined) updateData.host = host
    if (port !== undefined) updateData.port = port
    if (username !== undefined) updateData.username = username
    if (password !== undefined) updateData.password = encryptPassword(password)
    if (mailbox !== undefined) updateData.mailbox = mailbox
    if (pollInterval !== undefined) updateData.pollInterval = pollInterval
    if (isActive !== undefined) updateData.isActive = isActive

    const updated = await db.emailTrigger.update({
      where: { id },
      data: updateData,
    })

    // If still active, restart the listener
    if (updated.isActive && process.env.TRIGGERS_ENABLED === 'true') {
      // Need the decrypted password for the listener
      const listenerPassword = password || '' // If password wasn't updated, we can't start the listener properly
      if (listenerPassword) {
        startEmailListener({
          id: updated.id,
          host: updated.host,
          port: updated.port,
          username: updated.username,
          password: listenerPassword,
          mailbox: updated.mailbox,
          pollInterval: updated.pollInterval,
          workflowId: updated.workflowId,
        })
      }
    }

    return successResponse({
      id: updated.id,
      workflowId: updated.workflowId,
      host: updated.host,
      port: updated.port,
      username: updated.username,
      mailbox: updated.mailbox,
      pollInterval: updated.pollInterval,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (err) {
    console.error('[PUT /api/triggers/email]', err)
    return errorResponse('Failed to update email trigger', 500)
  }
}

// ─── DELETE /api/triggers/email ─────────────────

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return errorResponse('id query parameter is required', 400)
    }

    const existing = await db.emailTrigger.findUnique({
      where: { id },
    })

    if (!existing) {
      return errorResponse('Email trigger not found', 404)
    }

    // Stop the listener
    stopEmailListener(id)

    // Delete from database
    await db.emailTrigger.delete({
      where: { id },
    })

    // Audit log — fire-and-forget
    auditLog({
      action: AUDIT_ACTIONS.TRIGGER_DELETED,
      resource: 'trigger',
      resourceId: id,
      details: { triggerType: 'email' },
      ...getRequestMeta(request),
    }).catch(() => {})

    return successResponse({ deleted: true, id })
  } catch (err) {
    console.error('[DELETE /api/triggers/email]', err)
    return errorResponse('Failed to delete email trigger', 500)
  }
}

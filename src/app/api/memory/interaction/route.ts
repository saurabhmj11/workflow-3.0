import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'

// ─── POST /api/memory/interaction ────────────────
// Record a customer interaction (email, chat, ticket, call)
// Verifies customer belongs to current user if authenticated (multi-tenancy)

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await request.json()
    const { customerId, type, subject, content, sentiment, confidence, status, priority, assignee, resolution, tags, metadata } = body

    if (!customerId || !type || !content) {
      return errorResponse('customerId, type, and content are required', 400)
    }

    // Verify customer exists and belongs to user if authenticated
    if (userId) {
      const customer = await db.customerProfile.findFirst({
        where: { id: customerId, userId },
      })
      if (!customer) {
        return errorResponse('Customer not found', 404)
      }
    }

    const interaction = await db.interaction.create({
      data: {
        customerId,
        type,
        subject: subject ?? null,
        content,
        sentiment: sentiment ?? null,
        confidence: confidence ?? null,
        status: status ?? 'new',
        priority: priority ?? 'normal',
        assignee: assignee ?? null,
        resolution: resolution ?? null,
        tags: tags ? JSON.stringify(tags) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })

    return successResponse({
      id: interaction.id,
      type: interaction.type,
      status: interaction.status,
      createdAt: interaction.createdAt.toISOString(),
    })
  } catch (err) {
    console.error('[POST /api/memory/interaction]', err)
    return errorResponse('Failed to record interaction', 500)
  }
}

// ─── GET /api/memory/interaction ─────────────────
// List interactions for a customer
// Scoped to current user's customers if authenticated (multi-tenancy)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const userId = await getCurrentUserId()

    if (!customerId) {
      return errorResponse('customerId parameter is required', 400)
    }

    // If authenticated, verify customer belongs to user
    if (userId) {
      const customer = await db.customerProfile.findFirst({
        where: { id: customerId, userId },
      })
      if (!customer) {
        return errorResponse('Customer not found', 404)
      }
    }

    const interactions = await db.interaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return successResponse(interactions.map(i => ({
      id: i.id,
      type: i.type,
      subject: i.subject,
      summary: i.summary,
      sentiment: i.sentiment,
      status: i.status,
      priority: i.priority,
      assignee: i.assignee,
      createdAt: i.createdAt.toISOString(),
      resolvedAt: i.resolvedAt?.toISOString() ?? null,
    })))
  } catch (err) {
    console.error('[GET /api/memory/interaction]', err)
    return errorResponse('Failed to fetch interactions', 500)
  }
}

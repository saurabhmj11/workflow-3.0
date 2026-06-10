import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'

// ─── GET /api/memory/notes ───────────────────────
// List memory notes for a customer (or all notes)
// Scoped to current user's customers if authenticated (multi-tenancy)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const category = searchParams.get('category')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const userId = await getCurrentUserId()

    const where: any = { isActive: true }
    if (customerId) where.customerId = customerId
    if (category) where.category = category
    if (userId) where.customer = { userId }

    const notes = await db.memoryNote.findMany({
      where,
      include: {
        customer: {
          select: { email: true, name: true, tier: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return successResponse(notes.map(n => ({
      id: n.id,
      customerId: n.customerId,
      customerEmail: n.customer.email,
      customerName: n.customer.name,
      customerTier: n.customer.tier,
      category: n.category,
      content: n.content,
      source: n.source,
      sourceId: n.sourceId,
      confidence: n.confidence,
      tags: n.tags ? JSON.parse(n.tags) : [],
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    })))
  } catch (err) {
    console.error('[GET /api/memory/notes]', err)
    return errorResponse('Failed to fetch memory notes', 500)
  }
}

// ─── POST /api/memory/notes ──────────────────────
// Create a memory note (manual or AI-extracted)
// Verifies customer belongs to current user if authenticated (multi-tenancy)

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await request.json()
    const { customerId, category, content, source, sourceId, confidence, tags } = body

    if (!customerId || !content) {
      return errorResponse('customerId and content are required', 400)
    }

    // Verify customer exists and belongs to user
    const customer = await db.customerProfile.findUnique({
      where: {
        id: customerId,
        ...(userId ? { userId } : {}),
      },
    })
    if (!customer) {
      return errorResponse('Customer not found', 404)
    }

    const note = await db.memoryNote.create({
      data: {
        customerId,
        category: category || 'fact',
        content,
        source: source || 'manual',
        sourceId: sourceId || null,
        confidence: confidence ?? 1.0,
        tags: tags ? JSON.stringify(tags) : null,
      },
    })

    return successResponse({
      id: note.id,
      customerId: note.customerId,
      category: note.category,
      content: note.content,
      source: note.source,
      confidence: note.confidence,
      createdAt: note.createdAt.toISOString(),
    })
  } catch (err) {
    console.error('[POST /api/memory/notes]', err)
    return errorResponse('Failed to create memory note', 500)
  }
}

// ─── DELETE /api/memory/notes ────────────────────
// Soft-delete a memory note (set isActive = false)
// Verifies note belongs to current user's customer if authenticated (multi-tenancy)

export async function DELETE(request: Request) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('id parameter is required', 400)
    }

    // If authenticated, verify the note belongs to user's customer
    if (userId) {
      const note = await db.memoryNote.findUnique({
        where: { id },
        include: { customer: { select: { userId: true } } },
      })
      if (!note || note.customer.userId !== userId) {
        return errorResponse('Memory note not found', 404)
      }
    }

    const note = await db.memoryNote.update({
      where: { id },
      data: { isActive: false },
    })

    return successResponse({ id: note.id, deactivated: true })
  } catch (err) {
    console.error('[DELETE /api/memory/notes]', err)
    return errorResponse('Failed to deactivate memory note', 500)
  }
}

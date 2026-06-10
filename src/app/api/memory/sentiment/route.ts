import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'

// ─── POST /api/memory/sentiment ──────────────────
// Record a sentiment log for a customer
// Verifies customer belongs to current user if authenticated (multi-tenancy)

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await request.json()
    const { customerId, source, sentiment, score, confidence } = body

    if (!customerId || !sentiment || score === undefined) {
      return errorResponse('customerId, sentiment, and score are required', 400)
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

    const log = await db.sentimentLog.create({
      data: {
        customerId,
        source: source ?? 'manual',
        sentiment,
        score: Math.max(-1, Math.min(1, score)),
        confidence: confidence ?? 0.5,
      },
    })

    return successResponse({
      id: log.id,
      sentiment: log.sentiment,
      score: log.score,
      createdAt: log.createdAt.toISOString(),
    })
  } catch (err) {
    console.error('[POST /api/memory/sentiment]', err)
    return errorResponse('Failed to record sentiment', 500)
  }
}

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'

// ─── GET /api/memory/customer ────────────────────
// Fetch customer context with recent interactions and sentiment
// Scoped to current user if authenticated (multi-tenancy)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const userId = await getCurrentUserId()

    if (!email) {
      return errorResponse('email parameter is required', 400)
    }

    const customer = await db.customerProfile.findUnique({
      where: {
        email,
        ...(userId ? { userId } : {}),
      },
      include: {
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        sentimentLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!customer) {
      return successResponse(null)
    }

    // Compute context
    const openTickets = customer.interactions.filter(i => i.status === 'new' || i.status === 'in_progress' || i.status === 'escalated').length
    const sentimentScores = customer.sentimentLogs.map(s => s.score)
    const avgSentimentScore = sentimentScores.length > 0
      ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
      : 0

    const recentScores = sentimentScores.slice(0, 5)
    const olderScores = sentimentScores.slice(5, 10)
    const recentAvg = recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : 0
    const olderAvg = olderScores.length > 0 ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length : 0

    const sentimentTrend = Math.abs(recentAvg - olderAvg) < 0.1 ? 'stable'
      : recentAvg > olderAvg ? 'improving' : 'declining'

    const lastInteraction = customer.interactions[0]
    const lastInteractionDays = lastInteraction
      ? Math.floor((Date.now() - new Date(lastInteraction.createdAt).getTime()) / 86400000)
      : null

    const allTags = customer.interactions.flatMap(i => {
      try { return JSON.parse(i.tags ?? '[]') as string[] } catch { return [] }
    })
    const uniqueTags = [...new Set(allTags)]

    const metadata = customer.metadata ? JSON.parse(customer.metadata) : {}

    const context = {
      email: customer.email,
      name: customer.name,
      company: customer.company,
      tier: customer.tier,
      recentInteractions: customer.interactions.map(i => ({
        id: i.id,
        type: i.type,
        subject: i.subject,
        summary: i.summary,
        sentiment: i.sentiment,
        status: i.status,
        priority: i.priority,
        createdAt: i.createdAt.toISOString(),
        resolvedAt: i.resolvedAt?.toISOString() ?? null,
      })),
      sentimentTrend,
      avgSentimentScore,
      totalInteractions: customer.interactions.length,
      openTickets,
      lastInteractionDays,
      tags: uniqueTags,
      metadata,
    }

    return successResponse(context)
  } catch (err) {
    console.error('[GET /api/memory/customer]', err)
    return errorResponse('Failed to fetch customer context', 500)
  }
}

// ─── POST /api/memory/customer ───────────────────
// Create or update a customer profile
// Associates with current user if authenticated (multi-tenancy)

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await request.json()
    const { email, name, company, tier, metadata } = body

    if (!email) {
      return errorResponse('email is required', 400)
    }

    const customer = await db.customerProfile.upsert({
      where: { email },
      create: {
        email,
        name: name ?? null,
        company: company ?? null,
        tier: tier ?? 'free',
        metadata: metadata ? JSON.stringify(metadata) : null,
        userId: userId ?? undefined,
      },
      update: {
        ...(name !== undefined && { name }),
        ...(company !== undefined && { company }),
        ...(tier !== undefined && { tier }),
        ...(metadata !== undefined && { metadata: JSON.stringify(metadata) }),
      },
    })

    return successResponse({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      company: customer.company,
      tier: customer.tier,
    })
  } catch (err) {
    console.error('[POST /api/memory/customer]', err)
    return errorResponse('Failed to upsert customer', 500)
  }
}

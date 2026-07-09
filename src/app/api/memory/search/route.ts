import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'

// ─── GET /api/memory/search ──────────────────────
// Search across all customers by name, email, company, tags, or notes
// Scoped to current user's customers if authenticated (multi-tenancy)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()
    const tier = searchParams.get('tier')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const userId = await getCurrentUserId()

    if (!query && !tier) {
      return errorResponse('q or tier parameter is required', 400)
    }

    // Build where clause
    const where: any = {}

    // Scope to user's customers if authenticated
    if (userId) {
      where.userId = userId
    }

    if (tier) {
      where.tier = tier
    }

    if (query) {
      where.OR = [
        { email: { contains: query } },
        { name: { contains: query } },
        { company: { contains: query } },
      ]
    }

    const [customers, total] = await Promise.all([
      db.customerProfile.findMany({
        where,
        include: {
          interactions: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
          sentimentLogs: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          memoryNotes: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.customerProfile.count({ where }),
    ])

    // Compute summary for each customer
    const results = customers.map(customer => {
      const openTickets = customer.interactions.filter(
        i => i.status === 'new' || i.status === 'in_progress' || i.status === 'escalated'
      ).length
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

      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        company: customer.company,
        tier: customer.tier,
        avatarUrl: customer.avatarUrl,
        totalInteractions: customer.interactions.length,
        openTickets,
        avgSentimentScore,
        sentimentTrend,
        memoryNotesCount: customer.memoryNotes.length,
        recentNotes: customer.memoryNotes.map(n => ({
          id: n.id,
          category: n.category,
          content: n.content,
          confidence: n.confidence,
          createdAt: n.createdAt.toISOString(),
        })),
        lastInteractionAt: customer.interactions[0]?.createdAt?.toISOString() ?? null,
        createdAt: customer.createdAt.toISOString(),
      }
    })

    return successResponse({ results, total, limit, offset })
  } catch (err) {
    console.error('[GET /api/memory/search]', err)
    return errorResponse('Failed to search customers', 500)
  }
}

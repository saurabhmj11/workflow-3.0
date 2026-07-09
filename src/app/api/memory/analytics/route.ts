import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'

// ─── GET /api/memory/analytics ───────────────────
// Return memory layer analytics: customer stats, sentiment distribution, activity metrics
// Scoped to current user's data if authenticated (multi-tenancy)

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId()

    // Base customer filter for multi-tenancy
    const customerFilter = userId ? { userId } : {}

    // Total customers
    const totalCustomers = await db.customerProfile.count({ where: customerFilter })

    // Customers by tier
    const customersByTier = await db.customerProfile.groupBy({
      by: ['tier'],
      _count: { id: true },
      where: customerFilter,
    })

    // Total interactions (through user's customers)
    const totalInteractions = await db.interaction.count({
      where: userId ? { customer: { userId } } : {},
    })

    // Interactions by type
    const interactionsByType = await db.interaction.groupBy({
      by: ['type'],
      _count: { id: true },
      where: userId ? { customer: { userId } } : {},
    })

    // Interactions by status
    const interactionsByStatus = await db.interaction.groupBy({
      by: ['status'],
      _count: { id: true },
      where: userId ? { customer: { userId } } : {},
    })

    // Open tickets
    const openTickets = await db.interaction.count({
      where: {
        status: { in: ['new', 'in_progress', 'escalated'] },
        ...(userId ? { customer: { userId } } : {}),
      },
    })

    // Total sentiment logs (through user's customers)
    const totalSentimentLogs = await db.sentimentLog.count({
      where: userId ? { customer: { userId } } : {},
    })

    // Sentiment distribution
    const sentimentDistribution = await db.sentimentLog.groupBy({
      by: ['sentiment'],
      _count: { id: true },
      where: userId ? { customer: { userId } } : {},
    })

    // Average sentiment score
    const sentimentAgg = await db.sentimentLog.aggregate({
      _avg: { score: true },
      where: userId ? { customer: { userId } } : {},
    })

    // Total memory notes (through user's customers)
    const totalMemoryNotes = await db.memoryNote.count({
      where: { isActive: true, ...(userId ? { customer: { userId } } : {}) },
    })

    // Memory notes by category
    const notesByCategory = await db.memoryNote.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { isActive: true, ...(userId ? { customer: { userId } } : {}) },
    })

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
    const recentInteractions = await db.interaction.count({
      where: { createdAt: { gte: sevenDaysAgo }, ...(userId ? { customer: { userId } } : {}) },
    })
    const recentNotes = await db.memoryNote.count({
      where: { createdAt: { gte: sevenDaysAgo }, isActive: true, ...(userId ? { customer: { userId } } : {}) },
    })
    const recentCustomers = await db.customerProfile.count({
      where: { createdAt: { gte: sevenDaysAgo }, ...customerFilter },
    })

    // Top customers by interaction count
    const topCustomers = await db.customerProfile.findMany({
      where: customerFilter,
      include: {
        _count: { select: { interactions: true } },
      },
      orderBy: { interactions: { _count: 'desc' } },
      take: 5,
    })

    // Sentiment trend (last 30 days, grouped by day)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    const recentSentimentLogs = await db.sentimentLog.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, ...(userId ? { customer: { userId } } : {}) },
      orderBy: { createdAt: 'asc' },
      select: { score: true, sentiment: true, createdAt: true },
    })

    // Group sentiment by day
    const sentimentByDay: Record<string, { date: string; avgScore: number; count: number; positive: number; negative: number; neutral: number }> = {}
    for (const log of recentSentimentLogs) {
      const dateKey = log.createdAt.toISOString().split('T')[0]
      if (!sentimentByDay[dateKey]) {
        sentimentByDay[dateKey] = { date: dateKey, avgScore: 0, count: 0, positive: 0, negative: 0, neutral: 0 }
      }
      const day = sentimentByDay[dateKey]
      day.count++
      day.avgScore += log.score
      if (log.sentiment === 'positive') day.positive++
      else if (log.sentiment === 'negative') day.negative++
      else day.neutral++
    }
    // Calculate averages
    const sentimentTrend = Object.values(sentimentByDay).map(day => ({
      ...day,
      avgScore: day.count > 0 ? Math.round((day.avgScore / day.count) * 100) / 100 : 0,
    }))

    // Interactions over time (last 30 days)
    const recentInteractionsList = await db.interaction.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, ...(userId ? { customer: { userId } } : {}) },
      select: { type: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    const interactionsByDay: Record<string, { date: string; count: number; byType: Record<string, number> }> = {}
    for (const interaction of recentInteractionsList) {
      const dateKey = interaction.createdAt.toISOString().split('T')[0]
      if (!interactionsByDay[dateKey]) {
        interactionsByDay[dateKey] = { date: dateKey, count: 0, byType: {} }
      }
      interactionsByDay[dateKey].count++
      interactionsByDay[dateKey].byType[interaction.type] = (interactionsByDay[dateKey].byType[interaction.type] || 0) + 1
    }

    return successResponse({
      overview: {
        totalCustomers,
        totalInteractions,
        totalSentimentLogs,
        totalMemoryNotes,
        openTickets,
        avgSentimentScore: sentimentAgg._avg.score ? Math.round(sentimentAgg._avg.score * 100) / 100 : 0,
      },
      distributions: {
        customersByTier: Object.fromEntries(customersByTier.map(t => [t.tier, t._count.id])),
        interactionsByType: Object.fromEntries(interactionsByType.map(t => [t.type, t._count.id])),
        interactionsByStatus: Object.fromEntries(interactionsByStatus.map(t => [t.status, t._count.id])),
        sentimentDistribution: Object.fromEntries(sentimentDistribution.map(s => [s.sentiment, s._count.id])),
        notesByCategory: Object.fromEntries(notesByCategory.map(n => [n.category, n._count.id])),
      },
      recentActivity: {
        last7Days: {
          newCustomers: recentCustomers,
          interactions: recentInteractions,
          memoryNotes: recentNotes,
        },
      },
      topCustomers: topCustomers.map(c => ({
        id: c.id,
        email: c.email,
        name: c.name,
        company: c.company,
        tier: c.tier,
        interactionCount: c._count.interactions,
      })),
      trends: {
        sentiment: sentimentTrend,
        interactions: Object.values(interactionsByDay),
      },
    })
  } catch (err) {
    console.error('[GET /api/memory/analytics]', err)
    return errorResponse('Failed to fetch memory analytics', 500)
  }
}

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'

// ─── GET /api/memory/segments ────────────────────
// List customer segments

export async function GET(request: Request) {
  try {
    const segments = await db.customerSegment.findMany({
      where: { isActive: true },
      orderBy: { memberCount: 'desc' },
    })

    return successResponse(segments.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      type: s.type,
      rules: JSON.parse(s.rules),
      color: s.color,
      memberCount: s.memberCount,
      createdAt: s.createdAt.toISOString(),
    })))
  } catch (err) {
    console.error('[GET /api/memory/segments]', err)
    return errorResponse('Failed to fetch segments', 500)
  }
}

// ─── POST /api/memory/segments ───────────────────
// Create a customer segment

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, type, rules, color } = body

    if (!name || !rules) {
      return errorResponse('name and rules are required', 400)
    }

    // Count matching customers
    const where: any = {}
    if (rules.tier) where.tier = rules.tier
    if (rules.minInteractions) {
      // Approximate count — in production would use aggregation
    }

    const memberCount = await db.customerProfile.count({ where })

    const segment = await db.customerSegment.create({
      data: {
        name,
        description: description || null,
        type: type || 'manual',
        rules: JSON.stringify(rules),
        color: color || null,
        memberCount,
      },
    })

    return successResponse({
      id: segment.id,
      name: segment.name,
      description: segment.description,
      type: segment.type,
      rules: JSON.parse(segment.rules),
      color: segment.color,
      memberCount: segment.memberCount,
    })
  } catch (err) {
    console.error('[POST /api/memory/segments]', err)
    return errorResponse('Failed to create segment', 500)
  }
}

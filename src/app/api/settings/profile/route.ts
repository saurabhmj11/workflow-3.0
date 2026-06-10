import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId, requireAuth } from '@/lib/auth-utils'
import { successResponse, errorResponse } from '@/lib/api-utils'

// GET /api/settings/profile — Get current user profile
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return errorResponse('Authentication required', 401)

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    })

    if (!user) return errorResponse('User not found', 404)

    return successResponse({
      ...user,
      emailVerified: user.emailVerified?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    })
  } catch (err) {
    console.error('[Settings/Profile] GET error:', err)
    return errorResponse('Failed to fetch profile', 500)
  }
}

// PUT /api/settings/profile — Update profile (name, image)
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { name, image } = body

    const updateData: { name?: string; image?: string } = {}
    if (typeof name === 'string') updateData.name = name.trim() || null
    if (typeof image === 'string') updateData.image = image.trim() || null

    const updated = await db.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        emailVerified: true,
      },
    })

    return successResponse({
      ...updated,
      emailVerified: updated.emailVerified?.toISOString() ?? null,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthRequiredError') {
      return errorResponse('Authentication required', 401)
    }
    console.error('[Settings/Profile] PUT error:', err)
    return errorResponse('Failed to update profile', 500)
  }
}

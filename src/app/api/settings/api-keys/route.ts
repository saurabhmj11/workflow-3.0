import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId, requireAuth } from '@/lib/auth-utils'
import { successResponse, errorResponse } from '@/lib/api-utils'
import crypto from 'crypto'

// Generate a random API key with owf_ prefix
function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let key = 'owf_'
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  const hash = crypto.createHash('sha256').update(key).digest('hex')
  const prefix = key.slice(0, 8) // "owf_1a2b"
  return { raw: key, hash, prefix }
}

// GET /api/settings/api-keys — List API keys for current user
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return errorResponse('Authentication required', 401)

    const keys = await db.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(
      keys.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      }))
    )
  } catch (err) {
    console.error('[Settings/ApiKeys] GET error:', err)
    return errorResponse('Failed to fetch API keys', 500)
  }
}

// POST /api/settings/api-keys — Generate a new API key
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { name } = body as { name?: string }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('API key name is required')
    }

    // Limit API keys per user
    const existingCount = await db.apiKey.count({
      where: { userId: user.id },
    })
    if (existingCount >= 10) {
      return errorResponse('Maximum of 10 API keys allowed')
    }

    const { raw, hash, prefix } = generateApiKey()

    const apiKey = await db.apiKey.create({
      data: {
        name: name.trim(),
        keyHash: hash,
        keyPrefix: prefix,
        userId: user.id,
      },
    })

    // Return the raw key ONCE — it will never be accessible again
    return successResponse({
      id: apiKey.id,
      name: apiKey.name,
      key: raw, // Full key — only shown once!
      keyPrefix: prefix,
      createdAt: apiKey.createdAt.toISOString(),
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthRequiredError') {
      return errorResponse('Authentication required', 401)
    }
    console.error('[Settings/ApiKeys] POST error:', err)
    return errorResponse('Failed to generate API key', 500)
  }
}

// DELETE /api/settings/api-keys — Revoke an API key
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('API key ID is required')

    const key = await db.apiKey.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!key) return errorResponse('API key not found', 404)
    if (key.userId !== user.id) return errorResponse('Unauthorized', 403)

    await db.apiKey.delete({ where: { id } })

    return successResponse({ message: 'API key revoked' })
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthRequiredError') {
      return errorResponse('Authentication required', 401)
    }
    console.error('[Settings/ApiKeys] DELETE error:', err)
    return errorResponse('Failed to revoke API key', 500)
  }
}

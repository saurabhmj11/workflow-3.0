import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { updateSecret, deleteSecret } from '@/lib/secrets'
import { db } from '@/lib/db'
import { decryptSecret } from '@/lib/secrets'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ secretId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { secretId } = await params
  const secret = await db.secret.findFirst({
    where: {
      id: secretId,
      OR: [{ userId: session.user.id }, { isGlobal: true }],
    },
  })

  if (!secret) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  // Return metadata only — never expose raw value
  return NextResponse.json({
    ok: true,
    data: {
      id: secret.id,
      name: secret.name,
      key: secret.key,
      description: secret.description,
      category: secret.category,
      isGlobal: secret.isGlobal,
      lastUsedAt: secret.lastUsedAt,
      usageCount: secret.usageCount,
      expiresAt: secret.expiresAt,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
    },
  })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ secretId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { secretId } = await params

  try {
    const body = await req.json() as {
      name?: string
      value?: string
      description?: string
      category?: string
      expiresAt?: string | null
      tags?: string[]
    }

    const secret = await updateSecret(
      secretId,
      {
        name: body.name,
        value: body.value,
        description: body.description,
        category: body.category,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : body.expiresAt === null ? null : undefined,
        tags: body.tags,
      },
      session.user.id
    )

    return NextResponse.json({ ok: true, data: secret })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 400 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ secretId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { secretId } = await params

  try {
    await deleteSecret(secretId, session.user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 400 })
  }
}

// ─── Test/reveal secret value (admin only) ────────
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ secretId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { secretId } = await params
  const secret = await db.secret.findFirst({
    where: { id: secretId, userId: session.user.id },
  })

  if (!secret) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  try {
    const value = decryptSecret(secret.value)
    // Mask: show first 4 + last 4 chars
    const masked = value.length > 8
      ? value.slice(0, 4) + '•'.repeat(Math.max(value.length - 8, 4)) + value.slice(-4)
      : '••••••••'

    return NextResponse.json({ ok: true, data: { masked, length: value.length } })
  } catch {
    return NextResponse.json({ ok: false, error: 'Decryption failed' }, { status: 500 })
  }
}

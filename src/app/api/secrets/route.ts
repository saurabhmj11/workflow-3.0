import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { listSecrets, createSecret } from '@/lib/secrets'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const includeGlobal = searchParams.get('includeGlobal') !== 'false'
    const secrets = await listSecrets(includeGlobal ? session.user.id : undefined)
    return NextResponse.json({ ok: true, data: secrets })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json() as {
      name: string
      key: string
      value: string
      description?: string
      category?: string
      isGlobal?: boolean
      expiresAt?: string
      tags?: string[]
    }

    if (!body.name || !body.key || !body.value) {
      return NextResponse.json({ ok: false, error: 'name, key, and value are required' }, { status: 400 })
    }

    const secret = await createSecret({
      name: body.name,
      key: body.key,
      value: body.value,
      description: body.description,
      category: body.category,
      userId: session.user.id,
      isGlobal: body.isGlobal ?? false,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      tags: body.tags,
    })

    return NextResponse.json({ ok: true, data: secret }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    const status = msg.includes('Unique constraint') ? 409 : 500
    return NextResponse.json({ ok: false, error: msg }, { status })
  }
}

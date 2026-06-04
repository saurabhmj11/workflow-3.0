import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const servers = await db.mCPServer.findMany({
      include: { _count: { select: { tools: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const data = servers.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      type: s.type,
      description: s.description,
      status: s.status,
      toolCount: s._count.tools,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }))

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('Failed to list MCP servers:', error)
    return NextResponse.json({ ok: false, error: 'Failed to list servers' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, url, type = 'sse', description, headers } = body

    if (!name || !url) {
      return NextResponse.json({ ok: false, error: 'name and url are required' }, { status: 400 })
    }

    const server = await db.mCPServer.create({
      data: {
        name,
        url,
        type,
        description: description ?? null,
        headers: headers ? JSON.stringify(headers) : null,
        status: 'connected',
      },
    })

    return NextResponse.json({
      ok: true,
      data: {
        id: server.id,
        name: server.name,
        url: server.url,
        type: server.type,
        description: server.description,
        status: server.status,
        toolCount: 0,
      },
    })
  } catch (error) {
    console.error('Failed to register MCP server:', error)
    return NextResponse.json({ ok: false, error: 'Failed to register server' }, { status: 500 })
  }
}

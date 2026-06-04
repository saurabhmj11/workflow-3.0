import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const server = await db.mCPServer.findUnique({
      where: { id },
      include: { _count: { select: { tools: true } } },
    })

    if (!server) {
      return NextResponse.json({ ok: false, error: 'Server not found' }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: server.id,
        name: server.name,
        url: server.url,
        type: server.type,
        description: server.description,
        status: server.status,
        headers: server.headers,
        toolCount: server._count.tools,
        createdAt: server.createdAt,
        updatedAt: server.updatedAt,
      },
    })
  } catch (error) {
    console.error('Failed to get MCP server:', error)
    return NextResponse.json({ ok: false, error: 'Failed to get server' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const server = await db.mCPServer.findUnique({ where: { id } })
    if (!server) {
      return NextResponse.json({ ok: false, error: 'Server not found' }, { status: 404 })
    }

    // Cascade delete will remove all tools
    await db.mCPServer.delete({ where: { id } })

    return NextResponse.json({ ok: true, data: { deleted: true } })
  } catch (error) {
    console.error('Failed to delete MCP server:', error)
    return NextResponse.json({ ok: false, error: 'Failed to delete server' }, { status: 500 })
  }
}

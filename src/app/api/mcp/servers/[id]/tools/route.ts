import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tools = await db.mCPTool.findMany({
      where: { serverId: id },
      orderBy: { name: 'asc' },
    })

    const data = tools.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema ? JSON.parse(t.inputSchema) : null,
      annotations: t.annotations ? JSON.parse(t.annotations) : null,
      serverId: t.serverId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }))

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('Failed to list MCP tools for server:', error)
    return NextResponse.json({ ok: false, error: 'Failed to list tools' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, inputSchema, annotations } = body

    if (!name) {
      return NextResponse.json({ ok: false, error: 'Tool name is required' }, { status: 400 })
    }

    // Verify server exists
    const server = await db.mCPServer.findUnique({ where: { id } })
    if (!server) {
      return NextResponse.json({ ok: false, error: 'Server not found' }, { status: 404 })
    }

    const tool = await db.mCPTool.create({
      data: {
        serverId: id,
        name,
        description: description ?? null,
        inputSchema: inputSchema ? JSON.stringify(inputSchema) : null,
        annotations: annotations ? JSON.stringify(annotations) : null,
      },
    })

    return NextResponse.json({
      ok: true,
      data: {
        id: tool.id,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema ? JSON.parse(tool.inputSchema) : null,
        annotations: tool.annotations ? JSON.parse(tool.annotations) : null,
        serverId: tool.serverId,
      },
    })
  } catch (error) {
    console.error('Failed to add MCP tool:', error)
    return NextResponse.json({ ok: false, error: 'Failed to add tool' }, { status: 500 })
  }
}

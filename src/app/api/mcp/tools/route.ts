import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DEFAULT_MCP_TOOLS } from '@/lib/mcp-defaults'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase() ?? ''

    // Fetch DB tools with server info
    const dbTools = await db.mCPTool.findMany({
      include: { server: { select: { name: true } } },
      orderBy: { name: 'asc' },
    })

    // Combine DB tools with default builtin tools
    const allTools = [
      ...DEFAULT_MCP_TOOLS.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? null,
        inputSchema: t.inputSchema ?? null,
        annotations: t.annotations ?? null,
        serverName: t.serverName,
        source: 'builtin' as const,
      })),
      ...dbTools.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema ? JSON.parse(t.inputSchema) : null,
        annotations: t.annotations ? JSON.parse(t.annotations) : null,
        serverName: t.server.name,
        source: 'custom' as const,
      })),
    ]

    // Filter by search query
    const filtered = search
      ? allTools.filter(
          (t) =>
            t.name.toLowerCase().includes(search) ||
            (t.description && t.description.toLowerCase().includes(search)) ||
            t.serverName.toLowerCase().includes(search)
        )
      : allTools

    return NextResponse.json({ ok: true, data: filtered })
  } catch (error) {
    console.error('Failed to list MCP tools:', error)
    return NextResponse.json({ ok: false, error: 'Failed to list tools' }, { status: 500 })
  }
}

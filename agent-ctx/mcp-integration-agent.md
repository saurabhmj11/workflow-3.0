# Task: MCP Integration Layer - Work Summary

## Files Created

1. **`prisma/schema.prisma`** — Added `MCPServer` and `MCPTool` models
2. **`src/lib/types.ts`** — Added `MCPToolDefinition` and `MCPServerDefinition` interfaces
3. **`src/lib/mcp-defaults.ts`** — 8 default builtin tools with input schemas
4. **`src/app/api/mcp/servers/route.ts`** — GET (list) + POST (register) MCP servers
5. **`src/app/api/mcp/servers/[id]/route.ts`** — GET (single) + DELETE (cascade) MCP servers
6. **`src/app/api/mcp/servers/[id]/tools/route.ts`** — GET (list tools) + POST (add tool) per server
7. **`src/app/api/mcp/tools/route.ts`** — GET (all tools, builtin + custom, with search)
8. **`src/components/mcp/tool-browser.tsx`** — Full ToolBrowser dialog component

## Files Modified

1. **`src/components/config/node-config-panel.tsx`** — Changed agent tools from text input to tag-based UI with Browse button
2. **`src/app/page.tsx`** — Added Plug icon button in toolbar for MCP Tool Browser
3. **`src/lib/db.ts`** — Restored original singleton pattern (was temporarily changed for Prisma hot-reload fix)

## Key Decisions

- **Tools stored as comma-separated string** in agent config (backward compatible with existing `tools` field)
- **Default tools are static** (not persisted in DB) — served from `mcp-defaults.ts` alongside DB tools
- **Tool browser uses Dialog** with split layout: tool list on left, detail panel on right
- **Category tabs** (All/Builtin/Custom) with count badges for tool discovery
- **Tag-based input** for agent tools: type + Enter/comma to add, X to remove, Browse button opens dialog
- **Search debounced** at 300ms in the tool browser
- **API combines** default builtin tools with DB-stored custom tools in the `/api/mcp/tools` endpoint

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mcp/servers` | List all MCP servers with tool counts |
| POST | `/api/mcp/servers` | Register a new MCP server |
| GET | `/api/mcp/servers/[id]` | Get single server details |
| DELETE | `/api/mcp/servers/[id]` | Delete server (cascades to tools) |
| GET | `/api/mcp/servers/[id]/tools` | List tools for a specific server |
| POST | `/api/mcp/servers/[id]/tools` | Add a tool to a server |
| GET | `/api/mcp/tools?search=` | List all tools (builtin + custom), optional search |

## All Tests Passed

- ESLint: ✅ No errors
- API endpoints: ✅ All CRUD operations verified
- Main page: ✅ Renders correctly
- Prisma schema: ✅ Synced with database

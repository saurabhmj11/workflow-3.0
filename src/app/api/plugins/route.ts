import { successResponse, errorResponse } from '@/lib/api-utils'
import { pluginRegistry, validateManifest } from '@/lib/plugins/registry'

// ─── Lazy-init built-in plugins on first call ─────
let builtinsInitialized = false
async function ensureBuiltins() {
  if (builtinsInitialized) return
  builtinsInitialized = true
  try {
    const { registerBuiltinPlugins } = await import('@/lib/plugins/builtins')
    registerBuiltinPlugins()
  } catch (err) {
    console.error('[Plugins] Failed to register built-in plugins:', err)
  }
}

// ─── GET /api/plugins ────────────────────────────
// List all registered plugins

export async function GET() {
  try {
    await ensureBuiltins()
    const plugins = pluginRegistry.getAllPlugins()
    const statusCounts = pluginRegistry.getStatusCounts()

    return successResponse({
      plugins: plugins.map(p => ({
        id: p.manifest.id,
        name: p.manifest.name,
        version: p.manifest.version,
        description: p.manifest.description,
        author: p.manifest.author,
        icon: p.manifest.icon,
        homepage: p.manifest.homepage,
        permissions: p.manifest.permissions,
        status: p.status,
        installedAt: p.installedAt,
        error: p.error,
        nodeCount: p.manifest.nodes?.length ?? 0,
        integrationCount: p.manifest.integrations?.length ?? 0,
        triggerCount: p.manifest.triggers?.length ?? 0,
        settings: p.settings,
        settingDefinitions: p.manifest.settings,
      })),
      statusCounts,
      customNodes: pluginRegistry.getCustomNodes(),
      customIntegrations: pluginRegistry.getCustomIntegrations(),
      customTriggers: pluginRegistry.getCustomTriggers(),
    })
  } catch (err) {
    console.error('[GET /api/plugins]', err)
    return errorResponse('Failed to fetch plugins', 500)
  }
}

// ─── POST /api/plugins ───────────────────────────
// Register a new plugin (upload manifest)

export async function POST(request: Request) {
  try {
    await ensureBuiltins()
    const body = await request.json()

    // Validate the manifest
    const errors = validateManifest(body)
    if (errors.length > 0) {
      return errorResponse(`Invalid manifest: ${errors.join('; ')}`, 400)
    }

    // Check if already registered
    if (pluginRegistry.getPlugin(body.id)) {
      return errorResponse(`Plugin "${body.id}" is already registered`, 409)
    }

    pluginRegistry.registerPlugin(body)

    const plugin = pluginRegistry.getPlugin(body.id)!
    return successResponse({
      id: plugin.manifest.id,
      name: plugin.manifest.name,
      version: plugin.manifest.version,
      status: plugin.status,
      installedAt: plugin.installedAt,
    }, 201)
  } catch (err) {
    if (err instanceof Error) {
      return errorResponse(err.message, 400)
    }
    console.error('[POST /api/plugins]', err)
    return errorResponse('Failed to register plugin', 500)
  }
}

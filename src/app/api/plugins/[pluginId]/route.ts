import { successResponse, errorResponse } from '@/lib/api-utils'
import { pluginRegistry } from '@/lib/plugins/registry'

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

// ─── GET /api/plugins/[pluginId] ─────────────────
// Get detailed information about a specific plugin

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  try {
    await ensureBuiltins()
    const { pluginId } = await params
    const plugin = pluginRegistry.getPlugin(pluginId)

    if (!plugin) {
      return errorResponse(`Plugin "${pluginId}" not found`, 404)
    }

    return successResponse({
      id: plugin.manifest.id,
      name: plugin.manifest.name,
      version: plugin.manifest.version,
      description: plugin.manifest.description,
      author: plugin.manifest.author,
      icon: plugin.manifest.icon,
      homepage: plugin.manifest.homepage,
      permissions: plugin.manifest.permissions,
      status: plugin.status,
      installedAt: plugin.installedAt,
      error: plugin.error,
      settings: plugin.settings,
      nodes: plugin.manifest.nodes ?? [],
      integrations: plugin.manifest.integrations ?? [],
      triggers: plugin.manifest.triggers ?? [],
      settingDefinitions: plugin.manifest.settings ?? [],
    })
  } catch (err) {
    console.error('[GET /api/plugins/[pluginId]]', err)
    return errorResponse('Failed to fetch plugin', 500)
  }
}

// ─── PATCH /api/plugins/[pluginId] ───────────────
// Enable/disable a plugin or update its settings

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  try {
    await ensureBuiltins()
    const { pluginId } = await params
    const plugin = pluginRegistry.getPlugin(pluginId)

    if (!plugin) {
      return errorResponse(`Plugin "${pluginId}" not found`, 404)
    }

    const body = await request.json()

    // Handle status changes
    if (body.status === 'active') {
      pluginRegistry.enablePlugin(pluginId)
    } else if (body.status === 'disabled') {
      pluginRegistry.disablePlugin(pluginId)
    }

    // Handle settings updates
    if (body.settings && typeof body.settings === 'object') {
      pluginRegistry.updatePluginSettings(pluginId, body.settings)
    }

    const updated = pluginRegistry.getPlugin(pluginId)!
    return successResponse({
      id: updated.manifest.id,
      name: updated.manifest.name,
      status: updated.status,
      settings: updated.settings,
    })
  } catch (err) {
    if (err instanceof Error) {
      return errorResponse(err.message, 400)
    }
    console.error('[PATCH /api/plugins/[pluginId]]', err)
    return errorResponse('Failed to update plugin', 500)
  }
}

// ─── DELETE /api/plugins/[pluginId] ──────────────
// Unregister a plugin

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  try {
    await ensureBuiltins()
    const { pluginId } = await params
    const plugin = pluginRegistry.getPlugin(pluginId)

    if (!plugin) {
      return errorResponse(`Plugin "${pluginId}" not found`, 404)
    }

    pluginRegistry.unregisterPlugin(pluginId)
    return successResponse({ deleted: pluginId })
  } catch (err) {
    if (err instanceof Error) {
      return errorResponse(err.message, 400)
    }
    console.error('[DELETE /api/plugins/[pluginId]]', err)
    return errorResponse('Failed to delete plugin', 500)
  }
}

// ─── OpenWorkflow Plugin Ecosystem ────────────────
// Extensible plugin system that allows extending OpenWorkflow
// with custom nodes, integrations, and triggers.

import { createLogger } from '@/lib/logger'

const log = createLogger('PluginRegistry')

// ─── Plugin Type Definitions ─────────────────────

/** A plugin manifest describes a plugin and its capabilities */
export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  icon?: string
  homepage?: string
  /** Requested permissions — e.g. 'network', 'filesystem', 'database' */
  permissions: string[]

  // Plugin components
  nodes?: PluginNodeDefinition[]
  integrations?: PluginIntegrationDefinition[]
  triggers?: PluginTriggerDefinition[]
  settings?: PluginSettingDefinition[]
}

/** A custom node contributed by a plugin */
export interface PluginNodeDefinition {
  /** Unique node type (e.g. "plugin:pdf-generator") */
  type: string
  label: string
  category: 'trigger' | 'logic' | 'ai' | 'human' | 'action'
  icon: string
  color: string
  /** JSON Schema for the node's config panel */
  configSchema: Record<string, unknown>
  sourceHandle?: string[]
  /** Path or identifier for the handler function */
  handler: string
}

/** A custom integration contributed by a plugin */
export interface PluginIntegrationDefinition {
  id: string
  name: string
  authType: 'oauth2' | 'api_key' | 'none'
  actions: Array<{
    id: string
    name: string
    handler: string
    inputSchema: Record<string, unknown>
    outputSchema: Record<string, unknown>
  }>
}

/** A custom trigger contributed by a plugin */
export interface PluginTriggerDefinition {
  type: string
  name: string
  handler: string
  configSchema: Record<string, unknown>
}

/** A setting definition for plugin configuration */
export interface PluginSettingDefinition {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'select'
  required: boolean
  defaultValue?: unknown
  options?: string[]
}

/** Current status of a registered plugin */
export type PluginStatus = 'installed' | 'active' | 'disabled' | 'error'

/** A plugin instance with runtime state */
export interface PluginInstance {
  manifest: PluginManifest
  status: PluginStatus
  installedAt: string
  settings: Record<string, unknown>
  error?: string
}

// ─── Validation Helpers ──────────────────────────

const REQUIRED_MANIFEST_FIELDS: (keyof PluginManifest)[] = [
  'id', 'name', 'version', 'description', 'author', 'permissions',
]

/**
 * Validate a plugin manifest.
 * Returns an array of error messages (empty = valid).
 */
export function validateManifest(manifest: unknown): string[] {
  const errors: string[] = []

  if (!manifest || typeof manifest !== 'object') {
    return ['Manifest must be an object']
  }

  const m = manifest as Record<string, unknown>

  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (m[field] === undefined || m[field] === null || m[field] === '') {
      errors.push(`Missing required field: "${field}"`)
    }
  }

  // Validate ID format — only lowercase letters, numbers, and hyphens
  if (typeof m.id === 'string' && !/^[a-z0-9][a-z0-9-]*$/.test(m.id)) {
    errors.push('Plugin ID must be lowercase alphanumeric with hyphens (e.g. "pdf-generator")')
  }

  // Validate permissions is an array
  if (m.permissions !== undefined && !Array.isArray(m.permissions)) {
    errors.push('"permissions" must be an array of strings')
  }

  // Validate node definitions
  if (m.nodes !== undefined) {
    if (!Array.isArray(m.nodes)) {
      errors.push('"nodes" must be an array')
    } else {
      for (let i = 0; i < m.nodes.length; i++) {
        const node = m.nodes[i] as Record<string, unknown>
        if (!node.type) errors.push(`Node at index ${i} missing "type"`)
        if (!node.label) errors.push(`Node at index ${i} missing "label"`)
        if (!node.category || !['trigger', 'logic', 'ai', 'human', 'action'].includes(node.category as string)) {
          errors.push(`Node at index ${i} has invalid "category" — must be trigger|logic|ai|human|action`)
        }
      }
    }
  }

  // Validate integration definitions
  if (m.integrations !== undefined) {
    if (!Array.isArray(m.integrations)) {
      errors.push('"integrations" must be an array')
    } else {
      for (let i = 0; i < m.integrations.length; i++) {
        const integ = m.integrations[i] as Record<string, unknown>
        if (!integ.id) errors.push(`Integration at index ${i} missing "id"`)
        if (!integ.name) errors.push(`Integration at index ${i} missing "name"`)
      }
    }
  }

  // Validate settings definitions
  if (m.settings !== undefined) {
    if (!Array.isArray(m.settings)) {
      errors.push('"settings" must be an array')
    } else {
      for (let i = 0; i < m.settings.length; i++) {
        const setting = m.settings[i] as Record<string, unknown>
        if (!setting.key) errors.push(`Setting at index ${i} missing "key"`)
        if (!setting.label) errors.push(`Setting at index ${i} missing "label"`)
      }
    }
  }

  return errors
}

// ─── Plugin Registry ─────────────────────────────

/**
 * Central registry for managing plugins.
 * Plugins can contribute custom nodes, integrations, triggers, and settings.
 */
export class PluginRegistry {
  private plugins: Map<string, PluginInstance> = new Map()

  /** Register a new plugin from its manifest */
  registerPlugin(manifest: PluginManifest): void {
    const errors = validateManifest(manifest)
    if (errors.length > 0) {
      throw new Error(`Invalid plugin manifest: ${errors.join('; ')}`)
    }

    if (this.plugins.has(manifest.id)) {
      throw new Error(`Plugin "${manifest.id}" is already registered`)
    }

    const instance: PluginInstance = {
      manifest,
      status: 'installed',
      installedAt: new Date().toISOString(),
      settings: {},
    }

    // Apply default settings
    if (manifest.settings) {
      for (const setting of manifest.settings) {
        if (setting.defaultValue !== undefined) {
          instance.settings[setting.key] = setting.defaultValue
        }
      }
    }

    this.plugins.set(manifest.id, instance)
    log.info({ pluginId: manifest.id, name: manifest.name }, 'Plugin registered')
  }

  /** Unregister a plugin by its ID */
  unregisterPlugin(pluginId: string): void {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin "${pluginId}" not found`)
    }
    this.plugins.delete(pluginId)
    log.info({ pluginId }, 'Plugin unregistered')
  }

  /** Get a plugin instance by ID */
  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId)
  }

  /** Get all registered plugins */
  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values())
  }

  /** Enable a plugin — transitions from installed/disabled to active */
  enablePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" not found`)
    }
    if (plugin.status === 'active') return

    plugin.status = 'active'
    plugin.error = undefined
    log.info({ pluginId }, 'Plugin enabled')
  }

  /** Disable a plugin — transitions to disabled state */
  disablePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" not found`)
    }
    plugin.status = 'disabled'
    log.info({ pluginId }, 'Plugin disabled')
  }

  /** Update settings for a plugin */
  updatePluginSettings(pluginId: string, settings: Record<string, unknown>): void {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" not found`)
    }
    plugin.settings = { ...plugin.settings, ...settings }
    log.info({ pluginId, settingsKeys: Object.keys(settings) }, 'Plugin settings updated')
  }

  /** Mark a plugin as errored with a message */
  setPluginError(pluginId: string, error: string): void {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return
    plugin.status = 'error'
    plugin.error = error
    log.error({ pluginId, error }, 'Plugin errored')
  }

  /** Get all custom nodes from all active plugins */
  getCustomNodes(): PluginNodeDefinition[] {
    const nodes: PluginNodeDefinition[] = []
    for (const plugin of this.plugins.values()) {
      if (plugin.status === 'active' && plugin.manifest.nodes) {
        nodes.push(...plugin.manifest.nodes)
      }
    }
    return nodes
  }

  /** Get all custom integrations from all active plugins */
  getCustomIntegrations(): PluginIntegrationDefinition[] {
    const integrations: PluginIntegrationDefinition[] = []
    for (const plugin of this.plugins.values()) {
      if (plugin.status === 'active' && plugin.manifest.integrations) {
        integrations.push(...plugin.manifest.integrations)
      }
    }
    return integrations
  }

  /** Get all custom triggers from all active plugins */
  getCustomTriggers(): PluginTriggerDefinition[] {
    const triggers: PluginTriggerDefinition[] = []
    for (const plugin of this.plugins.values()) {
      if (plugin.status === 'active' && plugin.manifest.triggers) {
        triggers.push(...plugin.manifest.triggers)
      }
    }
    return triggers
  }

  /** Get count of plugins by status */
  getStatusCounts(): Record<PluginStatus, number> {
    const counts: Record<PluginStatus, number> = { installed: 0, active: 0, disabled: 0, error: 0 }
    for (const plugin of this.plugins.values()) {
      counts[plugin.status]++
    }
    return counts
  }
}

/** Singleton plugin registry instance */
export const pluginRegistry = new PluginRegistry()

// ─── White-Label Configuration Manager ────────────
// Manages branding, feature flags, and embed settings.
// Configuration is stored in DB and cached in memory.

import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { getDefaultConfig, DEFAULT_WHITELABEL_CONFIG } from './defaults'

const log = createLogger('WhiteLabelManager')

// ─── Types ────────────────────────────────────────

export interface WhiteLabelConfig {
  // Branding
  companyName: string
  logoUrl?: string
  faviconUrl?: string
  primaryColor: string
  secondaryColor: string
  accentColor: string

  // Customization
  customCss?: string
  customDomain?: string
  supportEmail?: string
  documentationUrl?: string

  // Features (toggle features on/off)
  enabledFeatures: {
    aiNodes: boolean
    humanInTheLoop: boolean
    mcpSupport: boolean
    memoryLayer: boolean
    customCode: boolean
    multiAgent: boolean
    pluginSystem: boolean
  }

  // Embed settings
  embed: {
    allowedOrigins: string[]
    showHeader: boolean
    showSidebar: boolean
    theme: 'light' | 'dark' | 'system'
    locale: string
  }
}

// ─── Memory Cache ─────────────────────────────────

let cachedConfig: WhiteLabelConfig | null = null
let cacheExpiry = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ─── WhiteLabelManager Class ──────────────────────

export class WhiteLabelManager {
  private config: WhiteLabelConfig | null = null

  /**
   * Get the current white-label configuration.
   * Loads from DB on first call, then uses in-memory cache.
   */
  async getConfig(): Promise<WhiteLabelConfig> {
    // Return in-memory config if available
    if (this.config) {
      return this.config
    }

    // Check global cache
    if (cachedConfig && Date.now() < cacheExpiry) {
      this.config = cachedConfig
      return cachedConfig
    }

    // Load from DB
    try {
      const record = await db.siteConfig.findUnique({
        where: { key: 'whitelabel' },
      })

      if (record) {
        const parsed = JSON.parse(record.value) as WhiteLabelConfig
        // Merge with defaults to ensure all fields exist
        this.config = this.mergeWithDefaults(parsed)
        cachedConfig = this.config
        cacheExpiry = Date.now() + CACHE_TTL_MS
        return this.config
      }
    } catch (err) {
      log.error({ err }, 'Failed to load white-label config from DB')
    }

    // Fall back to defaults
    this.config = getDefaultConfig()
    cachedConfig = this.config
    cacheExpiry = Date.now() + CACHE_TTL_MS
    return this.config
  }

  /**
   * Update the white-label configuration.
   * Merges the provided partial config with the existing config.
   */
  async updateConfig(config: Partial<WhiteLabelConfig>): Promise<WhiteLabelConfig> {
    const current = await this.getConfig()

    // Deep merge
    const updated: WhiteLabelConfig = {
      ...current,
      ...config,
      enabledFeatures: {
        ...current.enabledFeatures,
        ...(config.enabledFeatures ?? {}),
      },
      embed: {
        ...current.embed,
        ...(config.embed ?? {}),
        allowedOrigins: config.embed?.allowedOrigins ?? current.embed.allowedOrigins,
      },
    }

    // Validate colors
    updated.primaryColor = this.validateColor(updated.primaryColor, DEFAULT_WHITELABEL_CONFIG.primaryColor)
    updated.secondaryColor = this.validateColor(updated.secondaryColor, DEFAULT_WHITELABEL_CONFIG.secondaryColor)
    updated.accentColor = this.validateColor(updated.accentColor, DEFAULT_WHITELABEL_CONFIG.accentColor)

    // Save to DB
    try {
      await db.siteConfig.upsert({
        where: { key: 'whitelabel' },
        create: {
          key: 'whitelabel',
          value: JSON.stringify(updated),
        },
        update: {
          value: JSON.stringify(updated),
        },
      })
    } catch (err) {
      log.error({ err }, 'Failed to save white-label config to DB')
    }

    // Update in-memory cache
    this.config = updated
    cachedConfig = updated
    cacheExpiry = Date.now() + CACHE_TTL_MS

    log.info({ companyName: updated.companyName }, 'White-label config updated')
    return updated
  }

  /**
   * Check if a specific feature is enabled.
   */
  async isFeatureEnabled(feature: keyof WhiteLabelConfig['enabledFeatures']): Promise<boolean> {
    const config = await this.getConfig()
    return config.enabledFeatures[feature] ?? false
  }

  /**
   * Check if an origin is allowed for embed.
   */
  async isOriginAllowed(origin: string): Promise<boolean> {
    const config = await this.getConfig()
    const allowedOrigins = config.embed.allowedOrigins

    // If no origins are configured, allow none
    if (allowedOrigins.length === 0) {
      return false
    }

    // Check exact match and wildcard patterns
    for (const allowed of allowedOrigins) {
      if (allowed === '*') return true
      if (allowed === origin) return true

      // Support subdomain wildcards: *.example.com
      if (allowed.startsWith('*.')) {
        const domain = allowed.slice(2)
        if (origin.endsWith(domain) || origin.endsWith('://' + domain)) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Generate branding CSS and meta tags for the current configuration.
   */
  async applyBranding(): Promise<{ css: string; meta: Record<string, string> }> {
    const config = await this.getConfig()

    const css = `
:root {
  --ow-primary: ${config.primaryColor};
  --ow-secondary: ${config.secondaryColor};
  --ow-accent: ${config.accentColor};
  --ow-company: "${config.companyName}";
}
${config.customCss || ''}
`.trim()

    const meta: Record<string, string> = {
      'application-name': config.companyName,
      'apple-mobile-web-app-title': config.companyName,
      'theme-color': config.primaryColor,
      'msapplication-TileColor': config.primaryColor,
    }

    if (config.faviconUrl) {
      meta['favicon'] = config.faviconUrl
    }

    return { css, meta }
  }

  /**
   * Invalidate the in-memory cache.
   * Forces the next getConfig() call to load from DB.
   */
  invalidateCache(): void {
    this.config = null
    cachedConfig = null
    cacheExpiry = 0
    log.info('White-label config cache invalidated')
  }

  // ─── Private Helpers ───────────────────────────

  /**
   * Merge a loaded config with defaults to ensure all fields exist.
   */
  private mergeWithDefaults(loaded: Partial<WhiteLabelConfig>): WhiteLabelConfig {
    const defaults = getDefaultConfig()

    return {
      companyName: loaded.companyName ?? defaults.companyName,
      logoUrl: loaded.logoUrl ?? defaults.logoUrl,
      faviconUrl: loaded.faviconUrl ?? defaults.faviconUrl,
      primaryColor: loaded.primaryColor ?? defaults.primaryColor,
      secondaryColor: loaded.secondaryColor ?? defaults.secondaryColor,
      accentColor: loaded.accentColor ?? defaults.accentColor,
      customCss: loaded.customCss ?? defaults.customCss,
      customDomain: loaded.customDomain ?? defaults.customDomain,
      supportEmail: loaded.supportEmail ?? defaults.supportEmail,
      documentationUrl: loaded.documentationUrl ?? defaults.documentationUrl,
      enabledFeatures: {
        ...defaults.enabledFeatures,
        ...(loaded.enabledFeatures ?? {}),
      },
      embed: {
        ...defaults.embed,
        ...(loaded.embed ?? {}),
        allowedOrigins: loaded.embed?.allowedOrigins ?? defaults.embed.allowedOrigins,
      },
    }
  }

  /**
   * Validate a hex color string.
   */
  private validateColor(color: string, fallback: string): string {
    if (!color) return fallback
    const hexPattern = /^#([0-9A-Fa-f]{3}){1,2}$/
    return hexPattern.test(color) ? color : fallback
  }
}

// ─── Singleton Instance ───────────────────────────

export const whiteLabelManager = new WhiteLabelManager()

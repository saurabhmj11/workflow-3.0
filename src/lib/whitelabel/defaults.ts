// ─── White-Label Configuration Defaults ───────────
// Default branding and feature configuration for OpenWorkflow.
// These defaults are used when no custom configuration is set.

import type { WhiteLabelConfig } from './config'

/**
 * Default OpenWorkflow branding configuration.
 * Used as the base when no custom white-label config exists.
 */
export const DEFAULT_WHITELABEL_CONFIG: WhiteLabelConfig = {
  // Branding
  companyName: 'OpenWorkflow',
  logoUrl: '/logo.svg',
  faviconUrl: '/favicon.ico',
  primaryColor: '#7c3aed',
  secondaryColor: '#06b6d4',
  accentColor: '#10b981',

  // Customization
  customCss: undefined,
  customDomain: undefined,
  supportEmail: 'support@openworkflow.ai',
  documentationUrl: 'https://docs.openworkflow.ai',

  // Features (all enabled by default)
  enabledFeatures: {
    aiNodes: true,
    humanInTheLoop: true,
    mcpSupport: true,
    memoryLayer: true,
    customCode: true,
    multiAgent: true,
    pluginSystem: true,
  },

  // Embed settings
  embed: {
    allowedOrigins: [],
    showHeader: true,
    showSidebar: true,
    theme: 'system',
    locale: 'en',
  },
}

/**
 * Get the default white-label configuration.
 * Returns a deep copy to prevent mutation of the defaults.
 */
export function getDefaultConfig(): WhiteLabelConfig {
  return JSON.parse(JSON.stringify(DEFAULT_WHITELABEL_CONFIG))
}

/**
 * Feature flag descriptions for UI display.
 */
export const FEATURE_DESCRIPTIONS: Record<keyof WhiteLabelConfig['enabledFeatures'], string> = {
  aiNodes: 'AI-powered workflow nodes (LLM, classification, etc.)',
  humanInTheLoop: 'Human approval and review nodes',
  mcpSupport: 'Model Context Protocol server integration',
  memoryLayer: 'Agent memory and customer context layer',
  customCode: 'Custom code execution nodes',
  multiAgent: 'Multi-agent orchestration capabilities',
  pluginSystem: 'Third-party plugin marketplace',
}

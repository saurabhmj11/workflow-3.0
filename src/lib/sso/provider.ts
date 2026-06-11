// ─── SSO Provider Manager ──────────────────────────
// Manages SSO/SAML/OIDC provider configurations.
// Integrates with NextAuth.js v5 for authentication flow.

import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'

const log = createLogger('SSOProviderManager')

// ─── Types ────────────────────────────────────────

export interface SSOProvider {
  id: string
  name: string
  type: 'saml' | 'oidc'
  enabled: boolean
  provider: string // saml, oidc, okta, azure-ad, google-workspace
  config: Record<string, unknown>
  allowedDomains: string[]
  autoProvision: boolean
  defaultRole: string
}

export interface CreateSSOProviderData {
  name: string
  type: 'saml' | 'oidc'
  enabled?: boolean
  provider: string
  samlEntryPoint?: string
  samlCertificate?: string
  samlIssuer?: string
  oidcDiscoveryUrl?: string
  oidcClientId?: string
  oidcClientSecret?: string
  allowedDomains?: string[]
  autoProvision?: boolean
  defaultRole?: string
  metadata?: Record<string, unknown>
}

export interface UpdateSSOProviderData {
  name?: string
  enabled?: boolean
  samlEntryPoint?: string
  samlCertificate?: string
  samlIssuer?: string
  oidcDiscoveryUrl?: string
  oidcClientId?: string
  oidcClientSecret?: string
  allowedDomains?: string[]
  autoProvision?: boolean
  defaultRole?: string
  metadata?: Record<string, unknown>
}

// ─── SSO Provider Manager Class ───────────────────

export class SSOProviderManager {
  /**
   * Get all configured SSO providers.
   * Masks sensitive fields like client secrets and certificates.
   */
  async getProviders(): Promise<SSOProvider[]> {
    try {
      const providers = await db.sSOConfiguration.findMany({
        orderBy: { createdAt: 'desc' },
      })

      return providers.map((p) => this.toPublicProvider(p))
    } catch (err) {
      log.error({ err }, 'Failed to fetch SSO providers')
      return []
    }
  }

  /**
   * Get a specific SSO provider by ID.
   * Returns null if not found.
   */
  async getProvider(id: string): Promise<SSOProvider | null> {
    try {
      const provider = await db.sSOConfiguration.findUnique({
        where: { id },
      })

      if (!provider) return null

      return this.toPublicProvider(provider)
    } catch (err) {
      log.error({ err, id }, 'Failed to fetch SSO provider')
      return null
    }
  }

  /**
   * Get a full provider configuration including secrets (for internal use only).
   */
  async getProviderWithSecrets(id: string): Promise<Record<string, unknown> | null> {
    try {
      const provider = await db.sSOConfiguration.findUnique({
        where: { id },
      })

      if (!provider) return null

      return {
        id: provider.id,
        name: provider.name,
        provider: provider.provider,
        enabled: provider.enabled,
        type: this.getProviderType(provider.provider),
        samlEntryPoint: provider.samlEntryPoint,
        samlCertificate: provider.samlCertificate,
        samlIssuer: provider.samlIssuer,
        oidcDiscoveryUrl: provider.oidcDiscoveryUrl,
        oidcClientId: provider.oidcClientId,
        oidcClientSecret: provider.oidcClientSecret,
        allowedDomains: provider.allowedDomains ? JSON.parse(provider.allowedDomains) : [],
        autoProvision: provider.autoProvision,
        defaultRole: provider.defaultRole,
        metadata: provider.metadata ? JSON.parse(provider.metadata) : {},
      }
    } catch (err) {
      log.error({ err, id }, 'Failed to fetch SSO provider with secrets')
      return null
    }
  }

  /**
   * Create a new SSO provider configuration.
   */
  async createProvider(data: CreateSSOProviderData): Promise<SSOProvider> {
    try {
      const provider = await db.sSOConfiguration.create({
        data: {
          name: data.name,
          provider: data.provider,
          enabled: data.enabled ?? false,
          samlEntryPoint: data.samlEntryPoint,
          samlCertificate: data.samlCertificate,
          samlIssuer: data.samlIssuer,
          oidcDiscoveryUrl: data.oidcDiscoveryUrl,
          oidcClientId: data.oidcClientId,
          oidcClientSecret: data.oidcClientSecret,
          allowedDomains: data.allowedDomains ? JSON.stringify(data.allowedDomains) : null,
          autoProvision: data.autoProvision ?? true,
          defaultRole: data.defaultRole ?? 'USER',
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        },
      })

      log.info({ id: provider.id, name: provider.name, type: data.type }, 'SSO provider created')

      return this.toPublicProvider(provider)
    } catch (err) {
      log.error({ err, name: data.name }, 'Failed to create SSO provider')
      throw new Error('Failed to create SSO provider')
    }
  }

  /**
   * Update an existing SSO provider.
   */
  async updateProvider(id: string, data: UpdateSSOProviderData): Promise<SSOProvider> {
    try {
      const existing = await db.sSOConfiguration.findUnique({ where: { id } })
      if (!existing) {
        throw new Error('Provider not found')
      }

      const updateData: Record<string, unknown> = {}

      if (data.name !== undefined) updateData.name = data.name
      if (data.enabled !== undefined) updateData.enabled = data.enabled
      if (data.samlEntryPoint !== undefined) updateData.samlEntryPoint = data.samlEntryPoint
      if (data.samlCertificate !== undefined) updateData.samlCertificate = data.samlCertificate
      if (data.samlIssuer !== undefined) updateData.samlIssuer = data.samlIssuer
      if (data.oidcDiscoveryUrl !== undefined) updateData.oidcDiscoveryUrl = data.oidcDiscoveryUrl
      if (data.oidcClientId !== undefined) updateData.oidcClientId = data.oidcClientId
      if (data.oidcClientSecret !== undefined) updateData.oidcClientSecret = data.oidcClientSecret
      if (data.allowedDomains !== undefined) updateData.allowedDomains = JSON.stringify(data.allowedDomains)
      if (data.autoProvision !== undefined) updateData.autoProvision = data.autoProvision
      if (data.defaultRole !== undefined) updateData.defaultRole = data.defaultRole
      if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata)

      const provider = await db.sSOConfiguration.update({
        where: { id },
        data: updateData,
      })

      log.info({ id, name: provider.name }, 'SSO provider updated')

      return this.toPublicProvider(provider)
    } catch (err) {
      log.error({ err, id }, 'Failed to update SSO provider')
      throw err
    }
  }

  /**
   * Delete an SSO provider.
   */
  async deleteProvider(id: string): Promise<void> {
    try {
      const existing = await db.sSOConfiguration.findUnique({ where: { id } })
      if (!existing) {
        throw new Error('Provider not found')
      }

      await db.sSOConfiguration.delete({ where: { id } })
      log.info({ id, name: existing.name }, 'SSO provider deleted')
    } catch (err) {
      log.error({ err, id }, 'Failed to delete SSO provider')
      throw err
    }
  }

  /**
   * Validate a SAML assertion or OIDC token.
   * Returns user info extracted from the assertion/token.
   *
   * Note: Full SAML/OIDC validation requires external libraries
   * (like @boxyhq/saml-jackson or openid-client) in production.
   * This implementation provides the structure and graceful fallback.
   */
  async validateAssertion(
    providerId: string,
    assertion: string
  ): Promise<{ email: string; name: string; groups?: string[] } | null> {
    try {
      const providerConfig = await this.getProviderWithSecrets(providerId)
      if (!providerConfig) {
        log.error({ providerId }, 'Provider not found for assertion validation')
        return null
      }

      if (!providerConfig.enabled) {
        log.error({ providerId }, 'Provider is disabled')
        return null
      }

      const providerType = providerConfig.type as string

      if (providerType === 'saml') {
        // SAML assertion validation
        // In production, use @boxyhq/saml-jackson or similar library
        log.info({ providerId }, 'SAML assertion validation requested (stub)')
        return {
          email: 'sso-user@example.com',
          name: 'SSO User',
          groups: [],
        }
      }

      if (providerType === 'oidc') {
        // OIDC token validation
        // In production, use openid-client or jose library
        log.info({ providerId }, 'OIDC token validation requested (stub)')
        return {
          email: 'oidc-user@example.com',
          name: 'OIDC User',
          groups: [],
        }
      }

      log.error({ providerId, type: providerType }, 'Unknown provider type')
      return null
    } catch (err) {
      log.error({ err, providerId }, 'Failed to validate SSO assertion')
      return null
    }
  }

  /**
   * Check if an email domain is allowed for any configured SSO provider.
   */
  async isDomainAllowed(email: string): Promise<boolean> {
    try {
      const domain = email.split('@')[1]
      if (!domain) return false

      const providers = await db.sSOConfiguration.findMany({
        where: { enabled: true },
      })

      // If no providers have domain restrictions, allow all
      const hasAnyDomainRestriction = providers.some((p) => p.allowedDomains)

      if (!hasAnyDomainRestriction) {
        return true
      }

      // Check if any enabled provider allows this domain
      for (const provider of providers) {
        if (!provider.allowedDomains) continue
        try {
          const domains: string[] = JSON.parse(provider.allowedDomains)
          if (domains.includes(domain)) {
            return true
          }
        } catch {
          // Skip invalid JSON
        }
      }

      return false
    } catch (err) {
      log.error({ err, email }, 'Failed to check domain allowance')
      return false
    }
  }

  /**
   * Initiate SSO login by returning a redirect URL for the IdP.
   */
  async initiateLogin(providerId: string, callbackUrl: string): Promise<string> {
    try {
      const providerConfig = await this.getProviderWithSecrets(providerId)
      if (!providerConfig) {
        throw new Error('Provider not found')
      }

      if (!providerConfig.enabled) {
        throw new Error('Provider is disabled')
      }

      const providerType = providerConfig.type as string

      if (providerType === 'saml' && providerConfig.samlEntryPoint) {
        // For SAML, redirect to the IdP's SSO URL
        // In production, construct a proper SAML AuthnRequest
        const samlUrl = new URL(providerConfig.samlEntryPoint as string)
        samlUrl.searchParams.set('SAMLRequest', btoa(callbackUrl))
        samlUrl.searchParams.set('RelayState', callbackUrl)
        return samlUrl.toString()
      }

      if (providerType === 'oidc' && providerConfig.oidcDiscoveryUrl) {
        // For OIDC, construct the authorization URL
        // In production, use the discovery document to get the authorization_endpoint
        const oidcUrl = new URL(providerConfig.oidcDiscoveryUrl as string)
        // Replace .well-known path with authorization endpoint
        const authUrl = oidcUrl.origin + '/authorize'
        const params = new URLSearchParams({
          client_id: (providerConfig.oidcClientId as string) || '',
          redirect_uri: callbackUrl,
          response_type: 'code',
          scope: 'openid email profile',
          state: btoa(JSON.stringify({ providerId, callbackUrl })),
        })
        return `${authUrl}?${params.toString()}`
      }

      throw new Error('Provider configuration is incomplete')
    } catch (err) {
      log.error({ err, providerId }, 'Failed to initiate SSO login')
      throw err
    }
  }

  // ─── Private Helpers ───────────────────────────

  /**
   * Convert a DB record to a public SSOProvider (masking secrets).
   */
  private toPublicProvider(p: {
    id: string
    name: string
    provider: string
    enabled: boolean
    samlEntryPoint: string | null
    samlCertificate: string | null
    samlIssuer: string | null
    oidcDiscoveryUrl: string | null
    oidcClientId: string | null
    oidcClientSecret: string | null
    allowedDomains: string | null
    autoProvision: boolean
    defaultRole: string
    metadata: string | null
  }): SSOProvider {
    return {
      id: p.id,
      name: p.name,
      type: this.getProviderType(p.provider),
      enabled: p.enabled,
      provider: p.provider,
      config: {
        samlEntryPoint: p.samlEntryPoint,
        hasSamlCertificate: !!p.samlCertificate,
        samlIssuer: p.samlIssuer,
        oidcDiscoveryUrl: p.oidcDiscoveryUrl,
        oidcClientId: p.oidcClientId,
        hasOidcClientSecret: !!p.oidcClientSecret,
        ...(p.metadata ? (() => { try { return JSON.parse(p.metadata) } catch { return {} } })() : {}),
      },
      allowedDomains: p.allowedDomains ? (() => { try { return JSON.parse(p.allowedDomains) } catch { return [] } })() : [],
      autoProvision: p.autoProvision,
      defaultRole: p.defaultRole,
    }
  }

  /**
   * Determine the provider type from the provider string.
   */
  private getProviderType(provider: string): 'saml' | 'oidc' {
    if (provider === 'saml' || provider === 'okta') return 'saml'
    return 'oidc' // oidc, azure-ad, google-workspace all use OIDC
  }
}

// ─── Singleton Instance ───────────────────────────

export const ssoProviderManager = new SSOProviderManager()

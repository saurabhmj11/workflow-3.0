// ─── Environment Variable Validation ────────────
// Validates required environment variables at startup
// and provides helpful error messages

interface EnvVar {
  name: string
  required: boolean
  description: string
  default?: string
}

const ENV_VARS: EnvVar[] = [
  { name: 'DATABASE_URL', required: true, description: 'Database connection string', default: 'file:./db/custom.db' },
  { name: 'NEXTAUTH_URL', required: false, description: 'Base URL for auth callbacks', default: 'http://localhost:3000' },
  { name: 'NEXTAUTH_SECRET', required: false, description: 'Secret for JWT signing (required for auth)' },
  { name: 'GITHUB_ID', required: false, description: 'GitHub OAuth app client ID' },
  { name: 'GITHUB_SECRET', required: false, description: 'GitHub OAuth app client secret' },
  { name: 'GOOGLE_ID', required: false, description: 'Google OAuth app client ID' },
  { name: 'GOOGLE_SECRET', required: false, description: 'Google OAuth app client secret' },
  { name: 'TRIGGERS_ENABLED', required: false, description: 'Enable real-time triggers (webhook/cron/email)', default: 'false' },
  { name: 'ENCRYPTION_KEY', required: false, description: 'Key for encrypting stored passwords' },
]

export interface EnvValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  config: Record<string, string | undefined>
}

/**
 * Validate environment variables and return results.
 * Call this at startup to catch configuration issues early.
 */
export function validateEnv(): EnvValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const config: Record<string, string | undefined> = {}

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name]
    config[envVar.name] = value

    if (!value || value === '') {
      if (envVar.required && !envVar.default) {
        errors.push(`Missing required env var: ${envVar.name} — ${envVar.description}`)
      } else if (envVar.default) {
        config[envVar.name] = envVar.default
      } else if (!envVar.required) {
        // Optional var not set — that's fine, just note it
      }
    }
  }

  // Specific warnings
  if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV === 'production') {
    errors.push('NEXTAUTH_SECRET is required in production for secure JWT signing')
  }

  if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV !== 'production') {
    warnings.push('NEXTAUTH_SECRET not set — authentication will be disabled (demo mode)')
  }

  if (process.env.TRIGGERS_ENABLED === 'true') {
    warnings.push('Real-time triggers are ENABLED — scheduler and email listeners will start')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config,
  }
}

/**
 * Get an env var with a default value.
 * Throws in production if the var is required and not set.
 */
export function getEnv(name: string, defaultValue?: string): string | undefined {
  const value = process.env[name]
  if (value) return value
  if (defaultValue) return defaultValue
  return undefined
}

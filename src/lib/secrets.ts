// ─── Secret Manager ─────────────────────────────
// Encrypted credential storage for workflow configurations.
// Secrets are referenced in workflows as {{secret.MY_API_KEY}}
// and resolved at execution time — never exposed in workflow definitions.

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'
import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'

const log = createLogger('Secrets')

// ─── Encryption Helpers ──────────────────────────

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32

function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || ''
  if (!raw || raw.length < 16) {
    log.warn('ENCRYPTION_KEY is not set or too short — secrets are insecure!')
  }
  // Derive a 32-byte key from the configured secret using SHA-256
  return createHash('sha256').update(raw).digest()
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: iv:tag:ciphertext (all base64)
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptSecret(ciphertext: string): string {
  const key = getEncryptionKey()
  const parts = ciphertext.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format')
  }
  const iv = Buffer.from(parts[0], 'base64')
  const tag = Buffer.from(parts[1], 'base64')
  const encrypted = Buffer.from(parts[2], 'base64')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

// ─── Secret CRUD ─────────────────────────────────

export interface SecretDefinition {
  id: string
  name: string
  key: string
  description?: string | null
  category: string
  userId?: string | null
  isGlobal: boolean
  lastUsedAt?: Date | null
  usageCount: number
  expiresAt?: Date | null
  tags?: string[] | null
  createdAt: Date
  updatedAt: Date
  // NOTE: value is never returned in listings — only during explicit resolution
}

export async function createSecret(data: {
  name: string
  key: string
  value: string
  description?: string
  category?: string
  userId?: string
  isGlobal?: boolean
  expiresAt?: Date
  tags?: string[]
}): Promise<SecretDefinition> {
  const encrypted = encryptSecret(data.value)
  const secret = await db.secret.create({
    data: {
      name: data.name,
      key: data.key.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
      value: encrypted,
      description: data.description,
      category: data.category ?? 'api_key',
      userId: data.userId,
      isGlobal: data.isGlobal ?? false,
      expiresAt: data.expiresAt,
      tags: data.tags ? JSON.stringify(data.tags) : null,
    },
  })
  return formatSecret(secret)
}

export async function updateSecret(
  id: string,
  data: {
    name?: string
    value?: string
    description?: string
    category?: string
    expiresAt?: Date | null
    tags?: string[]
  },
  userId?: string
): Promise<SecretDefinition> {
  const existing = await db.secret.findFirst({
    where: { id, ...(userId ? { OR: [{ userId }, { isGlobal: true }] } : {}) },
  })
  if (!existing) throw new Error('Secret not found')

  const updateData: Record<string, unknown> = {
    name: data.name ?? existing.name,
    description: data.description ?? existing.description,
    category: data.category ?? existing.category,
    expiresAt: data.expiresAt !== undefined ? data.expiresAt : existing.expiresAt,
    tags: data.tags ? JSON.stringify(data.tags) : existing.tags,
  }

  if (data.value) {
    updateData.value = encryptSecret(data.value)
  }

  const secret = await db.secret.update({
    where: { id },
    data: updateData as Parameters<typeof db.secret.update>[0]['data'],
  })
  return formatSecret(secret)
}

export async function deleteSecret(id: string, userId?: string): Promise<void> {
  const secret = await db.secret.findFirst({
    where: { id, ...(userId ? { userId } : {}) },
  })
  if (!secret) throw new Error('Secret not found')
  await db.secret.delete({ where: { id } })
}

export async function listSecrets(userId?: string): Promise<SecretDefinition[]> {
  const where = userId
    ? { OR: [{ userId }, { isGlobal: true }] }
    : { isGlobal: true }

  const secrets = await db.secret.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  return secrets.map(formatSecret)
}

// ─── Secret Resolution (used at execution time) ──

/** Resolve all {{secret.KEY_NAME}} variables in a config object */
export async function resolveSecretVariables(
  config: Record<string, unknown>,
  userId?: string
): Promise<Record<string, unknown>> {
  const str = JSON.stringify(config)
  const matches = str.match(/\{\{secret\.([A-Z0-9_]+)\}\}/g)
  if (!matches || matches.length === 0) return config

  const keys = matches.map((m) => m.replace('{{secret.', '').replace('}}', ''))
  const uniqueKeys = [...new Set(keys)]

  // Load only the secrets we need
  const where = userId
    ? {
        key: { in: uniqueKeys },
        OR: [{ userId }, { isGlobal: true }],
      }
    : { key: { in: uniqueKeys }, isGlobal: true }

  const secrets = await db.secret.findMany({ where })

  // Build resolution map
  const resolved: Record<string, string> = {}
  for (const secret of secrets) {
    try {
      resolved[secret.key] = decryptSecret(secret.value)
    } catch (err) {
      log.error({ err, secretId: secret.id }, 'Failed to decrypt secret')
    }
  }

  // Update usage stats for resolved secrets
  const resolvedIds = secrets.map((s) => s.id)
  if (resolvedIds.length > 0) {
    await db.secret.updateMany({
      where: { id: { in: resolvedIds } },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    })
  }

  // Replace all occurrences in the JSON string
  let result = str
  for (const [key, value] of Object.entries(resolved)) {
    result = result.replaceAll(`{{secret.${key}}}`, value)
  }

  try {
    return JSON.parse(result) as Record<string, unknown>
  } catch {
    return config
  }
}

// ─── Format helper ────────────────────────────────

function formatSecret(secret: {
  id: string
  name: string
  key: string
  description?: string | null
  category: string
  userId?: string | null
  isGlobal: boolean
  lastUsedAt?: Date | null
  usageCount: number
  expiresAt?: Date | null
  tags?: string | null
  createdAt: Date
  updatedAt: Date
}): SecretDefinition {
  return {
    id: secret.id,
    name: secret.name,
    key: secret.key,
    description: secret.description,
    category: secret.category,
    userId: secret.userId,
    isGlobal: secret.isGlobal,
    lastUsedAt: secret.lastUsedAt,
    usageCount: secret.usageCount,
    expiresAt: secret.expiresAt,
    tags: secret.tags ? (JSON.parse(secret.tags) as string[]) : null,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt,
  }
}

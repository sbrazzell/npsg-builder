// ─── Field-level AES-256-GCM encryption ──────────────────────────────────────
// Encrypts sensitive DB columns (EIN, law-enforcement findings, threat notes,
// snapshot JSON).  Key lives in FIELD_ENCRYPTION_KEY (64 hex chars = 32 bytes).
//
// Wire format:  enc:<iv_b64>:<authTag_b64>:<ciphertext_b64>
// Values without the "enc:" prefix are treated as plaintext (migration safety).
//
// SETUP: generate a key with:   openssl rand -hex 32
// Add to .env:  FIELD_ENCRYPTION_KEY="<64 hex chars>"

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const PREFIX    = 'enc:'

function getKey(): Buffer | null {
  const raw = process.env.FIELD_ENCRYPTION_KEY
  if (!raw) return null
  if (raw.length !== 64) {
    console.warn('[encryption] FIELD_ENCRYPTION_KEY must be 64 hex chars (32 bytes). Encryption disabled.')
    return null
  }
  return Buffer.from(raw, 'hex')
}

/**
 * Encrypt a plaintext string.
 * Returns the original value unchanged if FIELD_ENCRYPTION_KEY is not set,
 * so existing deployments keep working while the key is being rolled out.
 */
export function encrypt(value: string): string {
  const key = getKey()
  if (!key) return value                   // no-op — key not configured
  if (value.startsWith(PREFIX)) return value // already encrypted

  const iv         = randomBytes(12)        // 96-bit IV recommended for GCM
  const cipher     = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const authTag    = cipher.getAuthTag()

  return `${PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`
}

/**
 * Decrypt a value produced by encrypt().
 * Values without the "enc:" prefix are returned as-is (plaintext migration path).
 * Throws on tampered ciphertext (GCM auth tag mismatch).
 */
export function decrypt(value: string): string {
  if (!value.startsWith(PREFIX)) return value  // legacy plaintext — return as-is

  const key = getKey()
  if (!key) {
    console.error('[encryption] Encrypted value found but FIELD_ENCRYPTION_KEY is not set. Cannot decrypt.')
    return value                               // return raw enc: string rather than crash
  }

  const parts = value.slice(PREFIX.length).split(':')
  if (parts.length !== 3) throw new Error('[encryption] Malformed encrypted value')

  const [ivB64, authTagB64, ciphertextB64] = parts
  const iv         = Buffer.from(ivB64,         'base64')
  const authTag    = Buffer.from(authTagB64,     'base64')
  const ciphertext = Buffer.from(ciphertextB64,  'base64')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

/** Encrypt if not null/undefined. */
export function encryptNullable(value: string | null | undefined): string | null | undefined {
  if (value == null) return value
  return encrypt(value)
}

/** Decrypt if not null/undefined. */
export function decryptNullable(value: string | null | undefined): string | null | undefined {
  if (value == null) return value
  return decrypt(value)
}

import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { encrypt, decrypt } from '@/lib/encryption'

// ─── Fields that are encrypted at rest ───────────────────────────────────────
// Any field listed here is transparently encrypted on write and decrypted on
// read via Prisma middleware below.  The encryption is a no-op when
// FIELD_ENCRYPTION_KEY is not set so development works without a key.

const ENCRYPTED_FIELDS: Record<string, string[]> = {
  Organization:     ['einOrTaxId'],
  Site:             ['lawEnforcementFindings'],
  ThreatAssessment: ['vulnerabilityNotes', 'incidentHistory'],
  ApplicationDraft: ['snapshotJson'],
}

const WRITE_ACTIONS = new Set([
  'create', 'createMany', 'update', 'updateMany', 'upsert',
])

const READ_ACTIONS = new Set([
  'findFirst', 'findUnique', 'findMany', 'findUniqueOrThrow', 'findFirstOrThrow',
])

function encryptRecord(data: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    if (typeof data[field] === 'string') {
      data[field] = encrypt(data[field] as string)
    }
  }
}

function decryptRecord(record: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    if (typeof record[field] === 'string') {
      record[field] = decrypt(record[field] as string)
    }
  }
}

// ─── Prisma client factory ────────────────────────────────────────────────────

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const adapter = new PrismaLibSql({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  const client = new PrismaClient({ adapter })

  // Transparent field-level encryption middleware
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(client as any).$use(async (params: any, next: any) => {
    const fields = params.model ? (ENCRYPTED_FIELDS[params.model] ?? []) : []

    // ── Encrypt on write ──────────────────────────────────────────────────
    if (fields.length > 0 && WRITE_ACTIONS.has(params.action)) {
      const data = params.args?.data
      if (data && typeof data === 'object') {
        encryptRecord(data as Record<string, unknown>, fields)
      }
    }

    const result = await next(params)

    // ── Decrypt on read ───────────────────────────────────────────────────
    if (fields.length > 0 && READ_ACTIONS.has(params.action)) {
      if (Array.isArray(result)) {
        for (const row of result) {
          if (row && typeof row === 'object') decryptRecord(row, fields)
        }
      } else if (result && typeof result === 'object') {
        decryptRecord(result as Record<string, unknown>, fields)
      }
    }

    return result
  })

  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

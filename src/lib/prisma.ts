import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { encrypt, decrypt } from '@/lib/encryption'

// ─── Fields that are encrypted at rest ───────────────────────────────────────
// Any field listed here is transparently encrypted on write and decrypted on
// read via a Prisma $extends query extension.  The encryption is a no-op when
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

function createPrismaClient() {
  const adapter = new PrismaLibSql({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  const base = new PrismaClient({ adapter })

  // Transparent field-level encryption via Prisma 5 $extends (replaces deprecated $use)
  return base.$extends({
    query: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async $allOperations({ model, operation, args, query }: any) {
          const fields: string[] = model ? (ENCRYPTED_FIELDS[model] ?? []) : []

          // ── Encrypt on write ────────────────────────────────────────────────
          if (fields.length > 0 && WRITE_ACTIONS.has(operation)) {
            const data = (args as Record<string, unknown>)?.data
            if (data && typeof data === 'object') {
              encryptRecord(data as Record<string, unknown>, fields)
            }
          }

          const result = await query(args)

          // ── Decrypt on read ─────────────────────────────────────────────────
          if (fields.length > 0 && READ_ACTIONS.has(operation)) {
            if (Array.isArray(result)) {
              for (const row of result) {
                if (row && typeof row === 'object') decryptRecord(row as Record<string, unknown>, fields)
              }
            } else if (result && typeof result === 'object') {
              decryptRecord(result as Record<string, unknown>, fields)
            }
          }

          return result
        },
      },
    },
  })
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

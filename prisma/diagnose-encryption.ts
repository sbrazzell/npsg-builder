/**
 * diagnose-encryption.ts
 *
 * Scans encrypted fields in the DB to find records that have an "enc:" prefix
 * but fail decryption with the current FIELD_ENCRYPTION_KEY.
 *
 * Run:
 *   node --env-file=.env -e "
 *   require('ts-node').register({
 *     transpileOnly: true,
 *     compilerOptions: { module: 'CommonJS', moduleResolution: 'node', target: 'ES2020' }
 *   });
 *   require('./prisma/diagnose-encryption.ts');
 *   "
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createDecipheriv } from 'crypto'

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})
const prisma = new PrismaClient({ adapter })

const PREFIX = 'enc:'

function getKey(): Buffer | null {
  const raw = process.env.FIELD_ENCRYPTION_KEY
  if (!raw) return null
  if (raw.length !== 64) return null
  return Buffer.from(raw, 'hex')
}

function tryDecrypt(value: string): { ok: boolean; error?: string } {
  if (!value.startsWith(PREFIX)) return { ok: true } // plaintext, fine

  const key = getKey()
  if (!key) return { ok: false, error: 'FIELD_ENCRYPTION_KEY not set or wrong length' }

  try {
    const parts = value.slice(PREFIX.length).split(':')
    if (parts.length !== 3) return { ok: false, error: 'Malformed: expected 3 colon-separated parts' }

    const [ivB64, authTagB64, ciphertextB64] = parts
    const iv = Buffer.from(ivB64, 'base64')
    const authTag = Buffer.from(authTagB64, 'base64')
    const ciphertext = Buffer.from(ciphertextB64, 'base64')

    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return { ok: true }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

function preview(val: string): string {
  return val.length > 80 ? val.slice(0, 80) + '…' : val
}

async function main() {
  const key = getKey()
  console.log('\n═══════════════════════════════════════════')
  console.log('  Encryption Diagnostic')
  console.log('═══════════════════════════════════════════')
  console.log(`  FIELD_ENCRYPTION_KEY: ${key ? `set (${key.length} bytes)` : 'NOT SET'}`)
  console.log()

  let totalIssues = 0

  // ── Organization.einOrTaxId ───────────────────────────────────────────────
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true, einOrTaxId: true } })
  console.log(`Organization (${orgs.length} records) — checking einOrTaxId`)
  for (const org of orgs) {
    if (org.einOrTaxId) {
      const result = tryDecrypt(org.einOrTaxId)
      if (!result.ok) {
        totalIssues++
        console.log(`  ❌ id=${org.id} name="${org.name}"`)
        console.log(`     einOrTaxId value: ${preview(org.einOrTaxId)}`)
        console.log(`     Error: ${result.error}`)
      } else {
        const prefix = org.einOrTaxId.startsWith(PREFIX) ? '🔒 encrypted' : '📄 plaintext'
        console.log(`  ✅ id=${org.id} name="${org.name}" — ${prefix}`)
      }
    } else {
      console.log(`  ⚪ id=${org.id} name="${org.name}" — einOrTaxId is null/empty`)
    }
  }
  console.log()

  // ── Site.lawEnforcementFindings ───────────────────────────────────────────
  const sites = await prisma.site.findMany({ select: { id: true, siteName: true, lawEnforcementFindings: true } })
  console.log(`Site (${sites.length} records) — checking lawEnforcementFindings`)
  for (const site of sites) {
    if (site.lawEnforcementFindings) {
      const result = tryDecrypt(site.lawEnforcementFindings)
      if (!result.ok) {
        totalIssues++
        console.log(`  ❌ id=${site.id} name="${site.siteName}"`)
        console.log(`     lawEnforcementFindings: ${preview(site.lawEnforcementFindings)}`)
        console.log(`     Error: ${result.error}`)
      } else {
        const prefix = site.lawEnforcementFindings.startsWith(PREFIX) ? '🔒 encrypted' : '📄 plaintext'
        console.log(`  ✅ id=${site.id} name="${site.siteName}" — ${prefix}`)
      }
    } else {
      console.log(`  ⚪ id=${site.id} name="${site.siteName}" — lawEnforcementFindings is null/empty`)
    }
  }
  console.log()

  // ── ThreatAssessment encrypted fields ────────────────────────────────────
  const threats = await prisma.threatAssessment.findMany({
    select: { id: true, threatType: true, vulnerabilityNotes: true, incidentHistory: true },
  })
  console.log(`ThreatAssessment (${threats.length} records) — checking vulnerabilityNotes, incidentHistory`)
  let threatIssues = 0
  for (const t of threats) {
    for (const field of ['vulnerabilityNotes', 'incidentHistory'] as const) {
      const val = t[field]
      if (val) {
        const result = tryDecrypt(val)
        if (!result.ok) {
          threatIssues++
          totalIssues++
          console.log(`  ❌ id=${t.id} field=${field}`)
          console.log(`     value: ${preview(val)}`)
          console.log(`     Error: ${result.error}`)
        }
      }
    }
  }
  if (threatIssues === 0) console.log('  ✅ All ThreatAssessment records OK')
  console.log()

  // ── ApplicationDraft.snapshotJson ─────────────────────────────────────────
  const drafts = await prisma.applicationDraft.findMany({ select: { id: true, title: true, snapshotJson: true } })
  console.log(`ApplicationDraft (${drafts.length} records) — checking snapshotJson`)
  let draftIssues = 0
  for (const d of drafts) {
    if (d.snapshotJson) {
      const result = tryDecrypt(d.snapshotJson)
      if (!result.ok) {
        draftIssues++
        totalIssues++
        console.log(`  ❌ id=${d.id} title="${d.title}"`)
        console.log(`     snapshotJson starts with: ${preview(d.snapshotJson)}`)
        console.log(`     Error: ${result.error}`)
      } else {
        const prefix = d.snapshotJson.startsWith(PREFIX) ? '🔒 encrypted' : '📄 plaintext'
        console.log(`  ✅ id=${d.id} title="${d.title}" — ${prefix}`)
      }
    }
  }
  if (draftIssues === 0 && drafts.length === 0) console.log('  ⚪ No drafts found')
  console.log()

  console.log('═══════════════════════════════════════════')
  if (totalIssues === 0) {
    console.log('  ✅ No broken encrypted records found.')
    console.log('  The error may be intermittent or env-related.')
  } else {
    console.log(`  ❌ ${totalIssues} broken record(s) found.`)
    console.log('  Fix: either restore the correct FIELD_ENCRYPTION_KEY,')
    console.log('  or null out the broken fields (losing that data).')
  }
  console.log('═══════════════════════════════════════════\n')
}

main().catch(console.error).finally(() => prisma.$disconnect())

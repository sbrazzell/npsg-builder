'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// ── Admin guard ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await requireAuth()
  const email = session.user?.email?.toLowerCase() ?? ''
  const record = await prisma.allowedUser.findUnique({ where: { email } })
  if (record?.role !== 'admin') {
    throw new Error('Admin access required to manage team members.')
  }
  return session
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function listAllowedUsers() {
  await requireAuth()
  const users = await prisma.allowedUser.findMany({
    orderBy: [{ role: 'asc' }, { addedAt: 'asc' }],
  })
  return users
}

// ── Mutations ─────────────────────────────────────────────────────────────────

const addUserSchema = z.object({
  email: z.string().email('Must be a valid email address').toLowerCase(),
  role:  z.enum(['admin', 'member']).default('member'),
})

export async function addAllowedUser(input: { email: string; role?: string }) {
  const adminSession = await requireAdmin()
  const adminEmail   = adminSession.user?.email?.toLowerCase() ?? ''

  const parsed = addUserSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const existing = await prisma.allowedUser.findUnique({ where: { email: parsed.data.email } })
  if (existing) {
    return { success: false, error: 'That email is already in the list.' }
  }

  const user = await prisma.allowedUser.create({
    data: {
      email:   parsed.data.email,
      role:    parsed.data.role,
      addedBy: adminEmail,
    },
  })

  revalidatePath('/settings')
  return { success: true, data: user }
}

export async function removeAllowedUser(id: string) {
  const adminSession = await requireAdmin()
  const adminEmail   = adminSession.user?.email?.toLowerCase() ?? ''

  // Prevent removing yourself
  const target = await prisma.allowedUser.findUnique({ where: { id } })
  if (!target) return { success: false, error: 'User not found.' }
  if (target.email === adminEmail) {
    return { success: false, error: 'You cannot remove yourself from the list.' }
  }

  // Prevent removing the last admin
  if (target.role === 'admin') {
    const adminCount = await prisma.allowedUser.count({ where: { role: 'admin' } })
    if (adminCount <= 1) {
      return { success: false, error: 'Cannot remove the last admin. Promote another user first.' }
    }
  }

  await prisma.allowedUser.delete({ where: { id } })
  revalidatePath('/settings')
  return { success: true }
}

export async function updateUserRole(id: string, role: 'admin' | 'member') {
  const adminSession = await requireAdmin()
  const adminEmail   = adminSession.user?.email?.toLowerCase() ?? ''

  const target = await prisma.allowedUser.findUnique({ where: { id } })
  if (!target) return { success: false, error: 'User not found.' }

  // Prevent demoting yourself if you're the last admin
  if (target.email === adminEmail && role === 'member') {
    const adminCount = await prisma.allowedUser.count({ where: { role: 'admin' } })
    if (adminCount <= 1) {
      return { success: false, error: 'Cannot demote yourself — you are the last admin.' }
    }
  }

  const updated = await prisma.allowedUser.update({ where: { id }, data: { role } })
  revalidatePath('/settings')
  return { success: true, data: updated }
}

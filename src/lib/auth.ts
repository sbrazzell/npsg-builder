import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'

// ── Seed logic ───────────────────────────────────────────────────────────────
// If the AllowedUser table is empty AND ALLOWED_EMAILS is set, seed the listed
// emails as admins.  This runs once on the first sign-in after deployment.
// After seeding, ALLOWED_EMAILS is ignored — manage users via the Settings UI.

async function seedFromEnvIfNeeded() {
  const count = await prisma.allowedUser.count()
  if (count > 0) return  // table already has entries — env var no longer used

  const envEmails = (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  if (envEmails.length === 0) return

  for (let i = 0; i < envEmails.length; i++) {
    await prisma.allowedUser.upsert({
      where:  { email: envEmails[i] },
      update: {},
      create: { id: `seed-${i}`, email: envEmails[i], role: 'admin', addedBy: 'env:ALLOWED_EMAILS' },
    })
  }
}

// ── NextAuth config ──────────────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user }) {
      const email = (user.email ?? '').toLowerCase()
      if (!email) return false

      // Ensure seed data exists (no-op after first call)
      await seedFromEnvIfNeeded()

      // Check DB allowlist
      const allowed = await prisma.allowedUser.findUnique({ where: { email } })
      return !!allowed
    },

    async session({ session, token }) {
      // Attach the user's role to the session so the UI can gate admin actions
      if (session.user?.email) {
        const record = await prisma.allowedUser.findUnique({
          where: { email: session.user.email.toLowerCase() },
          select: { role: true },
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(session.user as any).role = record?.role ?? 'member'
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

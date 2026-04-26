// ─── Server-side auth guard ───────────────────────────────────────────────────
// Call requireAuth() at the top of every server action and API route handler.
// Throws a typed error if the session is missing — the caller never reaches
// the DB.  Never use getServerSession() inline; always go through this helper.

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export class UnauthorizedError extends Error {
  readonly status = 401
  constructor() {
    super('Unauthorized — you must be signed in to perform this action.')
    this.name = 'UnauthorizedError'
  }
}

/**
 * Asserts the caller is authenticated.
 * Returns the session so callers can read session.user.email if needed.
 * Throws UnauthorizedError if not signed in.
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) throw new UnauthorizedError()
  return session
}
